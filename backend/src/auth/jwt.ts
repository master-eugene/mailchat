import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  username: string;
};

export const signAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload & jwt.JwtPayload;
};
