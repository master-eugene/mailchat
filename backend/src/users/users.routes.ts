import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import { findApprovedUser } from './users.service.js';

export const usersRouter = Router();

const lookupRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const lookupSchema = z.object({
  q: z.string().trim().min(3).max(320),
});

usersRouter.get(
  '/lookup',
  authenticate,
  lookupRateLimit,
  asyncHandler(async (req, res) => {
    const { q } = lookupSchema.parse(req.query);
    res.json(await findApprovedUser(q));
  }),
);
