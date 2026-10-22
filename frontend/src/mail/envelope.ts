import sodium from 'libsodium-wrappers';

import { ensureSodiumReady, fromBase64, toBase64 } from '../crypto/keys';

// How a message travels inside an email (base64url JSON). Built by the server in
// backend/src/mail/mailer.ts; mirrors backend/src/mail/envelope.ts.
export type Envelope = {
  v: 2;
  id: string;
  from: string;
  to: string;
  k: string;
  n: string;
  c: string;
};

// What is actually encrypted. id/from/to are repeated inside the ciphertext so nobody can
// relabel the outer envelope to make a message look like it came from someone else.
export type MessageContent = {
  v: 2;
  id: string;
  from: string;
  to: string;
  body: string;
  sentAt: string;
};

const armorPattern = /-----BEGIN MAILCHAT MESSAGE-----([\s\S]*?)-----END MAILCHAT MESSAGE-----/;
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
};

const encodeBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach(byte => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const parseEnvelope = (encoded: string): Envelope | null => {
  try {
    const data = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded.trim())));
    if (data?.v !== 2 || ![data.id, data.from, data.to, data.k, data.n, data.c].every(isString)) return null;
    return {
      v: 2,
      id: data.id,
      from: data.from.toLowerCase(),
      to: data.to.toLowerCase(),
      k: data.k,
      n: data.n,
      c: data.c,
    };
  } catch {
    return null;
  }
};

export const encodeEnvelope = (envelope: Envelope) =>
  encodeBase64Url(new TextEncoder().encode(JSON.stringify(envelope)));

export const armor = (encoded: string) =>
  ['-----BEGIN MAILCHAT MESSAGE-----', ...(encoded.match(/.{1,64}/g) ?? []), '-----END MAILCHAT MESSAGE-----'].join(
    '\n',
  );

// Accepts an emailed link, the armored block, or the bare encoded envelope.
export const extractEncodedEnvelope = (input: string): string | null => {
  const armored = input.match(armorPattern);
  const fromLink = input.match(/[#&?]m=([A-Za-z0-9_-]+)/);
  const encoded = armored?.[1] ?? fromLink?.[1] ?? input;
  const compact = encoded.replace(/\s+/g, '');

  return parseEnvelope(compact) ? compact : null;
};

export const encryptContent = async (content: MessageContent, recipientPublicKey: string, senderPrivateKey: string) => {
  await ensureSodiumReady();

  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const ciphertext = sodium.crypto_box_easy(
    JSON.stringify(content),
    nonce,
    fromBase64(recipientPublicKey),
    fromBase64(senderPrivateKey),
  );

  return { nonce: toBase64(nonce), ciphertext: toBase64(ciphertext) };
};

export class DecryptError extends Error {}

export const decryptEnvelope = async (
  envelope: Envelope,
  senderPublicKey: string,
  recipientPrivateKey: string,
): Promise<MessageContent> => {
  await ensureSodiumReady();

  let content: MessageContent;
  try {
    const plaintext = sodium.crypto_box_open_easy(
      fromBase64(envelope.c),
      fromBase64(envelope.n),
      fromBase64(senderPublicKey),
      fromBase64(recipientPrivateKey),
    );
    content = JSON.parse(sodium.to_string(plaintext));
  } catch {
    throw new DecryptError('decrypt_failed');
  }

  if (
    content?.v !== 2 ||
    content.id !== envelope.id ||
    content.from?.toLowerCase() !== envelope.from ||
    content.to?.toLowerCase() !== envelope.to ||
    typeof content.body !== 'string'
  ) {
    throw new DecryptError('envelope_mismatch');
  }

  return content;
};
