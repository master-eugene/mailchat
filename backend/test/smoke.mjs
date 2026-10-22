// End-to-end smoke test against a running backend (npm run dev, or npm start).
//   npm run test:smoke
// Registers two users, approves them, exchanges an encrypted message over SMTP and checks
// live delivery, sync, ack, receipts and SMTP rejections.
import { execSync } from 'node:child_process';

import sodium from 'libsodium-wrappers';
import nodemailer from 'nodemailer';
import WebSocket from 'ws';

const api = process.env.API_URL ?? 'http://localhost:4000';
const smtpPort = Number(process.env.SMTP_INBOUND_PORT ?? 2525);
const mailDomain = process.env.MAIL_DOMAIN ?? 'mailchat.localhost';

await sodium.ready;

const b64 = bytes => sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
const unb64 = text => sodium.from_base64(text, sodium.base64_variants.ORIGINAL);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};

const request = async (path, { token, ...init } = {}) => {
  const response = await fetch(api + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const run = Date.now().toString(36);

const createUser = async name => {
  const keyPair = sodium.crypto_box_keypair();
  const user = { keyPair, username: `${name}${run}` };
  user.registration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: user.username,
      password: 'password123',
      publicKey: b64(keyPair.publicKey),
    }),
  });
  return user;
};

const login = async user =>
  (
    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: user.username, password: 'password123' }),
    })
  ).body?.token;

const openSocket = token =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`${api.replace(/^http/, 'ws')}/ws`);
    const events = [];
    socket.on('message', data => events.push(JSON.parse(data.toString())));
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token })));
    socket.on('error', reject);
    const timer = setInterval(() => {
      if (events.some(event => event.type === 'ready')) {
        clearInterval(timer);
        resolve({ socket, events });
      }
    }, 20);
  });

const alice = await createUser('alice');
const bob = await createUser('bob');
check(
  'register returns pending',
  alice.registration.status === 201 && alice.registration.body.status === 'pending_approval',
);

const early = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ login: alice.username, password: 'password123' }),
});
check('login refused before approval', early.status === 403 && early.body.code === 'not_approved');

for (const user of [alice, bob]) execSync(`npm run --silent approve -- ${user.username}`, { stdio: 'pipe' });
const byAddress = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ login: `${alice.username}@${mailDomain}`, password: 'password123' }),
});
check('login with full address works', byAddress.status === 200 && Boolean(byAddress.body.token));
const otherDomain = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ login: `${alice.username}@other.example`, password: 'password123' }),
});
check('login with another domain is refused', otherDomain.status === 401);
const reserved = await request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    username: 'postmaster',
    password: 'password123',
    publicKey: b64(sodium.crypto_box_keypair().publicKey),
  }),
});
check('reserved username refused', reserved.status === 409 && reserved.body.code === 'username_taken');

alice.token = await login(alice);
bob.token = await login(bob);
check('login after approval', Boolean(alice.token && bob.token));

const bobLive = await openSocket(bob.token);
const aliceLive = await openSocket(alice.token);

const lookup = await request(`/api/users/lookup?q=${bob.username}`, { token: alice.token });
const id = crypto.randomUUID();
const content = JSON.stringify({
  v: 2,
  id,
  from: alice.registration.body.address,
  to: lookup.body.address,
  body: 'secret 4242',
  sentAt: new Date().toISOString(),
});
const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
const ciphertext = sodium.crypto_box_easy(content, nonce, unb64(lookup.body.publicKey), alice.keyPair.privateKey);
const sent = await request('/api/messages', {
  method: 'POST',
  token: alice.token,
  body: JSON.stringify({ id, to: bob.username, nonce: b64(nonce), ciphertext: b64(ciphertext) }),
});
check('send accepted', sent.status === 202);

await wait(800);
const live = bobLive.events.find(event => event.type === 'message');
const envelope = live && JSON.parse(Buffer.from(live.envelope, 'base64url').toString());
let plaintext = null;
try {
  plaintext = sodium.to_string(
    sodium.crypto_box_open_easy(unb64(envelope.c), unb64(envelope.n), unb64(envelope.k), bob.keyPair.privateKey),
  );
} catch {
  plaintext = null;
}
check('recipient got it live and decrypted it', plaintext !== null && JSON.parse(plaintext).body === 'secret 4242');

const sync = await request('/api/sync', { token: bob.token });
check('message waits in mailbox', sync.body.messages.length === 1);
check('server copy has no plaintext', !Buffer.from(sync.body.messages[0], 'base64url').toString().includes('4242'));

await request('/api/sync/ack', { method: 'POST', token: bob.token, body: JSON.stringify({ messages: [id] }) });
check('ack deletes it', (await request('/api/sync', { token: bob.token })).body.messages.length === 0);

await wait(300);
check(
  'sender got delivered receipt live',
  aliceLive.events.some(e => e.type === 'receipt' && e.receipt.messageId === id),
);
const aliceSync = await request('/api/sync', { token: alice.token });
check(
  'receipt also in sender sync',
  aliceSync.body.receipts.some(receipt => receipt.messageId === id),
);
await request('/api/sync/ack', {
  method: 'POST',
  token: alice.token,
  body: JSON.stringify({ receipts: aliceSync.body.receipts.map(receipt => receipt.id) }),
});
check('receipt ack clears it', (await request('/api/sync', { token: alice.token })).body.receipts.length === 0);

const smtp = nodemailer.createTransport({ host: '127.0.0.1', port: smtpPort, secure: false, ignoreTLS: true });
const expectRejected = async (name, mail) => {
  try {
    await smtp.sendMail(mail);
    check(name, false, 'was accepted');
  } catch (error) {
    check(name, error.responseCode === 550, `${error.responseCode}`);
  }
};
const bobAddress = `${bob.username}@${mailDomain}`;
await expectRejected('plain email rejected', {
  from: 'shop@ads.example',
  to: bobAddress,
  subject: 'SALE',
  text: 'Buy now',
});
await expectRejected('unknown recipient rejected', { from: 'x@example.com', to: `nobody@${mailDomain}`, text: 'hi' });
const forged = Buffer.from(
  JSON.stringify({ ...envelope, id: crypto.randomUUID(), k: b64(sodium.crypto_box_keypair().publicKey) }),
).toString('base64url');
await expectRejected('forged sender key rejected', {
  from: alice.registration.body.address,
  to: bobAddress,
  text: `-----BEGIN MAILCHAT MESSAGE-----\n${forged}\n-----END MAILCHAT MESSAGE-----`,
});

const badSend = await request('/api/messages', {
  method: 'POST',
  token: alice.token,
  body: JSON.stringify({ id: 'x' }),
});
check('bad payload returns 400', badSend.status === 400);
check('server still healthy', (await request('/health')).body?.ok === true);

bobLive.socket.close();
aliceLive.socket.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
