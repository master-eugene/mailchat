import sodium from 'libsodium-wrappers';

import type { LocalUser } from '../db/indexedDb';
import { derivePublicKey, ensureSodiumReady, fromBase64, toBase64 } from './keys';

// The private key never leaves the device unencrypted. A backup file is the private key
// sealed with a key derived from a passphrase the server never sees.
export type KeyBackup = {
  type: 'mailchat-key-backup';
  v: 2;
  userId: string;
  username: string;
  address: string;
  publicKey: string;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

const iterations = 600_000;

const deriveKey = async (passphrase: string, salt: Uint8Array, rounds: number) => {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds },
    material,
    256,
  );
  return new Uint8Array(bits);
};

export const createKeyBackup = async (user: LocalUser, passphrase: string): Promise<KeyBackup> => {
  await ensureSodiumReady();

  const salt = sodium.randombytes_buf(16);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const key = await deriveKey(passphrase, salt, iterations);

  return {
    type: 'mailchat-key-backup',
    v: 2,
    userId: user.id,
    username: user.username,
    address: user.address,
    publicKey: user.publicKey,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    ciphertext: toBase64(sodium.crypto_secretbox_easy(fromBase64(user.privateKey), nonce, key)),
  };
};

export class KeyBackupError extends Error {}

export const restoreKeyBackup = async (fileContent: string, passphrase: string): Promise<LocalUser> => {
  await ensureSodiumReady();

  let backup: KeyBackup;
  try {
    backup = JSON.parse(fileContent);
  } catch {
    throw new KeyBackupError('backup_invalid');
  }
  const validIterations =
    Number.isInteger(backup?.iterations) && backup.iterations >= 100_000 && backup.iterations <= 5_000_000;
  if (
    backup?.type !== 'mailchat-key-backup' ||
    backup.v !== 2 ||
    typeof backup.address !== 'string' ||
    !validIterations
  ) {
    throw new KeyBackupError('backup_invalid');
  }

  let privateKey: string;
  try {
    const key = await deriveKey(passphrase, fromBase64(backup.salt), backup.iterations);
    privateKey = toBase64(
      sodium.crypto_secretbox_open_easy(fromBase64(backup.ciphertext), fromBase64(backup.nonce), key),
    );
  } catch {
    throw new KeyBackupError('backup_wrong_passphrase');
  }

  if ((await derivePublicKey(privateKey)) !== backup.publicKey) {
    throw new KeyBackupError('backup_invalid');
  }

  return {
    id: backup.userId,
    username: backup.username,
    address: backup.address,
    publicKey: backup.publicKey,
    privateKey,
  };
};
