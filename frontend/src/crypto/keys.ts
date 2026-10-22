import sodium from 'libsodium-wrappers';

export type UserKeyPair = {
  publicKey: string;
  privateKey: string;
};

export const toBase64 = (value: Uint8Array) => sodium.to_base64(value, sodium.base64_variants.ORIGINAL);

export const fromBase64 = (value: string) => sodium.from_base64(value, sodium.base64_variants.ORIGINAL);

export const ensureSodiumReady = async () => {
  await sodium.ready;
};

export const generateUserKeyPair = async (): Promise<UserKeyPair> => {
  await ensureSodiumReady();
  const keyPair = sodium.crypto_box_keypair();

  return {
    publicKey: toBase64(keyPair.publicKey),
    privateKey: toBase64(keyPair.privateKey),
  };
};

export const derivePublicKey = async (privateKey: string) => {
  await ensureSodiumReady();
  return toBase64(sodium.crypto_scalarmult_base(fromBase64(privateKey)));
};

// Short, human-comparable form of a public key, e.g. "3F2A 9C01 …". Two people can read
// these to each other to make sure the server didn't swap a key.
export const keyFingerprint = async (publicKey: string) => {
  await ensureSodiumReady();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', fromBase64(publicKey)));
  const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return hex.match(/.{4}/g)!.join(' ');
};
