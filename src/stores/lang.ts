import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { isLang, langFromLocaleCode, translate, type Lang, type MessageKey, type Params } from '@/shared/i18n';

// Язык не секрет: AsyncStorage, а не SecureStore.
const LANG_KEY = 'bloomly_lang';

interface LangState {
  lang: Lang;
  /** true, если язык выбран вручную (иначе следуем языку устройства). */
  manual: boolean;
  hydrate: () => Promise<void>;
  setLang: (lang: Lang) => Promise<void>;
  /** Вернуться к языку устройства. */
  useDeviceLang: () => Promise<void>;
}

const deviceLang = (): Lang => langFromLocaleCode(getLocales()[0]?.languageCode);

export const useLang = create<LangState>((set) => ({
  lang: deviceLang(),
  manual: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANG_KEY);
      if (isLang(stored)) set({ lang: stored, manual: true });
    } catch {
      // хранилище недоступно: остаёмся на языке устройства
    }
  },
  setLang: async (lang) => {
    set({ lang, manual: true });
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch {
      // выбор действует до перезапуска
    }
  },
  useDeviceLang: async () => {
    set({ lang: deviceLang(), manual: false });
    try {
      await AsyncStorage.removeItem(LANG_KEY);
    } catch {
      // ignore
    }
  },
}));

/** Перевод вне компонентов (ошибки, уведомления). В компонентах — useT(), чтобы экран обновлялся при смене языка. */
export function tNow(key: MessageKey, params?: Params): string {
  return translate(useLang.getState().lang, key, params);
}
