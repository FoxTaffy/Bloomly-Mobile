import { create } from 'zustand';

/**
 * Токен завершения регистрации (после OAuth или входа аккаунта без даты рождения).
 * Только в памяти, как на вебе: не пишется ни в какое хранилище и не логируется.
 */
interface PendingSignupState {
  token: string | null;
  set: (token: string | null) => void;
  /** Забрать и сбросить. */
  take: () => string | null;
}

export const usePendingSignup = create<PendingSignupState>((set, get) => ({
  token: null,
  set: (token) => set({ token }),
  take: () => {
    const t = get().token;
    set({ token: null });
    return t;
  },
}));
