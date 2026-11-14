import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NsfwMode } from '@/shared/api-types';
import { useSession } from '@/stores/session';

// Предпочтение, а не секрет: AsyncStorage. Ключ как на вебе (bloomly_nsfw_mode).
const MODE_KEY = 'bloomly_nsfw_mode';
const MODES: NsfwMode[] = ['hide', 'blur', 'show'];

interface PreferenceState {
  mode: NsfwMode;
  setMode: (m: NsfwMode) => void;
  hydrate: () => Promise<void>;
}

export const useNsfwPreference = create<PreferenceState>((set) => ({
  mode: 'hide',
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(MODE_KEY, mode).catch(() => {
      // выбор действует до перезапуска
    });
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(MODE_KEY);
      if (stored && (MODES as string[]).includes(stored)) set({ mode: stored as NsfwMode });
    } catch {
      // остаёмся на 'hide'
    }
  },
}));

/** Перенос web composables/useNsfwMode: несовершеннолетним и гостям всегда 'hide', что бы ни было сохранено. */
export function useNsfwMode() {
  const isAdult = useSession((s) => s.user?.is_adult === true);
  const { mode, setMode } = useNsfwPreference();
  const effective: NsfwMode = isAdult ? mode : 'hide';
  return {
    nsfwMode: effective,
    /** Выбранное, даже если сейчас не применяется (для экрана настроек). */
    preferredMode: mode,
    canUseNsfw: isAdult,
    setNsfwMode: (m: NsfwMode) => {
      if (m !== 'hide' && !isAdult) return;
      setMode(m);
    },
  };
}
