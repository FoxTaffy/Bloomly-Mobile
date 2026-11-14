import { create } from 'zustand';

/**
 * Незавершённый вход с двухфакторной проверкой: токен второго шага, способ и параметры входа.
 * Только в памяти, как на вебе (не пишется в хранилище, не логируется).
 */
export interface PendingMfa {
  mfaToken: string;
  /** Способ второго фактора с сервера: 'totp' | 'email'; другое значение показываем как неподдерживаемое. */
  method: string | null;
  email: string;
  remember: boolean;
}

interface PendingMfaState {
  pending: PendingMfa | null;
  set: (p: PendingMfa | null) => void;
}

export const usePendingMfa = create<PendingMfaState>((set) => ({ pending: null, set: (pending) => set({ pending }) }));
