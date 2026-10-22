import { postMessage } from '../api/messagesApi';
import { lookupUser, type PublicUser } from '../api/usersApi';
import { db, type LocalMessage, type LocalUser } from '../db/indexedDb';
import { armor, encodeEnvelope, encryptContent } from './envelope';
import { touchChat } from './receive';

// Keeps the ciphertext under the server's MAX_CIPHERTEXT_LENGTH and, for most messages,
// small enough to travel inside the push notification itself.
export const maxMessageLength = 4000;

export class KeyChangedError extends Error {
  constructor(public readonly peer: string) {
    super('key_changed');
  }
}

// Returns the recipient's pinned key, pinning it on first contact. A key that differs from
// the pinned one is never used silently.
export const resolveRecipient = async (query: string): Promise<PublicUser> => {
  const user = await lookupUser(query);
  const pinned = await db.contacts.get(user.address);

  if (!pinned) {
    await db.contacts.put({ address: user.address, publicKey: user.publicKey, firstSeenAt: Date.now() });
  } else if (pinned.publicKey !== user.publicKey) {
    await db.contacts.update(user.address, { pendingKey: user.publicKey });
    throw new KeyChangedError(user.address);
  }

  return user;
};

const encryptFor = async (me: LocalUser, peer: string, publicKey: string, id: string, body: string, sentAt: number) =>
  encryptContent(
    { v: 2, id, from: me.address, to: peer, body, sentAt: new Date(sentAt).toISOString() },
    publicKey,
    me.privateKey,
  );

const deliver = async (me: LocalUser, message: LocalMessage) => {
  const contact = await db.contacts.get(message.peer);
  if (!contact) throw new Error('unknown_contact');
  if (contact.pendingKey) throw new KeyChangedError(message.peer);

  const encrypted = await encryptFor(me, message.peer, contact.publicKey, message.id, message.body, message.sentAt);
  try {
    await postMessage({ id: message.id, to: message.peer, ...encrypted });
    await db.messages.update(message.id, { status: 'sent' });
  } catch (error) {
    await db.messages.update(message.id, { status: 'failed' });
    throw error;
  }
};

export const sendMessage = async (me: LocalUser, peer: string, body: string) => {
  const message: LocalMessage = {
    id: crypto.randomUUID(),
    ownerId: me.id,
    peer,
    direction: 'out',
    body,
    sentAt: Date.now(),
    status: 'sending',
  };

  await db.transaction('rw', db.messages, db.chats, async () => {
    await db.messages.put(message);
    await touchChat(me.id, message, false);
  });

  await deliver(me, message);
};

export const retryMessage = async (me: LocalUser, id: string) => {
  const message = await db.messages.get(id);
  if (!message || message.direction !== 'out' || message.status !== 'failed') return;

  await db.messages.update(id, { status: 'sending' });
  await deliver(me, { ...message, status: 'sending' });
};

// Offline path: the same encrypted envelope the server would email, as text the user can
// carry over any channel that still works (another mail app, a messenger, SMS).
export const exportMessage = async (me: LocalUser, peer: string, body: string) => {
  const contact = await db.contacts.get(peer);
  if (!contact || contact.pendingKey) throw new KeyChangedError(peer);

  const message: LocalMessage = {
    id: crypto.randomUUID(),
    ownerId: me.id,
    peer,
    direction: 'out',
    body,
    sentAt: Date.now(),
    status: 'sent',
  };
  const encrypted = await encryptFor(me, peer, contact.publicKey, message.id, body, message.sentAt);
  const encoded = encodeEnvelope({
    v: 2,
    id: message.id,
    from: me.address,
    to: peer,
    k: me.publicKey,
    n: encrypted.nonce,
    c: encrypted.ciphertext,
  });

  await db.transaction('rw', db.messages, db.chats, async () => {
    await db.messages.put(message);
    await touchChat(me.id, message, false);
  });

  return `${me.address} sent you an encrypted MailChat message. Paste it into MailChat › Open message.\n\n${armor(encoded)}`;
};

export const acceptNewKey = async (peer: string) => {
  const contact = await db.contacts.get(peer);
  if (contact?.pendingKey) {
    await db.contacts.update(peer, { publicKey: contact.pendingKey, pendingKey: undefined });
  }
};

// A send that was interrupted (app closed mid-request) is shown as failed so it can be retried.
export const failStaleSends = async (ownerId: string) => {
  const stale = await db.messages.where('[ownerId+status]').equals([ownerId, 'sending']).toArray();
  await Promise.all(stale.map(message => db.messages.update(message.id, { status: 'failed' })));
};
