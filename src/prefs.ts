import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from './types';

const PREFS_KEY = 'math_quiz_prefs_v1';

export type AppPrefs = {
  language?: AppLanguage;
};

export async function loadPrefs(): Promise<AppPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AppPrefs;
    if (parsed.language === 'ru' || parsed.language === 'en') {
      return { language: parsed.language };
    }
    return {};
  } catch {
    return {};
  }
}

export async function savePrefs(prefs: AppPrefs): Promise<void> {
  const current = await loadPrefs();
  const next: AppPrefs = { ...current, ...prefs };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
}
