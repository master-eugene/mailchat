# Using MailChat

MailChat is a private chat app. Your messages are locked (encrypted) on your phone and can only be unlocked on the phone of the person you're writing to. Not even the server owner can read them.

You'll need the **address of your MailChat server** from whoever invited you, for example `https://chat.example.com`.

## 1. Add MailChat to your Home Screen

Do this **before** creating your account. It makes MailChat work like a normal app, and on iPhone it's required for notifications.

**iPhone (Safari):**

1. Open the address in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up) at the bottom of the screen.
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Close Safari and **open MailChat from the new icon**. Always use the icon from now on.

> **Why first?** On iPhone, the Home Screen app keeps its own storage, separate from Safari. If you create your account in Safari, your key stays in Safari and the Home Screen app can't use it.

**Android (Chrome):**

1. Open the address in **Chrome**.
2. Tap the **⋮** menu at the top right.
3. Tap **Add to Home screen** or **Install app**, then confirm, and open MailChat from the new icon.

## 2. Create your account

1. In MailChat (opened from the icon), change the language if you like, using the **Language** menu at the bottom.
2. Tap **No account yet? Create one**.
3. Choose a **login** (for example `anna`) and a password, then tap **Create account**. Your address is your login plus the server's domain, like `anna@chat.example.com`, and others find you by it. No email is needed.
4. You'll see **Waiting for approval**. Tell the person who invited you; they approve you.
5. Once approved, tap **Back to sign in** and sign in **in the same app on the same phone**. Your secret key was made there.

## 3. Turn on notifications

1. Open MailChat from the Home Screen icon.
2. On the **Chats** screen, tap **Turn on notifications**, then **Allow**.

New messages now arrive even when MailChat is closed. The message is decrypted on your phone before the notification appears.

If you tapped **Don't Allow** by mistake:

- **iPhone:** Settings › Notifications › MailChat › Allow Notifications.
- **Android:** long-press the MailChat icon › App info › Notifications.

> **Privacy tip:** notifications show the message text on your lock screen. To hide it, on iPhone go to Settings › Notifications › MailChat › Show Previews › When Unlocked; on Android, Settings › Notifications › Notifications on lock screen.

## 4. Back up your key (important!)

Your key lives only on your phone. **If you lose the phone without a backup, you lose your account and your messages.** Nobody can recover it for you.

1. Go to **Account › Key backup**.
2. Choose a passphrase of at least 10 characters and type it twice. Write it down on paper.
3. Tap **Download backup**, and save the file somewhere safe that isn't your phone, like a password manager or a USB stick.

Keep the file and the passphrase in **different** places.

## 5. Chat

- **Start a chat:** tap **+** on the Chats screen and type the other person's **login** (or their full address).
- **Send:** type, then tap the blue arrow.
- **Ticks:** ✓ means sent; ✓✓ means it reached the other person's phone; 🕓 means sending. **!** with **Retry** means it didn't go through; tap **Retry**.
- **Language and theme:** Account › Appearance.

## 6. Make sure nobody is listening in

Each person's key has a **fingerprint**, a code like `3F2A 9C01 …`.

1. In a chat, tap **Keys** at the top. You'll see your fingerprint and the other person's.
2. Compare them with that person in person or on a phone call. If both of you see the same codes, nobody can secretly read your chat.

If MailChat ever shows **This person's key has changed**, stop and compare fingerprints with them before tapping **I checked it, trust the new key**. It's normal after they move to a new phone without a backup; otherwise it can mean someone is trying to intercept messages.

## 7. Using a new phone or computer

1. On the **old** phone: Account › Key backup › download a backup (step 4).
2. On the **new** device: open your MailChat address, tap **Restore a key backup**, tap **Choose the backup file** (or **Paste the backup text instead** if you sent the file's contents to yourself, e.g. in a messenger), enter the passphrase, tap **Restore key**, then sign in.

Chats already on the old phone aren't copied; new messages arrive on the new device.

## 8. When the internet is blocked

If the MailChat server can't be reached but other apps work:

1. In a chat, type your message, tap the **shield** icon at the top right, then **Send through another app**.
2. Choose any app that still works (email, a messenger, SMS) and send the encrypted text to your contact.
3. They copy the whole text, open MailChat, tap **Open message** on the Chats screen, paste it, and tap **Decrypt**.

The text is unreadable to anyone but your contact.

## 9. Common questions

**I see "Your key isn't on this device."**
You signed in on a different phone or browser than the one you registered on. On iPhone this also happens if you registered in Safari and then opened the Home Screen icon: open Safari, back up your key there (step 4), and restore it in the Home Screen app (step 7). Otherwise, restore your key backup (step 7).

**Notifications don't arrive (iPhone).**
Open MailChat from the Home Screen icon, not Safari, and check notifications are allowed (step 3). iOS 16.4 or newer is needed.

**I forgot my password.**
Ask your server owner. There's no automatic reset yet.

**I lost my phone.**
Restore your key backup on a new device (step 7). Without a backup, ask the server owner for a new account, and tell your contacts so they can confirm your new fingerprint.

**Can the server owner read my messages?**
No. They can see who you chat with and when, but not what you write.
