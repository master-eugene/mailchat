<p align="center"><img src="frontend/public/icon-512.png" width="96" height="96" alt="MailChat icon"></p>

# MailChat

[![CI](https://github.com/master-eugene/mailchat/actions/workflows/ci.yml/badge.svg)](https://github.com/master-eugene/mailchat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

End-to-end encrypted chat that travels as email. MailChat runs its own mail server: each user gets `username@your-domain`, messages are delivered over SMTP, and phones get them inside push notifications, even when the app is closed.

> **Status: experimental.** MailChat hasn't been independently audited. Read [SECURITY.md](SECURITY.md) before relying on it.

**Features**

- Telegram-style chats in a web app you can add to your phone's Home Screen
- Messages encrypted on the device; the server only relays and briefly holds ciphertext
- Built on its own SMTP mailbox: every message is a standard email; spam and plain mail are rejected
- Messages delivered inside push notifications, so they arrive even if the server is unreachable
- Delivery receipts, key pinning with fingerprints, passphrase-protected key backup
- An offline path: share an encrypted message through any app that still works
- English and Russian, with [new languages added by copying one file](docs/TRANSLATING.md)
- [Self-hosted in a few commands](docs/INSTALL.md): Docker, automatic HTTPS, no mail setup

## How a message moves

```
Alice's phone ─ encrypt ─▶ POST /api/messages ─▶ MailChat server ─ SMTP ─▶ MailChat inbound SMTP (bob@domain)
                                                                   │ stores ciphertext only
                       ┌───────────────────────────────────────────┤
                       ▼                                           ▼
          live WebSocket (app open)            Web Push via Apple/Google (app closed)
                       └──────────────▶ Bob's phone decrypts, saves to chat, sends ack ─▶ server deletes
```

1. **Sign-up**: a login and a password; the address becomes `login@your-domain` automatically. The key pair is created on the device; only the public key is sent. **Nothing is emailed**: the account stays pending until an admin approves it.
2. **Send**: the app encrypts on the device (libsodium `crypto_box`) and posts only ciphertext. The server wraps it in a standard email (`From: alice@domain`, `To: bob@domain`, plus an armored `MAILCHAT MESSAGE` block) and sends it over SMTP.
3. **Receive (SMTP)**: MailChat's inbound SMTP server accepts only valid MailChat envelopes, addressed to an approved user and sent by an approved user whose public key matches. Ads, spam and plain email get `550`.
4. **Deliver**:
   - **App open**: over the WebSocket, instantly.
   - **App closed**: the encrypted message rides **inside the Web Push** (up to about 3 KB; longer messages trigger a fetch). The service worker decrypts it and **saves it into the chat before showing the notification**, so swiping the notification away can't lose it. This works even if the phone can't reach the MailChat server, as long as Apple's or Google's push gets through.
   - **Any time the app opens**: `GET /api/sync` catches up on anything a push missed.
5. **Ack**: the device sends `POST /api/sync/ack` with the message IDs it has stored. The server deletes the ciphertext, and the sender gets a ✓✓ delivery receipt. Unacknowledged messages expire after `MAILBOX_TTL_DAYS` (default 14). If the ack can't get through, it's queued and retried. Pushes are never re-sent.
6. **Offline path**: in a chat's shield panel, **Send through another app** encrypts the typed message and hands it to the system share sheet (any mail app, messenger or SMS). The recipient pastes it into **Open message**. No MailChat server involved.

## Security model

- Message text exists only on the two devices. The server sees sender, recipient, time, size and ciphertext.
- **Key pinning**: a contact's key is pinned on first contact. A different key later blocks the chat until the user compares fingerprints (**Keys** in the chat header) and accepts it.
- Sender and recipient are repeated inside the ciphertext, so a relabelled envelope is rejected.
- Key backup: Account › Key backup downloads the private key encrypted with a passphrase (PBKDF2-SHA256, 600k iterations, then XSalsa20-Poly1305). Restore it on a new device.
- Not covered: forward secrecy (one long-term key per account), and a malicious build of the web app itself. See [SECURITY.md](SECURITY.md) for the full list.

## Install your own server

On a fresh Linux server (Ubuntu, Debian, Fedora...), one command does everything:

```bash
curl -fsSL https://raw.githubusercontent.com/master-eugene/mailchat/main/install.sh | sudo bash
```

It asks for your domain and email, installs Docker, gets the HTTPS certificate automatically and generates all server keys. No port 25, MX or other mail DNS records are needed. The [installation guide](docs/INSTALL.md) walks through everything step by step for people with no IT background, including renting a server and getting a domain.

Afterwards, type **`mailchat`** on the server to open a menu for approving new accounts, managing accounts, backups and updates. Everything is also available as direct commands (`mailchat help`).

To just try it on your own computer (with [Docker Desktop](https://www.docker.com/products/docker-desktop/) running), run `./mailchat local` in this folder and open http://localhost:8080. `./mailchat local remove` deletes it again.

## Documentation

| Guide | For |
| --- | --- |
| [Installing MailChat](docs/INSTALL.md) | People running a server |
| [Using MailChat](docs/USER_GUIDE.md) | Everyone using the app: Home Screen, notifications, key backup |
| [Adding a language](docs/TRANSLATING.md) | Translators |
| [Security](SECURITY.md) | What MailChat protects, its limits, and how to report problems |
| [Contributing](CONTRIBUTING.md) | Developers |

## Development

```bash
cd backend && npm install && cp .env.example .env
npm run vapid:generate        # put the two keys into backend/.env
npx prisma migrate dev
npm run dev                   # API on :4000, SMTP on 127.0.0.1:2525
cd ../frontend && npm install && cp .env.example .env
npm run dev                   # web app on :3000
```

Manage accounts with `cd backend && npm run users -- list all`, `npm run approve -- alice` and `npm run users -- delete alice`. Or directly in the database (SQLite stores dates as milliseconds):

```sql
UPDATE User SET approvedAt = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE username = 'alice';
```

With the backend running, `cd backend && npm run test:smoke` checks the whole server path: approval, SMTP delivery, live and synced delivery, acks, receipts and SMTP rejections.

To try the app with two users, use `http://localhost:3000` for one account and `http://127.0.0.1:3000` for the other. They're separate origins, so each has its own keys and chats. The dev service worker also accepts `postMessage({ type: 'debug-push', payload })` to simulate a push. This hook is stripped from production builds.

### Backend settings

The Docker install sets these for you. For development they live in `backend/.env`.

| Variable | Notes |
| --- | --- |
| `MAIL_DOMAIN` | Chat addresses are `username@MAIL_DOMAIN`. In the Docker install it defaults to the web domain; set `MAIL_DOMAIN` in `.env` to use another (e.g. app at `chat.example.com`, addresses `@example.com`). |
| `SMTP_INBOUND_HOST`, `SMTP_INBOUND_PORT` | Inbound SMTP, private to the server by default (`127.0.0.1:2525`) |
| `FRONTEND_ORIGIN`, `CORS_EXTRA_ORIGINS` | Web app URL (used in email links) and extra allowed origins, such as mirror domains |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. Required in production (the Docker image generates them). |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Required in production (generated by the Docker image); sessions last `7d` by default |
| `TRUST_PROXY` | `true` behind a reverse proxy, so rate limits see real client IPs |
| `DKIM_SELECTOR`, `DKIM_PRIVATE_KEY`, `SMTP_RELAY_*` | For future server-to-server mail; not needed today |
| `MAILBOX_TTL_DAYS`, `MAX_CIPHERTEXT_LENGTH`, `MAX_INBOUND_MESSAGE_BYTES` | Limits |

### Build

```bash
cd backend && npm run build
cd frontend && npm run build   # also bundles the service worker to dist/sw.js
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
