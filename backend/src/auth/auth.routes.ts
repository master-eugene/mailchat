import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../utils/errors.js';
import { authenticate, type AuthenticatedRequest } from './auth.middleware.js';
import { getMe, login, loginSchema, register, registerSchema } from './auth.service.js';

export const authRouter = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post(
  '/register',
  registerRateLimit,
  asyncHandler(async (req, res) => {
    const result = await register(registerSchema.parse(req.body));
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const result = await login(loginSchema.parse(req.body));
    res.json(result);
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getMe((req as AuthenticatedRequest).user.id);
    res.json(user);
  }),
);
