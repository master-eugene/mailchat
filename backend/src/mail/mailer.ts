import nodemailer, { type Transporter } from 'nodemailer';

import { env, localUsername } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { armor, encodeEnvelope, type Envelope } from './envelope.js';

const dkim =
  env.DKIM_SELECTOR && env.DKIM_PRIVATE_KEY
    ? { domainName: env.MAIL_DOMAIN, keySelector: env.DKIM_SELECTOR, privateKey: env.DKIM_PRIVATE_KEY }
    : undefined;

// Mail for our own domain goes straight to this server's inbound SMTP, exactly as if
// another mail server had delivered it.
const localTransport = nodemailer.createTransport({
  host: env.LOCAL_DELIVERY_HOST,
  port: env.SMTP_INBOUND_PORT,
  secure: false,
  ignoreTLS: true,
  dkim,
});

const relayTransport: Transporter | null = env.SMTP_RELAY_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_RELAY_HOST,
      port: env.SMTP_RELAY_PORT,
      secure: env.SMTP_RELAY_SECURE,
      auth: env.SMTP_RELAY_USER ? { user: env.SMTP_RELAY_USER, pass: env.SMTP_RELAY_PASS } : undefined,
      dkim,
    })
  : null;

export const sendEnvelope = async (envelope: Envelope) => {
  const transport = localUsername(envelope.to) ? localTransport : relayTransport;
  if (!transport) {
    throw new AppError(422, 'Only MailChat addresses on this server are supported', 'external_not_supported');
  }

  const encoded = encodeEnvelope(envelope);
  const link = `${env.FRONTEND_ORIGIN}/#/read?m=${encoded}`;

  await transport.sendMail({
    from: envelope.from,
    to: envelope.to,
    messageId: `<${envelope.id}@${env.MAIL_DOMAIN}>`,
    subject: `Encrypted message from ${envelope.from}`,
    headers: { 'X-MailChat-Version': '2' },
    text: [
      `${envelope.from} sent you an end-to-end encrypted message with MailChat.`,
      '',
      `Open it in MailChat: ${link}`,
      '',
      armor(encoded),
    ].join('\n'),
  });
};
