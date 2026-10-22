import { z } from 'zod';

import { env } from '../config/env.js';

// A MailChat message as it travels inside an email. Everything readable is metadata the mail
// system needs anyway; the text itself is only in `c`. Mirrors frontend/src/mail/envelope.ts.
export const envelopeSchema = z.object({
  v: z.literal(2),
  id: z.string().uuid(),
  from: z.string().email().toLowerCase(),
  to: z.string().email().toLowerCase(),
  // Sender's public key, so a device can decrypt a first message even when it can't reach the server.
  k: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  n: z.string().regex(/^[A-Za-z0-9+/]{32}$/),
  c: z
    .string()
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
    .max(env.MAX_CIPHERTEXT_LENGTH),
});

export type Envelope = z.infer<typeof envelopeSchema>;

const armorPattern = /-----BEGIN MAILCHAT MESSAGE-----([\s\S]*?)-----END MAILCHAT MESSAGE-----/;

export const encodeEnvelope = (envelope: Envelope) => Buffer.from(JSON.stringify(envelope)).toString('base64url');

export const decodeEnvelope = (encoded: string): Envelope | null => {
  try {
    const result = envelopeSchema.safeParse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export const armor = (encoded: string) =>
  ['-----BEGIN MAILCHAT MESSAGE-----', ...(encoded.match(/.{1,64}/g) ?? []), '-----END MAILCHAT MESSAGE-----'].join(
    '\n',
  );

export const extractEnvelope = (text: string) => {
  const match = text.match(armorPattern);
  return match?.[1] ? decodeEnvelope(match[1].replace(/\s+/g, '')) : null;
};
