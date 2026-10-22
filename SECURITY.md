# Security policy

MailChat is **experimental and has not been independently audited**. Don't rely on it where a security failure could put someone at risk.

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately via [GitHub Security Advisories](https://github.com/master-eugene/mailchat/security/advisories/new) ("Report a vulnerability").

Include what you found, how to reproduce it, and what an attacker could do with it. We'll acknowledge the report as soon as we can and agree on a disclosure date with you.

## What MailChat protects

- **Message content**: encrypted on the sender's device with libsodium `crypto_box` (X25519 + XSalsa20-Poly1305), decrypted only on the recipient's device. The server, the mail system and the push services (Apple, Google, Mozilla) only ever see ciphertext.
- **Sender authenticity**: sender and recipient are repeated inside the ciphertext, and the inbound SMTP server checks the sender's public key.
- **Key changes**: contact keys are pinned on first use, and a changed key blocks the chat until the user accepts it.
- **Server storage**: ciphertext is stored only until the recipient's device acknowledges it, or `MAILBOX_TTL_DAYS` passes.

## Known limitations

- **Metadata is visible to the server**: who talks to whom, when, and message sizes. Apple and Google see when a push is sent to a device.
- **No forward secrecy**: each account has one long-term key pair. If a private key leaks, past captured messages can be decrypted.
- **Trust on first use**: the first key you see for a contact comes from the server. Compare fingerprints (the **Keys** button in a chat) for sensitive contacts.
- **Web app delivery**: whoever controls the server that serves the web app can serve modified code that steals keys. Self-host, or review builds, if this matters to you.
- **Device security**: chats and the private key are stored unencrypted in the browser's IndexedDB, and notifications show message text on the lock screen.
- **Session token**: stored in IndexedDB so the service worker can acknowledge messages; an XSS bug would expose it.
- **Inbound SMTP** has no STARTTLS until a certificate is configured (see `backend/src/mail/inbound.ts`).
