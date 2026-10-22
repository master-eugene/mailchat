import { env, localUsername } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { encodeEnvelope, type Envelope } from '../mail/envelope.js';
import { pushEnvelope } from '../push/push.service.js';
import { emitToUser } from '../realtime/realtime.js';

const ttl = () => new Date(Date.now() + env.MAILBOX_TTL_DAYS * 24 * 60 * 60 * 1000);

// Called when a message arrives over SMTP. The ciphertext is kept only until the
// recipient's device acknowledges it; meanwhile it's offered live and by push.
export const deliverToMailbox = async (recipientId: string, envelope: Envelope) => {
  const encoded = encodeEnvelope(envelope);
  const existing = await prisma.mailboxMessage.findUnique({ where: { id: envelope.id } });
  if (existing) return;

  await prisma.mailboxMessage.create({
    data: { id: envelope.id, recipientId, envelope: encoded, expiresAt: ttl() },
  });

  emitToUser(recipientId, { type: 'message', envelope: encoded });
  await pushEnvelope(recipientId, envelope, encoded);
};

export const getSync = async (userId: string) => {
  const now = new Date();
  const [messages, receipts] = await Promise.all([
    prisma.mailboxMessage.findMany({
      where: { recipientId: userId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    prisma.deliveryReceipt.findMany({ where: { senderId: userId, expiresAt: { gt: now } }, take: 500 }),
  ]);

  return {
    messages: messages.map(message => message.envelope),
    receipts: receipts.map(receipt => ({
      id: receipt.id,
      messageId: receipt.messageId,
      deliveredAt: receipt.deliveredAt.toISOString(),
    })),
  };
};

const senderIdOf = async (encoded: string) => {
  try {
    const { from } = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { from: string };
    const username = localUsername(from);
    const sender = username ? await prisma.user.findUnique({ where: { username }, select: { id: true } }) : null;
    return sender?.id ?? null;
  } catch {
    return null;
  }
};

// The device confirms it has saved these messages (and seen these receipts), so the
// server deletes them. Each acknowledged message becomes a "delivered" tick for its sender.
export const acknowledge = async (userId: string, messageIds: string[], receiptIds: string[]) => {
  const delivered = await prisma.mailboxMessage.findMany({
    where: { recipientId: userId, id: { in: messageIds } },
  });

  await prisma.mailboxMessage.deleteMany({ where: { recipientId: userId, id: { in: messageIds } } });
  await prisma.deliveryReceipt.deleteMany({ where: { senderId: userId, id: { in: receiptIds } } });

  for (const message of delivered) {
    const senderId = await senderIdOf(message.envelope);
    if (!senderId) continue;

    const receipt = await prisma.deliveryReceipt.create({
      data: { senderId, messageId: message.id, expiresAt: ttl() },
    });
    emitToUser(senderId, {
      type: 'receipt',
      receipt: { id: receipt.id, messageId: receipt.messageId, deliveredAt: receipt.deliveredAt.toISOString() },
    });
  }
};

export const startMailboxCleanup = () => {
  const cleanup = async () => {
    const now = new Date();
    await prisma.mailboxMessage.deleteMany({ where: { expiresAt: { lte: now } } });
    await prisma.deliveryReceipt.deleteMany({ where: { expiresAt: { lte: now } } });
  };

  cleanup().catch(error => console.error('Mailbox cleanup failed', error));
  return setInterval(() => cleanup().catch(error => console.error('Mailbox cleanup failed', error)), 60 * 60 * 1000);
};
