import { localUsername, toAddress } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/errors.js';

export type PublicUser = { id: string; username: string; address: string; publicKey: string };

// Accepts "bob" or "bob@<MAIL_DOMAIN>". Only approved accounts on this server can be found.
export const findApprovedUser = async (usernameOrAddress: string): Promise<PublicUser> => {
  const value = usernameOrAddress.trim().toLowerCase();
  const username = value.includes('@') ? localUsername(value) : value;

  const user = username
    ? await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, publicKey: true, approvedAt: true },
      })
    : null;

  if (!user?.approvedAt) {
    throw new AppError(404, 'No MailChat user with this name', 'user_not_found');
  }

  return { id: user.id, username: user.username, address: toAddress(user.username), publicKey: user.publicKey };
};
