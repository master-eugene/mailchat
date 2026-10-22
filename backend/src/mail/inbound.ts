import { simpleParser } from 'mailparser';
import { SMTPServer, type SMTPServerDataStream, type SMTPServerSession } from 'smtp-server';

import { env, localUsername } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { deliverToMailbox } from '../mailbox/mailbox.service.js';
import { extractEnvelope } from './envelope.js';

// MailChat users' mail leaves through this server, so it may only arrive from here.
const trustedSenderHosts = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', env.LOCAL_DELIVERY_HOST]);

const smtpError = (code: number, message: string) => Object.assign(new Error(message), { responseCode: code });

const readStream = async (stream: SMTPServerDataStream) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  if (stream.sizeExceeded) throw smtpError(552, 'Message too large');
  return Buffer.concat(chunks);
};

const findApprovedByAddress = async (address: string) => {
  const username = localUsername(address);
  if (!username) return null;
  const user = await prisma.user.findUnique({ where: { username } });
  return user?.approvedAt ? user : null;
};

// Accepts a message only if it is a valid MailChat envelope, addressed to an approved user here,
// sent by an approved MailChat user whose public key matches. Everything else (ads, spam,
// plain email) is refused at the SMTP level.
const handleMessage = async (raw: Buffer, session: SMTPServerSession) => {
  const parsed = await simpleParser(raw);
  const envelope = extractEnvelope(parsed.text ?? '');
  if (!envelope) throw smtpError(550, 'MailChat accepts encrypted MailChat messages only');

  const headerFrom = parsed.from?.value[0]?.address?.toLowerCase();
  const recipients = session.envelope.rcptTo.map(rcpt => rcpt.address.toLowerCase());
  if (headerFrom !== envelope.from || !recipients.includes(envelope.to)) {
    throw smtpError(550, 'Envelope does not match message headers');
  }

  const sender = await findApprovedByAddress(envelope.from);
  if (!sender || sender.publicKey !== envelope.k || !trustedSenderHosts.has(session.remoteAddress)) {
    throw smtpError(550, 'Sender is not a MailChat user on this server');
  }

  const recipient = await findApprovedByAddress(envelope.to);
  if (!recipient) throw smtpError(550, 'No such user');

  await deliverToMailbox(recipient.id, envelope);
};

export const startInboundSmtp = () => {
  const server = new SMTPServer({
    name: env.MAIL_DOMAIN,
    banner: 'MailChat',
    authOptional: true,
    disabledCommands: ['AUTH'],
    // STARTTLS needs a certificate; production should configure `key`/`cert` here.
    hideSTARTTLS: true,
    size: env.MAX_INBOUND_MESSAGE_BYTES,
    logger: false,
    async onRcptTo(address, _session, callback) {
      try {
        callback((await findApprovedByAddress(address.address)) ? undefined : smtpError(550, 'No such user'));
      } catch {
        callback(smtpError(451, 'Temporary failure'));
      }
    },
    onData(stream, session, callback) {
      readStream(stream)
        .then(raw => handleMessage(raw, session))
        .then(() => callback())
        .catch(error => callback(error.responseCode ? error : smtpError(451, 'Temporary failure')));
    },
  });

  server.on('error', error => console.error('SMTP server error', error));
  server.listen(env.SMTP_INBOUND_PORT, env.SMTP_INBOUND_HOST, () => {
    console.log(`SMTP listening on ${env.SMTP_INBOUND_HOST}:${env.SMTP_INBOUND_PORT} for @${env.MAIL_DOMAIN}`);
  });

  return server;
};
