export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

const themeStorageKey = 'mailchat.theme';

export const getStoredTheme = (): ThemePreference => {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
};

export const saveTheme = (theme: ThemePreference) => {
  try {
    if (theme === 'system') localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Private mode: the choice lasts for this session only.
  }
};

export const systemThemeQuery = () => window.matchMedia('(prefers-color-scheme: light)');

export const getSystemTheme = (): ThemeMode => (systemThemeQuery().matches ? 'light' : 'dark');
