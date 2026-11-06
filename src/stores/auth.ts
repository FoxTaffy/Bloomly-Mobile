import { create } from 'zustand';
import { setupApiAuth } from '@/api/client';
import { refreshTokenStore } from '@/lib/storage';

type AuthState = {
  accessToken: string | null;
  ready: boolean;
  setSession: (access: string, refresh?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  ready: false,
  setSession: async (access, refresh) => {
    if (refresh) await refreshTokenStore.set(refresh);
    set({ accessToken: access });
  },
  signOut: async () => {
    await refreshTokenStore.clear();
    set({ accessToken: null });
  },
}));

setupApiAuth(() => useAuth.getState().accessToken);
