// Shared by the app and the service worker, so it uses only fetch and IndexedDB (no axios, no window).
import Dexie from 'dexie';

import { chatKey, db, getSetting, type LocalMessage } from '../db/indexedDb';
import { getCurrentUser } from '../db/userRepository';
import { decryptEnvelope, parseEnvelope } from './envelope';

export type ReceiveResult =
  | { status: 'saved' | 'duplicate'; message: LocalMessage }
  | { status: 'invalid' | 'no_account' | 'decrypt_failed' }
  | { status: 'wrong_account'; to: string }
  | { status: 'key_changed'; peer: string };

export const queueAck = (kind: 'message' | 'receipt', id: string) => db.pendingAcks.put({ id, kind });

// Decrypts a message from any path (push, live socket, sync, pasted block) and files it
// into the chat with its sender. Only messages that were really saved get acknowledged.
export const receiveEnvelope = async (encoded: string): Promise<ReceiveResult> => {
  const envelope = parseEnvelope(encoded);
  if (!envelope) return { status: 'invalid' };

  const user = await getCurrentUser();
  if (!user) return { status: 'no_account' };
  if (envelope.to !== user.address.toLowerCase()) return { status: 'wrong_account', to: envelope.to };

  const existing = await db.messages.get(envelope.id);
  if (existing) {
    await queueAck('message', envelope.id);
    return { status: 'duplicate', message: existing };
  }

  // Trust on first use: a new sender's key is pinned; a different key for a known sender
  // is parked until the user checks the fingerprint, and the message stays on the server.
  const contact = await db.contacts.get(envelope.from);
  if (!contact) {
    await db.contacts.put({ address: envelope.from, publicKey: envelope.k, firstSeenAt: Date.now() });
  } else if (contact.publicKey !== envelope.k) {
    await db.contacts.update(envelope.from, { pendingKey: envelope.k });
    return { status: 'key_changed', peer: envelope.from };
  }

  let content;
  try {
    content = await decryptEnvelope(envelope, envelope.k, user.privateKey);
  } catch {
    return { status: 'decrypt_failed' };
  }

  const message: LocalMessage = {
    id: envelope.id,
    ownerId: user.id,
    peer: envelope.from,
    direction: 'in',
    body: content.body,
    sentAt: Date.parse(content.sentAt) || Date.now(),
    status: 'received',
  };

  await db.transaction('rw', db.messages, db.chats, db.pendingAcks, async () => {
    await db.messages.put(message);
    await touchChat(user.id, message, true);
    await queueAck('message', envelope.id);
  });

  return { status: 'saved', message };
};

export const touchChat = async (ownerId: string, message: LocalMessage, incoming: boolean) => {
  const key = chatKey(ownerId, message.peer);
  const chat = await db.chats.get(key);
  const isLatest = !chat || message.sentAt >= chat.lastAt;

  await db.chats.put({
    key,
    ownerId,
    peer: message.peer,
    lastBody: isLatest ? message.body : chat.lastBody,
    lastAt: isLatest ? message.sentAt : chat.lastAt,
    lastOut: isLatest ? message.direction === 'out' : chat.lastOut,
    unread: (chat?.unread ?? 0) + (incoming ? 1 : 0),
  });
};

export const markDelivered = async (messageId: string) => {
  const message = await db.messages.get(messageId);
  if (message?.direction === 'out' && message.status !== 'delivered') {
    await db.messages.update(messageId, { status: 'delivered' });
  }
};

// Tells the server which messages and receipts this device has stored, so it deletes them.
// Failures are fine: the acks stay queued and go out with the next attempt.
export const flushAcks = async () => {
  const [pending, token, apiBase] = await Promise.all([
    db.pendingAcks.toArray(),
    getSetting('token'),
    getSetting('apiBase'),
  ]);
  if (!pending.length || !token || !apiBase) return;

  try {
    const response = await fetch(`${apiBase}/api/sync/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages: pending.filter(ack => ack.kind === 'message').map(ack => ack.id),
        receipts: pending.filter(ack => ack.kind === 'receipt').map(ack => ack.id),
      }),
    });
    if (response.ok) await db.pendingAcks.bulkDelete(pending.map(ack => ack.id));
  } catch {
    // Offline or server blocked: retry later.
  }
};

// Pulls anything a push or the live socket missed. Also safe to call from the service worker.
export const syncMailbox = async () => {
  const [token, apiBase] = await Promise.all([getSetting('token'), getSetting('apiBase')]);
  if (!token || !apiBase) return [];

  const response = await fetch(`${apiBase}/api/sync`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`sync_failed_${response.status}`);
  const data = (await response.json()) as { messages: string[]; receipts: { id: string; messageId: string }[] };

  const results: ReceiveResult[] = [];
  for (const encoded of data.messages) results.push(await receiveEnvelope(encoded));
  for (const receipt of data.receipts) {
    await markDelivered(receipt.messageId);
    await queueAck('receipt', receipt.id);
  }

  await flushAcks();
  return results;
};

// Deletes a message from this device only, and updates the chat preview to the newest one left.
export const removeMessage = async (ownerId: string, message: LocalMessage) => {
  await db.transaction('rw', db.messages, db.chats, async () => {
    await db.messages.delete(message.id);
    const newest = await db.messages
      .where('[ownerId+peer+sentAt]')
      .between([ownerId, message.peer, Dexie.minKey], [ownerId, message.peer, Dexie.maxKey])
      .last();
    await db.chats.update(chatKey(ownerId, message.peer), {
      lastBody: newest?.body ?? '',
      lastOut: newest ? newest.direction === 'out' : false,
      ...(newest && { lastAt: newest.sentAt }),
    });
  });
};
