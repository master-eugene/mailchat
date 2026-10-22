import webPush from 'web-push';

import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import type { Envelope } from '../mail/envelope.js';

export const isPushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (isPushConfigured) {
  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

// Web Push allows ~4 KB per message after its own encryption; leave headroom.
const maxInlinePayloadBytes = 3000;

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export const savePushSubscription = async (userId: string, subscription: PushSubscriptionInput) => {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
};

export const deletePushSubscription = async (userId: string, endpoint: string) => {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
};

// The encrypted message rides inside the push when it fits, so the phone can read it even
// if it can't reach this server. Otherwise the push only says who wrote.
export const pushEnvelope = async (recipientId: string, envelope: Envelope, encoded: string) => {
  if (!isPushConfigured) return;

  const inline = JSON.stringify({ t: 'message', envelope: encoded });
  const payload =
    Buffer.byteLength(inline) <= maxInlinePayloadBytes
      ? inline
      : JSON.stringify({ t: 'fetch', from: envelope.from, id: envelope.id });

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: recipientId } });

  await Promise.allSettled(
    subscriptions.map(async subscription => {
      try {
        await webPush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
          { TTL: env.MAILBOX_TTL_DAYS * 24 * 60 * 60, urgency: 'high' },
        );
      } catch (error) {
        const statusCode = typeof error === 'object' && error && 'statusCode' in error ? error.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
        } else {
          console.error('Push failed', statusCode ?? error);
        }
      }
    }),
  );
};
