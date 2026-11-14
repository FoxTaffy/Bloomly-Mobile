import { create } from 'zustand';
import type { NsfwMode } from '@/shared/api-types';
import { useSession } from '@/stores/session';

// Предпочтение пока без экрана настроек и без хранилища: по умолчанию 'hide'.
const usePreference = create<{ mode: NsfwMode; setMode: (m: NsfwMode) => void }>((set) => ({
  mode: 'hide',
  setMode: (mode) => set({ mode }),
}));

/** Перенос web composables/useNsfwMode: несовершеннолетним и гостям всегда 'hide'. */
export function useNsfwMode() {
  const isAdult = useSession((s) => s.user?.is_adult === true);
  const { mode, setMode } = usePreference();
  const effective: NsfwMode = isAdult ? mode : 'hide';
  return {
    nsfwMode: effective,
    canUseNsfw: isAdult,
    setNsfwMode: (m: NsfwMode) => {
      if (m !== 'hide' && !isAdult) return;
      setMode(m);
    },
  };
}
