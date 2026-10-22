import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { getApprovedUser } from '../auth/auth.service.js';
import { authenticate, type AuthenticatedRequest } from '../auth/auth.middleware.js';
import { env, toAddress } from '../config/env.js';
import { sendEnvelope } from '../mail/mailer.js';
import { findApprovedUser } from '../users/users.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { acknowledge, getSync } from './mailbox.service.js';

export const mailboxRouter = Router();

const sendRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => (req as AuthenticatedRequest).user.id,
});

const sendSchema = z.object({
  id: z.string().uuid(),
  to: z.string().trim().min(3).max(320),
  nonce: z.string().regex(/^[A-Za-z0-9+/]{32}$/),
  ciphertext: z
    .string()
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
    .max(env.MAX_CIPHERTEXT_LENGTH),
});

const ackSchema = z.object({
  messages: z.array(z.string().uuid()).max(500).default([]),
  receipts: z.array(z.string().min(1).max(64)).max(500).default([]),
});

// The device encrypts; the server wraps the ciphertext in an email and sends it over SMTP.
mailboxRouter.post(
  '/messages',
  authenticate,
  sendRateLimit,
  asyncHandler(async (req, res) => {
    const input = sendSchema.parse(req.body);
    const sender = await getApprovedUser((req as AuthenticatedRequest).user.id);
    const recipient = await findApprovedUser(input.to);

    try {
      await sendEnvelope({
        v: 2,
        id: input.id,
        from: toAddress(sender.username),
        to: recipient.address,
        k: sender.publicKey,
        n: input.nonce,
        c: input.ciphertext,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('SMTP delivery failed', error);
      throw new AppError(502, 'Mail delivery failed, try again', 'delivery_failed');
    }

    res.status(202).json({ id: input.id, to: recipient.address });
  }),
);

mailboxRouter.get(
  '/sync',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getSync((req as AuthenticatedRequest).user.id));
  }),
);

mailboxRouter.post(
  '/sync/ack',
  authenticate,
  asyncHandler(async (req, res) => {
    const { messages, receipts } = ackSchema.parse(req.body);
    await acknowledge((req as AuthenticatedRequest).user.id, messages, receipts);
    res.status(204).send();
  }),
);
