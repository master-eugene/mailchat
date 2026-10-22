import { z } from 'zod';

import { localUsername, toAddress } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/errors.js';
import { signAccessToken } from './jwt.js';
import { hashPassword, verifyPassword } from './password.js';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, 'Username must be 3-32 characters: letters, digits, dot, dash or underscore');

// Mail systems expect these addresses to belong to the server's operator.
const reservedUsernames = new Set([
  'admin',
  'administrator',
  'postmaster',
  'hostmaster',
  'webmaster',
  'abuse',
  'root',
  'mailer-daemon',
  'noreply',
  'no-reply',
  'support',
  'security',
]);

const passwordSchema = z.string().min(8).max(256);

export const loginSchema = z.object({
  // A username ("alice") or a full address ("alice@chat.example.com").
  login: z.string().trim().min(1).max(320),
  password: passwordSchema,
});

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  // A base64 X25519 public key is 44 characters.
  publicKey: z.string().regex(/^[A-Za-z0-9+/]{43}=$/, 'Invalid public key'),
});

type UserRow = { id: string; username: string; publicKey: string; createdAt: Date };

export const serializeUser = (user: UserRow) => ({
  id: user.id,
  username: user.username,
  address: toAddress(user.username),
  publicKey: user.publicKey,
  createdAt: user.createdAt.toISOString(),
});

// "alice" and "alice@<MAIL_DOMAIN>" both mean alice; an address on another domain matches nobody.
export const usernameFromLogin = (login: string) => {
  const value = login.trim().toLowerCase();
  return value.includes('@') ? localUsername(value) : value;
};

// Nothing is sent: the account stays pending until an admin approves it (`npm run approve`).
export const register = async (input: z.infer<typeof registerSchema>) => {
  const taken =
    reservedUsernames.has(input.username) ||
    (await prisma.user.findUnique({ where: { username: input.username }, select: { id: true } }));
  if (taken) {
    throw new AppError(409, 'Username is taken', 'username_taken');
  }

  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash: await hashPassword(input.password),
      publicKey: input.publicKey,
    },
  });

  return { ...serializeUser(user), status: 'pending_approval' as const };
};

export const login = async (input: z.infer<typeof loginSchema>) => {
  const username = usernameFromLogin(input.login);
  const user = username ? await prisma.user.findUnique({ where: { username } }) : null;
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid login or password');
  }

  if (!user.approvedAt) {
    throw new AppError(403, 'Your account is waiting for approval', 'not_approved');
  }

  return {
    token: signAccessToken({ sub: user.id, username: user.username }),
    user: serializeUser(user),
  };
};

export const getApprovedUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.approvedAt) {
    throw new AppError(401, 'Account not found or not approved');
  }

  return user;
};

export const getMe = async (userId: string) => serializeUser(await getApprovedUser(userId));
