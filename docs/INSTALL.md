# Installing MailChat

This guide sets up your own MailChat server from scratch. **No IT experience is needed**: you'll copy and paste a few commands, and the installer does the rest. It takes about 30 minutes, most of it waiting.

**What you'll end up with:** a private chat at an address like `https://chat.example.com`. You and the people you approve open it on their phones, add it to the Home Screen, and chat with end-to-end encryption.

**What it costs:**

| | Price | Why |
| --- | --- | --- |
| A small rented server (VPS) | about $5 a month | MailChat runs on it 24/7 |
| A domain name | about $10 a year, or free | the address people type, e.g. `chat.example.com` |

**Contents**

1. [Rent a server](#1-rent-a-server)
2. [Get a domain](#2-get-a-domain)
3. [Point the domain at your server](#3-point-the-domain-at-your-server)
4. [Connect to your server](#4-connect-to-your-server)
5. [Install MailChat](#5-install-mailchat)
6. [Create your account and approve it](#6-create-your-account-and-approve-it)
7. [Invite people](#7-invite-people)
8. [Looking after your server](#8-looking-after-your-server)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Rent a server

Any provider that offers a Linux "VPS" (virtual private server) works, for example [Hetzner](https://www.hetzner.com/cloud), [DigitalOcean](https://www.digitalocean.com/products/droplets), [Vultr](https://www.vultr.com/) or [OVH](https://www.ovhcloud.com/en/vps/).

When you create the server, choose:

- **Operating system / image:** **Ubuntu 24.04** (or the newest Ubuntu LTS offered)
- **Size:** the smallest plan with **at least 1 GB of memory** (2 GB is more comfortable)
- **Location:** close to where most of your users are
- **Login / authentication:** "Password" is the simplest. If you choose "SSH key" instead, follow the provider's guide for it.

When the server is ready, the provider shows its **IP address**, four numbers like `203.0.113.25`. Write it down, together with the **root password** (often emailed to you).

> **If your users are in a country that blocks many foreign services**, pick a server location outside that country.

## 2. Get a domain

The domain is the address people open, like `chat.example.com`. HTTPS (the padlock in the browser) and phone notifications need one; a bare IP address won't work.

**Option A: buy one (recommended).** Use any registrar, for example [Porkbun](https://porkbun.com/), [Namecheap](https://www.namecheap.com/) or [Cloudflare](https://www.cloudflare.com/products/registrar/). Cheap endings like `.xyz` or `.online` often cost a few dollars a year. You can use the whole domain (`example.com`) or a subdomain of it (`chat.example.com`); this guide uses `chat.example.com`.

**Option B: free.** [DuckDNS](https://www.duckdns.org/) gives you a free address like `yourname.duckdns.org`. Sign in, create a subdomain, type your server's IP into the **current ip** field and click **update ip**. Then skip step 3.

## 3. Point the domain at your server

In your registrar's website, find **DNS** (sometimes "DNS records", "Manage DNS" or "Advanced DNS") for your domain, and add one record:

| Type | Name / Host | Value / Points to | TTL |
| --- | --- | --- | --- |
| `A` | `chat` | your server's IP, e.g. `203.0.113.25` | Automatic (or 300) |

- For the whole domain (`example.com`) instead of a subdomain, use `@` as the name.
- If there's already an `A` record with the same name, edit it instead of adding a second one.
- On Cloudflare, set the record to **DNS only** (grey cloud), at least for the first install.

DNS changes usually take a few minutes, sometimes up to an hour. The installer checks it for you.

## 4. Connect to your server

You'll type commands into your server through a text window (a "terminal"). Pick your computer:

**Windows 10 or 11:** open the Start menu, type **PowerShell** and open it.
**Mac:** open **Terminal** (press ⌘ Space, type *Terminal*, press Enter).
**Linux:** open your terminal app.

Then type this, with your server's IP, and press Enter:

```
ssh root@203.0.113.25
```

- The first time, it asks *"Are you sure you want to continue connecting?"*. Type `yes` and press Enter.
- Type the root password and press Enter. **Nothing appears on screen while you type the password**; that's normal.

You're connected when you see something like `root@your-server:~#`.

> **No computer?** Most providers have a **Console** button on the server's page that opens the same window in your browser.

**Pasting commands:** in PowerShell and most terminals, right-click pastes. On Mac, use ⌘ V.

## 5. Install MailChat

Paste this one command and press Enter:

```
curl -fsSL https://raw.githubusercontent.com/master-eugene/mailchat/main/install.sh | sudo bash
```

It downloads MailChat to `/opt/mailchat`, adds the **`mailchat`** command, and starts the installer, which:

1. Asks **your domain**: type `chat.example.com` (yours, without `https://`).
2. Asks **your email**: used only for the HTTPS certificate. Chat accounts don't use email; people sign up with a login.
3. Checks that the domain points to this server.
4. Installs Docker (the tool that runs MailChat) if it's missing.
5. Builds and starts MailChat. **The first time takes 5–10 minutes**; let it run.

When it's done you'll see:

```
✓ MailChat is running at https://chat.example.com
```

The server creates its own security keys on first start; you don't need to set anything up.

> **Already running websites with nginx on this server?** That's fine. The installer notices nginx, runs MailChat privately next to your sites, and adds an nginx site for the MailChat domain without touching the others. If the domain doesn't point to the server yet, add the DNS record and then run `mailchat https` to switch on HTTPS.

> **Prefer to see each step?** The same thing by hand: `apt-get install -y git curl`, then `git clone https://github.com/master-eugene/mailchat.git /opt/mailchat`, then `/opt/mailchat/mailchat install`.

## 6. Create your account and approve it

1. On your phone, open `https://chat.example.com` and **add it to your Home Screen first**, then open it from the new icon ([how](USER_GUIDE.md#1-add-mailchat-to-your-home-screen)). On iPhone this order matters: the Home Screen app has its own storage, separate from Safari.
2. Tap **No account yet? Create one**, choose a **login** (for example `anna`) and a password, and tap **Create account**. Your address becomes `anna@chat.example.com` automatically. You'll see **Waiting for approval**.
3. Back in the server window, type:

   ```
   mailchat
   ```

   The MailChat menu opens. Press **1** (*Approve new accounts*), then type the number next to your login and press Enter.

   (If you've closed the window, connect again as in step 4 first.)

4. On your phone, tap **Back to sign in** and sign in.
5. Tap **Turn on notifications** ([details](USER_GUIDE.md#3-turn-on-notifications)).
6. In **Account › Key backup**, download a backup of your key. Without it, losing your phone means losing access to your messages.

> **Use the same phone (and browser) you registered on to sign in the first time.** Your encryption key is created on that device. To use another device, restore the key backup there.

## 7. Invite people

1. Send people your address (`https://chat.example.com`) and a link to the [user guide](USER_GUIDE.md).
2. They create an account. Then run `mailchat`; the menu shows how many people are waiting.
3. Press **1**, and approve the people you know:

   ```
   Waiting for approval

      1  boris    boris@chat.example.com · 5 min ago
      2  anna     anna@chat.example.com · just now
      3  spammer  spammer@chat.example.com · just now

     Numbers approve (e.g. 1 3) · a = approve everyone
     r + numbers reject and delete (e.g. r 2) · Enter = back

   > 1 2
   ```

   Type `r 3` to reject someone you don't know; their account is deleted.

4. To chat, tap **+** and type the other person's login.

Only approve people you recognise: approval is what keeps strangers out of your server.

## 8. Looking after your server

Type **`mailchat`** (from any folder) to open the menu:

```
MailChat  https://chat.example.com
● running  ·  12 account(s)  ·  2 waiting for approval

  1  Approve new accounts (2 waiting)
  2  All accounts
  3  Status
  4  Back up now
  5  Update MailChat
  6  Recent logs
  7  Restart
  h  All commands
  q  Quit
```

**All accounts** lists everyone; type `d 3` to delete account number 3 (you'll be asked to type the login to confirm).

Everything is also available as a direct command:

| Task | Command |
| --- | --- |
| Open the menu | `mailchat` |
| See who's waiting for approval | `mailchat approve` |
| Approve people | `mailchat approve anna boris` |
| Delete an account | `mailchat delete their-login` |
| Check everything is running | `mailchat status` |
| Update to the latest version (makes a backup first) | `mailchat update` |
| Back up accounts and server keys | `mailchat backup` |
| Restore a backup | `mailchat restore /opt/mailchat/backups/FILE.tar.gz` |
| Watch what the server is doing (Ctrl+C to stop) | `mailchat logs` |
| Restart | `mailchat restart` |
| Turn on HTTPS (only when MailChat runs behind your own nginx) | `mailchat https` |
| All commands | `mailchat help` |

> If `mailchat` says "command not found", run `/opt/mailchat/mailchat link` once to add it again.

**Updates:** choose **Update MailChat** in the menu (or run `mailchat update`) every month or two.

**Backups:** **Back up now** saves user accounts and the server's keys into `/opt/mailchat/backups`. Messages aren't included: they're never stored on the server. Copy backups somewhere safe from time to time, for example with your provider's snapshot feature or by downloading them:

```
scp root@203.0.113.25:/opt/mailchat/backups/* .
```

(Run that on your own computer, not on the server.)

**Server updates:** the operating system also needs security updates. On Ubuntu, run `apt-get update && apt-get upgrade -y` now and then, or turn on automatic updates with `apt-get install -y unattended-upgrades`.

**Moving to a new server:** install MailChat on the new server (steps 1–5, with the same domain), then copy your latest backup there and run `mailchat restore /opt/mailchat/backups/FILE.tar.gz`. Finally, change the domain's `A` record (step 3) to the new IP.

## 9. Troubleshooting

**The installer says the domain doesn't point to this server.**
Check the `A` record (step 3) and that the IP matches your server exactly, then wait 10–30 minutes and run `mailchat install` again. On Cloudflare, make sure the cloud icon is grey (DNS only).

**The connection dropped during the install ("Connection reset" or "Broken pipe").**
Installing Docker briefly restarts the server's networking, which can cut your SSH session. Nothing is lost: connect again and run `mailchat install`. It picks up where it stopped.

**The browser shows a certificate or "not secure" warning right after installing.**
The certificate is requested the first time someone opens the site, once the domain points here. Wait a minute and reload. If it persists, run `mailchat logs` and look for lines mentioning `certificate` or `acme`. The usual cause is the domain pointing somewhere else, or ports 80 and 443 being blocked by your provider's firewall (open both in the provider's control panel).

**The site doesn't open at all.**
Run `mailchat status`. If something is stopped, run `mailchat start`. Also check your provider's firewall allows ports **80** and **443**.

**"Your account is waiting for approval."**
The account hasn't been approved yet: run `mailchat` and approve it.

**"Your key isn't on this device."**
The person signed in on a different phone or browser than the one they registered on. They need to restore their key backup (Account › Key backup on the original device, then **Restore a key backup** on the new one). Without a backup, an account can't be moved; they'd need a new account.

**Notifications don't arrive on iPhone.**
They only work when MailChat is opened from the Home Screen icon (iOS 16.4 or newer), and notifications are allowed in MailChat's settings. See the [user guide](USER_GUIDE.md).

**The build stopped with "killed" or "out of memory".**
Run `mailchat install` again; the installer adds swap space on small servers. If it still fails, upgrade the server to 2 GB of memory.

**Something else.**
Run `mailchat logs`, copy the last lines and [open an issue](https://github.com/master-eugene/mailchat/issues). Remove anything private first.

---

### Good to know

- **No mail setup needed.** MailChat's mail server only talks to itself, so you don't need MX records or port 25. Messages between servers ("federation") aren't supported yet.
- **What's on the server:** user accounts (login, password hash, public key) and, for a short time, encrypted messages waiting for delivery. Message text is never stored.
- **Shorter chat addresses.** By default addresses use the app's domain (`anna@chat.example.com`). To use your main domain instead (`anna@example.com`) while the app stays at `chat.example.com`, add `MAIL_DOMAIN=example.com` to `/opt/mailchat/.env` and run `mailchat restart`. Do it before people start chatting: phones pick up the new address when they next sign in or open the app, but existing chats keep the old addresses. No MX record is needed for that domain.
- **Settings** live in `/opt/mailchat/.env`. After changing anything there, run `mailchat restart`.
- **Just want to try it first?** On any computer with [Docker Desktop](https://www.docker.com/products/docker-desktop/) running, download MailChat, run `./mailchat local` in its folder and open http://localhost:8080. No domain needed. `./mailchat local remove` deletes the test.
- **Not a Linux server?** On a Mac or Windows PC with [Docker Desktop](https://www.docker.com/products/docker-desktop/), `./mailchat install` works too, but the computer must stay on and be reachable from the internet, which is why a VPS is recommended.
