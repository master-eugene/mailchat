# Adding a language

MailChat's texts live in one file per language in [`frontend/src/locale/locales/`](../frontend/src/locale/locales). English (`en.json`) is the reference. A new file there appears in **Account › Appearance › Language** and on the sign-in screen automatically; no code changes are needed.

You don't need to be a programmer to translate. You only change text between quotes.

## Option A: on GitHub, in the browser

1. Open [`en.json`](../frontend/src/locale/locales/en.json) and copy everything (the **Copy raw file** button).
2. In the same folder, click **Add file › Create new file**.
3. Name the file after your [language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes): `de.json` for German, `es.json` for Spanish, `pt-BR.json` for Brazilian Portuguese.
4. Paste the English text and translate it (see the rules below).
5. Click **Commit changes › Propose changes**, then **Create pull request**. A check runs automatically and tells you if something needs fixing.

## Option B: on your computer

```bash
cd frontend
npm run i18n:new -- de "Deutsch"   # creates src/locale/locales/de.json from English
# translate the file in any text editor
npm run i18n:check                 # finds mistakes
npm run dev                        # open http://localhost:3000 and pick your language
```

## Rules

Each line looks like this:

```json
"pending_text": "Your account for {{email}} is created. An administrator needs to approve it before you can sign in.",
```

- **Translate only the text on the right.** Never change the key on the left (`"pending_text"`).
- **Keep `{{email}}`, `{{address}}` and similar exactly as they are.** The app puts real values there. You may move them within the sentence.
- Keep the quotes, colons and commas. The last line has no comma.
- Set `"language_name"` to your language's own name, the way speakers write it: `"Deutsch"`, `"Español"`, `"日本語"`.
- For right-to-left languages (Arabic, Hebrew, Persian), set `"text_direction": "rtl"`.
- Use the same style as the English text: short, friendly, no jargon.

Lines you haven't translated yet can stay in English. If a line is missing completely, the app shows the English text instead, so a half-finished translation still works.

## Checking your work

`npm run i18n:check` (or the automatic check on your pull request) reports:

- **missing key(s)**: lines that exist in English but not in your file (only a warning; English is shown for them)
- **unknown key(s)**: usually a typo in a key on the left
- **must contain `{{…}}`**: a placeholder was changed or removed
- **not valid JSON**: usually a missing or extra comma or quote; the message gives the position

It also counts how many lines are still identical to English, so you can see what's left.

## When English changes

When new features add texts to `en.json`, other languages show those lines in English until someone translates them. `npm run i18n:check` lists them as missing keys.
