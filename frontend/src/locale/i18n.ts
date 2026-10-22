import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type enLocale from './locales/en.json';

// Every file in ./locales is a language. To add one, copy en.json (or run
// `npm run i18n:new -- de "Deutsch"`) and translate the values; it shows up in Settings
// automatically. Missing keys fall back to English. See docs/TRANSLATING.md.
export type Messages = typeof enLocale;
export type TLanguage = string;
export type TranslateFn = (key: keyof Messages, params?: Record<string, string>) => string;

export const defaultLanguage = 'en';
export const languageStorageKey = 'mailchat.language';

const modules = import.meta.glob<Partial<Messages>>('./locales/*.json', { eager: true, import: 'default' });

export const languages = Object.entries(modules)
  .map(([path, messages]) => {
    const code = path.match(/([\w-]+)\.json$/)![1];
    return { code, name: messages.language_name || code, rtl: messages.text_direction === 'rtl', messages };
  })
  .sort((a, b) => (a.code === defaultLanguage ? -1 : b.code === defaultLanguage ? 1 : a.name.localeCompare(b.name)));

const available = new Set(languages.map(language => language.code));

const readStoredLanguage = () => {
  try {
    return localStorage.getItem(languageStorageKey);
  } catch {
    return null;
  }
};

// Saved choice first, then the browser's preferred languages, then English.
export const detectLanguage = (): TLanguage => {
  const stored = readStoredLanguage();
  if (stored && available.has(stored)) return stored;

  for (const preferred of navigator.languages ?? [navigator.language]) {
    const exact = preferred.toLowerCase();
    const base = exact.split('-')[0];
    const match = [...available].find(code => code.toLowerCase() === exact) ?? (available.has(base) ? base : undefined);
    if (match) return match;
  }

  return defaultLanguage;
};

export const applyDocumentLanguage = (code: TLanguage) => {
  document.documentElement.lang = code;
  document.documentElement.dir = languages.find(language => language.code === code)?.rtl ? 'rtl' : 'ltr';
};

const initialLanguage = detectLanguage();
applyDocumentLanguage(initialLanguage);

i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: [...available],
  keySeparator: false,
  returnEmptyString: false,
  interpolation: {
    escapeValue: false,
  },
  resources: Object.fromEntries(languages.map(language => [language.code, { translation: language.messages }])),
});

export default i18n;
