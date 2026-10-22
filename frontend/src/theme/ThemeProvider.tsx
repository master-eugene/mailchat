import React, { createContext, FC, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import {
  getStoredTheme,
  getSystemTheme,
  saveTheme,
  systemThemeQuery,
  type ThemeMode,
  type ThemePreference,
} from './themeStorage';

type ThemeContextValue = {
  // What the user picked ("system" follows the phone's light/dark setting).
  preference: ThemePreference;
  // What is actually shown.
  theme: ThemeMode;
  setTheme: (theme: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme);
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    const query = systemThemeQuery();
    const update = () => setSystemTheme(getSystemTheme());
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f2f5f9' : '#0f1621');
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setPreference(newTheme);
    saveTheme(newTheme);
  }, []);

  const value = useMemo(() => ({ preference, theme, setTheme }), [preference, setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
