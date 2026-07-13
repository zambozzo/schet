import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';
import { loadPrefs, savePrefs } from '../prefs';
import type { AppLanguage } from '../types';
import type { TranslationKey } from './keys';
import { en } from './en';
import { ru } from './ru';

const dictionaries: Record<AppLanguage, Record<TranslationKey, string>> = {
  ru,
  en,
};

export function deviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase() || '';
    if (code.startsWith('ru')) return 'ru';
  } catch {
    // ignore
  }
  return 'en';
}

export function resolveLanguage(prefsLanguage?: AppLanguage | null): AppLanguage {
  if (prefsLanguage === 'ru' || prefsLanguage === 'en') return prefsLanguage;
  return deviceLanguage();
}

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

type I18nContextValue = {
  language: AppLanguage;
  ready: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => deviceLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await loadPrefs();
      if (cancelled) return;
      setLanguageState(resolveLanguage(prefs.language));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLanguageState(next);
    await savePrefs({ language: next });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const dict = dictionaries[language] || dictionaries.en;
      return format(dict[key] ?? dictionaries.en[key] ?? key, params);
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, ready, setLanguage, t }),
    [language, ready, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
