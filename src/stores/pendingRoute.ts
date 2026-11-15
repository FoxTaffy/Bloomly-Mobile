import { create } from 'zustand';

/**
 * Ссылка, пришедшая без сессии (например, на пост), открывается после входа. Только в памяти: при перезапуске теряется,
 * и тогда приложение просто откроет главный экран. Не сохраняется на диск, потому что в ссылке может быть персональный адрес.
 */
interface PendingRouteState {
  path: string | null;
  set: (path: string | null) => void;
  take: () => string | null;
}

export const usePendingRoute = create<PendingRouteState>((set, get) => ({
  path: null,
  set: (path) => set({ path }),
  take: () => {
    const p = get().path;
    set({ path: null });
    return p;
  },
}));
