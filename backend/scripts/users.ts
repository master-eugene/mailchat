// Account administration, used by the `mailchat` command and its menu.
//   npm run users -- list [pending|approved|all] [--plain]
//   npm run users -- approve <login> [...]
//   npm run users -- delete <login> [...]     also rejects an account that's still waiting
// Logins may be written as "alice" or "alice@your-domain".
// Standalone on purpose (no app config): it runs inside the container where the server's
// secrets aren't loaded into the shell.
import 'dotenv/config';

import { prisma } from '../src/db/prisma.js';

const domain = (process.env.MAIL_DOMAIN ?? 'mailchat.localhost').toLowerCase();
const address = (username: string) => `${username}@${domain}`;

const ago = (date: Date) => {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

const toUsername = (login: string) => {
  const [username, loginDomain] = login.trim().toLowerCase().split('@');
  return username && (!loginDomain || loginDomain === domain) ? username : null;
};

const args = process.argv.slice(2);
const plain = args.includes('--plain');
const [command = 'list', ...rest] = args.filter(arg => arg !== '--plain');

const list = async (which: string) => {
  const where = which === 'pending' ? { approvedAt: null } : which === 'approved' ? { approvedAt: { not: null } } : {};
  const users = await prisma.user.findMany({
    where,
    select: { username: true, approvedAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (plain) {
    // One account per line: login, status, created (ISO), age. Parsed by the menu.
    users.forEach(user =>
      console.log(
        [
          user.username,
          user.approvedAt ? 'approved' : 'pending',
          user.createdAt.toISOString(),
          ago(user.createdAt),
        ].join('\t'),
      ),
    );
    return;
  }

  if (!users.length) {
    console.log(which === 'pending' ? 'No accounts waiting for approval.' : 'No accounts.');
    return;
  }
  if (which === 'pending') console.log('Waiting for approval:');
  users.forEach(user => {
    const status = which === 'all' ? `  ${user.approvedAt ? 'approved' : 'waiting'}` : '';
    console.log(
      `  ${user.username}  (${address(user.username)}, ${user.createdAt.toISOString().slice(0, 16)})${status}`,
    );
  });
};

const forEachLogin = async (logins: string[], action: (username: string) => Promise<boolean>, done: string) => {
  if (!logins.length) {
    console.error('Give at least one login.');
    process.exitCode = 1;
    return;
  }
  for (const login of logins) {
    const username = toUsername(login);
    const changed = username ? await action(username) : false;
    console.log(changed ? `${done} ${address(username!)}` : `No matching account for ${login}`);
  }
};

switch (command) {
  case 'list':
    await list(rest[0] ?? 'pending');
    break;
  case 'approve':
    await forEachLogin(
      rest,
      async username =>
        (await prisma.user.updateMany({ where: { username, approvedAt: null }, data: { approvedAt: new Date() } }))
          .count > 0,
      'Approved',
    );
    break;
  case 'delete':
    // Cascades to push subscriptions, queued messages and receipts.
    await forEachLogin(
      rest,
      async username => (await prisma.user.deleteMany({ where: { username } })).count > 0,
      'Deleted',
    );
    break;
  default:
    console.error(`Unknown command "${command}". Use: list, approve, delete`);
    process.exitCode = 1;
}

await prisma.$disconnect();
