import { en } from './en';
import { ru, type MessageKey } from './ru';

// Язык интерфейса. Словари скопированы из веба (frontend/src/locales) по совпадающим ключам;
// ключи `m*` — только мобильные (русский текст, перевода на веб-аналоге нет). Нет перевода → русский.
export const LANGS = ['ru', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export type { MessageKey };

export const LANG_LABEL: Record<Lang, string> = { ru: 'Русский', en: 'English' };
/** Локаль для Intl / toLocaleString. */
export const LANG_LOCALE: Record<Lang, string> = { ru: 'ru-RU', en: 'en-US' };

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

/** Код языка устройства («ru-RU», «en») → язык приложения. Как на вебе: языки бывшего СССР → русский, иначе английский. */
export function langFromLocaleCode(code?: string | null): Lang {
  const base = (code ?? '').toLowerCase().split(/[-_]/)[0];
  if (base === 'ru') return 'ru';
  if (['kk', 'uz', 'ky', 'tg', 'tk', 'be', 'uk', 'hy', 'az', 'ka', 'mo', 'tt', 'ba', 'ce'].includes(base)) return 'ru';
  return 'en';
}

export type Params = Record<string, string | number>;

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const raw = (lang === 'en' ? (en as Partial<Record<MessageKey, string>>)[key] : undefined) ?? ru[key];
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}
