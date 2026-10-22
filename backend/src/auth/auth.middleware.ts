import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors.js';
import { verifyAccessToken } from './jwt.js';

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    username: string;
  };
};

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, 'Missing access token'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      username: payload.username,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid access token'));
  }
};
