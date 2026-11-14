import { create } from 'zustand';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { api, configureApiClient } from '@/api/client';
import { unregisterPush } from '@/lib/push';
import { useAppStatus } from './appStatus';
import type { AuthUser } from '@/shared/api-types';
import type { AgeConsentPayload } from '@/shared/age';
import { completeSignup, saveOnboarding } from '@/api/auth';

const ACCESS_KEY = 'bloomly_access_token';
const REFRESH_KEY = 'bloomly_refresh_token';
const USER_KEY = 'bloomly_user';

interface SessionState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, refreshToken: string | undefined, user: AuthUser) => Promise<void>;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, consent: AgeConsentPayload) => Promise<void>;
  /** Второй шаг входа: код второго фактора (POST /auth/login/2fa/verify). */
  verifyTwoFactor: (mfaToken: string, code: string, remember?: boolean) => Promise<void>;
  /** Повторная отправка кода (метод email). */
  resendTwoFactor: (mfaToken: string) => Promise<void>;
  /** Дата рождения и согласия после OAuth / входа без даты рождения. 'parental-pending' — ждём согласия родителя. */
  completeSignup: (signupToken: string, consent: AgeConsentPayload) => Promise<'ok' | 'parental-pending'>;
  /** Сохранить шаг профиля (имя, дата рождения, симпатии) или пропустить. */
  finishOnboarding: (data: { display_name?: string; birth_date?: string; likes?: string[]; dislikes?: string[] }) => Promise<void>;
  verifyEmail: (email: string, code: string, remember?: boolean) => Promise<void>;
  resendOtp: (email: string, purpose: 'register' | 'reset' | 'unfreeze') => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  loginWithToken: (token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
}

export const useSession = create<SessionState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isHydrated: false,
  isAuthenticated: false,

  hydrate: async () => {
    try {
      const [token, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
      set({ token, refreshToken, user, isAuthenticated: !!token && !!user, isHydrated: true });
      if (refreshToken) {
        await get().refresh();
      }
    } catch {
      // Хранилище недоступно или данные повреждены: начинаем как гость, а не остаёмся на сплэше
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false, isHydrated: true });
    }
  },

  setSession: async (token, refreshToken, user) => {
    const nextRefresh = refreshToken ?? get().refreshToken;
    set({ token, refreshToken: nextRefresh, user, isAuthenticated: true });
    await SecureStore.setItemAsync(ACCESS_KEY, token);
    if (nextRefresh) await SecureStore.setItemAsync(REFRESH_KEY, nextRefresh);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  login: async (email, password, remember = true) => {
    const res = await api.post('/auth/login', { email, password, remember });
    const { token, user, refreshToken } = res.data.data;
    await get().setSession(token, refreshToken, user);
  },

  register: async (username, email, password, consent) => {
    await api.post('/auth/register', { username, email, password, ...consent });
  },

  completeSignup: async (signupToken, consent) => {
    const result = await completeSignup(signupToken, consent);
    if (result.kind === 'parental-pending') return 'parental-pending';
    await get().setSession(result.token, result.refreshToken, result.user);
    return 'ok';
  },

  finishOnboarding: async (data) => {
    const patch = await saveOnboarding({ onboarding_done: true, ...data });
    const user = get().user;
    if (!user) return;
    let next = { ...user, ...patch, onboarding_done: true } as AuthUser;
    // Дата рождения меняет is_adult (режим NSFW): берём пользователя с сервера, как после входа
    try {
      const me = await api.get('/auth/me');
      next = { ...next, ...(me.data.data.user as AuthUser), onboarding_done: true };
    } catch {
      // оставляем локально объединённого
    }
    set({ user: next });
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
  },

  verifyTwoFactor: async (mfaToken, code, remember = true) => {
    const res = await api.post('/auth/login/2fa/verify', { mfaToken, code, remember });
    const { token, user, refreshToken } = res.data.data;
    await get().setSession(token, refreshToken, user);
  },

  resendTwoFactor: async (mfaToken) => {
    await api.post('/auth/login/2fa/resend', { mfaToken });
  },

  verifyEmail: async (email, code, remember = true) => {
    const res = await api.post('/auth/verify-email', { email, code, remember });
    const { token, user, refreshToken } = res.data.data;
    await get().setSession(token, refreshToken, user);
  },

  resendOtp: async (email, purpose) => {
    await api.post('/auth/resend-otp', { email, purpose });
  },

  forgotPassword: async (email) => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (email, code, password) => {
    await api.post('/auth/reset-password', { email, code, password });
  },

  loginWithToken: async (token, refreshToken) => {
    const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    await get().setSession(token, refreshToken, res.data.data.user);
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    await unregisterPush();
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // best-effort — clear local session regardless
    }
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
    // Кэш картинок общий для приложения: закрытые файлы одного аккаунта не должны остаться для следующего
    Image.clearMemoryCache().catch(() => {});
    Image.clearDiskCache().catch(() => {});
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  },

  refresh: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return null;
    try {
      const res = await api.post('/auth/refresh', { refreshToken });
      const { token, user, refreshToken: newRefresh } = res.data.data;
      await get().setSession(token, newRefresh, user);
      return token as string;
    } catch {
      await get().logout();
      return null;
    }
  },
}));

configureApiClient({
  getToken: () => useSession.getState().token,
  onRefresh: () => useSession.getState().refresh(),
  onUnauthorized: () => {
    useSession.getState().logout();
  },
  onMaintenance: (active) => useAppStatus.getState().setMaintenance(active),
  onFrozen: (message) => useAppStatus.getState().setFrozen(message),
});
