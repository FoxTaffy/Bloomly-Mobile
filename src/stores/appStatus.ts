import { create } from 'zustand';

/** Глобальные состояния сервера (web: api.ts — maintenanceActive и onFrozen). */
interface AppStatusState {
  maintenance: boolean;
  /** Сообщение о заморозке аккаунта; null — аккаунт не заморожен. */
  frozenMessage: string | null;
  setMaintenance: (v: boolean) => void;
  setFrozen: (message: string | null) => void;
}

export const useAppStatus = create<AppStatusState>((set) => ({
  maintenance: false,
  frozenMessage: null,
  setMaintenance: (maintenance) => set((s) => (s.maintenance === maintenance ? s : { maintenance })),
  setFrozen: (frozenMessage) => set({ frozenMessage }),
}));
