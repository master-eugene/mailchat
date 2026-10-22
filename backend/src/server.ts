import http from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { startInboundSmtp } from './mail/inbound.js';
import { startMailboxCleanup } from './mailbox/mailbox.service.js';
import { startRealtime } from './realtime/realtime.js';

const app = createApp();
const server = http.createServer(app);

startRealtime(server);
const smtp = startInboundSmtp();
const cleanup = startMailboxCleanup();

server.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  clearInterval(cleanup);
  smtp.close();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
