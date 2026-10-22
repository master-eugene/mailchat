import Dexie, { type Table } from 'dexie';

// Everything here lives only on this device. The server keeps ciphertext only until this
// device acknowledges it. The service worker opens the same database, so a message that
// arrives by push lands in the chat even when the app is closed.
export type LocalUser = {
  id: string;
  username: string;
  address: string;
  publicKey: string;
  privateKey: string;
};

// Keys are pinned the first time we see them (trust on first use). A different key later
// is parked in pendingKey and nothing is decrypted with it until the user accepts it.
export type LocalContact = {
  address: string;
  publicKey: string;
  pendingKey?: string;
  firstSeenAt: number;
};

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed' | 'received';

export type LocalMessage = {
  id: string;
  ownerId: string;
  peer: string;
  direction: 'in' | 'out';
  body: string;
  sentAt: number;
  status: MessageStatus;
};

export type LocalChat = {
  key: string;
  ownerId: string;
  peer: string;
  lastBody: string;
  lastAt: number;
  lastOut?: boolean;
  unread: number;
};

export type PendingAck = { id: string; kind: 'message' | 'receipt' };

export type Setting = { key: string; value: string };

class MailChatLocalDb extends Dexie {
  currentUser!: Table<LocalUser, string>;
  contacts!: Table<LocalContact, string>;
  messages!: Table<LocalMessage, string>;
  chats!: Table<LocalChat, string>;
  pendingAcks!: Table<PendingAck, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('mailchat');
    this.version(1).stores({
      currentUser: 'id,email',
      chats: 'id,participantId,participantEmail,updatedAt',
      messages: 'id,chatId,senderId,recipientId,status,createdAt,[chatId+createdAt]',
    });
    this.version(2).stores({
      currentUser: 'id,email',
      chats: null,
      messages: null,
      contacts: 'email,userId',
      mail: 'id,[ownerId+folder+sentAt]',
    });
    // v3: chat over MailChat mailboxes. Earlier local data was from test builds and is dropped.
    this.version(3)
      .stores({
        currentUser: 'id,email',
        contacts: null,
        mail: null,
      })
      .upgrade(tx => tx.table('currentUser').clear());
    this.version(4).stores({
      currentUser: 'id,email',
      contacts: 'address',
      messages: 'id,[ownerId+peer+sentAt],[ownerId+status]',
      chats: 'key,[ownerId+lastAt]',
      pendingAcks: 'id',
      settings: 'key',
    });
  }
}

export const db = new MailChatLocalDb();

export const chatKey = (ownerId: string, peer: string) => `${ownerId}|${peer}`;

export const getSetting = async (key: string) => (await db.settings.get(key))?.value;

export const setSetting = async (key: string, value: string | null) => {
  if (value === null) await db.settings.delete(key);
  else await db.settings.put({ key, value });
};
