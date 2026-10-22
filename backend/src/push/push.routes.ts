import { Router } from 'express';
import { z } from 'zod';

import { authenticate, type AuthenticatedRequest } from '../auth/auth.middleware.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/errors.js';
import { deletePushSubscription, isPushConfigured, savePushSubscription } from './push.service.js';

export const pushRouter = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

pushRouter.get('/key', (_req, res) => {
  res.json({ publicKey: isPushConfigured ? env.VAPID_PUBLIC_KEY : null });
});

pushRouter.post(
  '/subscribe',
  authenticate,
  asyncHandler(async (req, res) => {
    await savePushSubscription((req as AuthenticatedRequest).user.id, subscriptionSchema.parse(req.body));
    res.status(204).send();
  }),
);

pushRouter.delete(
  '/subscribe',
  authenticate,
  asyncHandler(async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
    await deletePushSubscription((req as AuthenticatedRequest).user.id, endpoint);
    res.status(204).send();
  }),
);
