# Contributing to MailChat

Thanks for helping! Bug reports, fixes, translations and docs are all welcome.

## Before you start

- For anything bigger than a small fix, **open an issue first** so we can agree on the approach.
- **Security problems** go through [SECURITY.md](SECURITY.md), not public issues.
- Changes to cryptography, the envelope format or the SMTP checks need a clear explanation of the threat model in the pull request.

## Development setup

Requires Node.js 20+ (`.nvmrc` pins 22).

```bash
cd backend
npm install
cp .env.example .env
npm run vapid:generate   # paste the keys into .env
npx prisma migrate dev
npm run dev              # API on :4000, SMTP on :2525

cd ../frontend
npm install
cp .env.example .env
npm run dev              # web app on :3000
```

To chat with yourself, register one account at `http://localhost:3000` and another at `http://127.0.0.1:3000`, then approve both:

```bash
cd backend && npm run approve -- yourlogin   # or ./mailchat for the menu with the Docker install
```

## Checks

Run these before opening a pull request (CI runs them too):

```bash
cd backend  && npm run format:check && npm run typecheck && npm run build
cd frontend && npm run format:check && npm run i18n:check && npm run build
cd backend  && npm run test:smoke   # needs the backend running
```

`npm run format` fixes formatting.

## Project layout

| Path | What it is |
| --- | --- |
| `backend/src/mail/` | Envelope format, outbound SMTP, inbound SMTP server |
| `backend/src/mailbox/` | Ciphertext mailbox, sync, acks, delivery receipts |
| `backend/src/push/`, `backend/src/realtime/` | Web Push and the live WebSocket |
| `frontend/src/mail/` | Encryption, sending, the shared receive pipeline, live connection |
| `frontend/src/sw/` | Service worker: decrypts pushes into chats; bundled to `/sw.js` |
| `frontend/src/db/` | Local IndexedDB (keys, contacts, chats) |
| `frontend/src/locale/` | Translations; see [docs/TRANSLATING.md](docs/TRANSLATING.md) and run `npm run i18n:check` |
| `mailchat`, `install.sh`, `docker-compose.yml`, `*/Dockerfile` | Self-hosting: the admin menu and commands, the one-command installer, and the Docker setup ([docs/INSTALL.md](docs/INSTALL.md)) |
| `backend/scripts/users.ts` | Account administration used by the `mailchat` menu |

## Pull requests

- Keep each pull request focused on one change.
- Match the surrounding code style; Prettier handles formatting.
- Update the README or docs when behaviour changes.
- By contributing, you agree your work is released under the [MIT License](LICENSE).

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).
