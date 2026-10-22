import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { setSetting } from '../db/indexedDb';
import instance, { applyDocumentLanguage, languages, languageStorageKey, TLanguage, TranslateFn } from '../locale/i18n';

type TState = {
  t: TranslateFn;
  currentLanguage: TLanguage;
  languages: { code: string; name: string }[];
  changeLocale(newLocale: TLanguage): void;
};

// The service worker can't load the translation files, so the few texts it shows in
// notifications are stored for it whenever the language changes.
const savePushTexts = (t: TranslateFn) =>
  setSetting(
    'pushTexts',
    JSON.stringify({
      newMessage: t('push_new_message'),
      openToLoad: t('push_open_to_load'),
      checkContact: t('push_check_contact'),
    }),
  ).catch(() => undefined);

const useLocale = (): TState => {
  const { i18n } = useTranslation('', { i18n: instance });

  const translate: TranslateFn = useCallback((key, params) => i18n.t(key, params), [i18n]);

  const changeLocale = useCallback(
    async (newLocale: TLanguage) => {
      await i18n.changeLanguage(newLocale);
      applyDocumentLanguage(newLocale);
      try {
        localStorage.setItem(languageStorageKey, newLocale);
      } catch {
        // Private mode: the choice lasts for this session only.
      }
    },
    [i18n],
  );

  useEffect(() => {
    savePushTexts(translate);
  }, [i18n.language, translate]);

  const list = useMemo(() => languages.map(({ code, name }) => ({ code, name })), []);

  return useMemo(
    () => ({ t: translate, currentLanguage: i18n.language, languages: list, changeLocale }),
    [changeLocale, i18n.language, list, translate],
  );
};

export default useLocale;
