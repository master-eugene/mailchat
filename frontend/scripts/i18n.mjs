// Translation helper. English (en.json) is the reference file.
//   npm run i18n:new -- de "Deutsch"   create locales/de.json from English, ready to translate
//   npm run i18n:check                 check every language for missing keys or broken {{placeholders}}
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/locale/locales');
const read = file => JSON.parse(readFileSync(join(dir, file), 'utf8'));
const english = read('en.json');
const placeholders = text =>
  (String(text).match(/{{\s*\w+\s*}}/g) ?? [])
    .map(p => p.replace(/\s/g, ''))
    .sort()
    .join(',');

const [command, code, name] = process.argv.slice(2);

if (command === 'new') {
  if (!code || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(code) || !name) {
    console.error(
      'Usage: npm run i18n:new -- <language code> "<language name>"\nExample: npm run i18n:new -- de "Deutsch"',
    );
    process.exit(1);
  }
  const file = join(dir, `${code}.json`);
  if (existsSync(file)) {
    console.error(`${code}.json already exists.`);
    process.exit(1);
  }
  writeFileSync(file, `${JSON.stringify({ ...english, language_name: name }, null, 2)}\n`);
  console.log(`Created src/locale/locales/${code}.json`);
  console.log('Replace the English text on the right of each line with your translation.');
  console.log('Keep the keys on the left, and keep anything like {{email}} exactly as it is.');
  process.exit(0);
}

if (command !== 'check') {
  console.error('Usage: npm run i18n:check   or   npm run i18n:new -- <code> "<name>"');
  process.exit(1);
}

let problems = 0;
const report = (file, message) => {
  problems++;
  console.log(`  ${file}: ${message}`);
};

for (const file of readdirSync(dir)
  .filter(name => name.endsWith('.json'))
  .sort()) {
  let messages;
  try {
    messages = read(file);
  } catch (error) {
    report(file, `is not valid JSON (${error.message})`);
    continue;
  }

  const missing = Object.keys(english).filter(key => !(key in messages));
  const extra = Object.keys(messages).filter(key => !(key in english));
  const untranslated =
    file === 'en.json'
      ? []
      : Object.keys(english).filter(key => key !== 'text_direction' && messages[key] === english[key]);

  // Missing lines are fine (English is shown), so they're listed but don't fail the check.
  if (missing.length)
    console.log(`  ${file}: missing ${missing.length} key(s), English is shown instead: ${missing.join(', ')}`);
  if (extra.length) report(file, `unknown key(s), probably typos: ${extra.join(', ')}`);
  for (const key of Object.keys(english)) {
    if (!(key in messages)) continue;
    if (typeof messages[key] !== 'string' || !messages[key].trim()) report(file, `"${key}" is empty`);
    else if (placeholders(messages[key]) !== placeholders(english[key])) {
      report(file, `"${key}" must contain ${placeholders(english[key]) || 'no placeholders'}`);
    }
  }
  if (!['ltr', 'rtl'].includes(messages.text_direction ?? 'ltr')) report(file, 'text_direction must be "ltr" or "rtl"');

  const status = untranslated.length ? `  (${untranslated.length} line(s) still in English)` : '';
  console.log(`${file}: ${messages.language_name ?? '?'}${status}`);
}

if (problems) {
  console.log(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll language files are valid.');
