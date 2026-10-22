import cors from 'cors';
import express from 'express';

import { authRouter } from './auth/auth.routes.js';
import { env } from './config/env.js';
import { mailboxRouter } from './mailbox/mailbox.routes.js';
import { pushRouter } from './push/push.routes.js';
import { usersRouter } from './users/users.routes.js';
import { errorHandler, notFoundHandler } from './utils/errors.js';

export const createApp = () => {
  const app = express();
  // Behind Caddy (and possibly nginx in front of it): trust private-network hops so rate
  // limits see the visitor's real IP, never a client-supplied header.
  if (env.TRUST_PROXY) app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: [env.FRONTEND_ORIGIN, ...env.CORS_EXTRA_ORIGINS],
    }),
  );
  app.use(express.json({ limit: '128kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  // Public: lets the sign-up screen show the address a new login will get (login@domain).
  app.get('/api/info', (_req, res) => res.json({ mailDomain: env.MAIL_DOMAIN }));
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api', mailboxRouter);
  app.use('/api/push', pushRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
