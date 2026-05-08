import ru from './locales/ru.json';
import en from './locales/en.json';

export type Language = 'ru' | 'en';

const STORAGE_KEY = 'adpocalypse_language';
const TRANSLATIONS: Record<Language, Record<string, string>> = { ru, en };

let currentLanguage: Language = 'ru';

export function initI18n(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') {
      currentLanguage = saved;
      return;
    }
  } catch { /* ignore */ }
  currentLanguage = navigator.language.startsWith('ru') ? 'ru' : 'en';
}

export function t(key: string, params?: Record<string, string | number>): string {
  let result = TRANSLATIONS[currentLanguage][key] ?? TRANSLATIONS['en'][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
  }
  return result;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
}

export function getLanguage(): Language {
  return currentLanguage;
}
