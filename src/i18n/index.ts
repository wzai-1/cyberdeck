import { en } from './en';
import { zh } from './zh';

export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'cyberdeck_lang';

const TRANSLATIONS: Record<Lang, Record<string, string>> = { en, zh };

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

let _lang: Lang = (safeGet(STORAGE_KEY) as Lang) === 'zh' ? 'zh' : 'en';

export function currentLang(): Lang {
  return _lang;
}

export function t(key: string): string {
  return TRANSLATIONS[_lang][key] ?? TRANSLATIONS['en'][key] ?? key;
}

export function setLanguage(lang: Lang): void {
  _lang = lang;
  safeSet(STORAGE_KEY, lang);
  try {
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  } catch { /* node/test env */ }
}
