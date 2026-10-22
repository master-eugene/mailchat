import 'dotenv/config';
import { z } from 'zod';

const devJwtSecret = 'dev-secret-change-me';

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform(value => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(4000),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
    // Extra origins allowed to call the API, comma separated (e.g. mirror domains).
    CORS_EXTRA_ORIGINS: z
      .string()
      .default('')
      .transform(value =>
        value
          .split(',')
          .map(origin => origin.trim())
          .filter(Boolean),
      ),
    // Set when running behind a reverse proxy (the Docker install uses Caddy) so rate limits see real client IPs.
    TRUST_PROXY: flag,
    JWT_SECRET: z.string().min(16).default(devJwtSecret),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Chat addresses are username@MAIL_DOMAIN. In production the domain's MX record points at this server.
    MAIL_DOMAIN: z.string().default('mailchat.localhost'),
    // Inbound SMTP. Production: 25. Development: a high port so it runs without root.
    SMTP_INBOUND_PORT: z.coerce.number().default(2525),
    // Only this server delivers to its own mailbox, so SMTP stays private by default.
    SMTP_INBOUND_HOST: z.string().default('127.0.0.1'),
    MAX_INBOUND_MESSAGE_BYTES: z.coerce
      .number()
      .positive()
      .default(128 * 1024),
    // Where outgoing mail for MAIL_DOMAIN is delivered: this server's own inbound SMTP by default.
    LOCAL_DELIVERY_HOST: z.string().default('127.0.0.1'),
    // Optional relay for other domains. MailChat-to-MailChat chat doesn't need it.
    SMTP_RELAY_HOST: z.string().optional(),
    SMTP_RELAY_PORT: z.coerce.number().default(587),
    SMTP_RELAY_SECURE: flag,
    SMTP_RELAY_USER: z.string().optional(),
    SMTP_RELAY_PASS: z.string().optional(),
    DKIM_SELECTOR: z.string().optional(),
    DKIM_PRIVATE_KEY: z.string().optional(),

    MAX_CIPHERTEXT_LENGTH: z.coerce
      .number()
      .positive()
      .default(32 * 1024),
    MAILBOX_TTL_DAYS: z.coerce.number().positive().default(14),

    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default('mailto:admin@example.com'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;

    if (value.JWT_SECRET === devJwtSecret) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET must be set in production' });
    }
    if (!value.VAPID_PUBLIC_KEY || !value.VAPID_PRIVATE_KEY) {
      ctx.addIssue({ code: 'custom', path: ['VAPID_PUBLIC_KEY'], message: 'VAPID keys must be set in production' });
    }
  });

export const env = envSchema.parse(process.env);

export const toAddress = (username: string) => `${username}@${env.MAIL_DOMAIN}`;

// Returns the username if the address belongs to this server, otherwise null.
export const localUsername = (address: string) => {
  const [local, domain] = address.toLowerCase().split('@');
  return domain === env.MAIL_DOMAIN.toLowerCase() && local ? local : null;
};
