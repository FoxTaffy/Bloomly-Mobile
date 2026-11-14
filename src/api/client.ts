import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/lib/config';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'x-client': 'mobile' },
});

let getToken: () => string | null = () => null;
let doRefresh: () => Promise<string | null> = async () => null;
let onUnauthorized: () => void = () => {};
let onMaintenance: (active: boolean) => void = () => {};
let onFrozen: (message: string) => void = () => {};

export function configureApiClient(handlers: {
  getToken: () => string | null;
  onRefresh: () => Promise<string | null>;
  onUnauthorized: () => void;
  onMaintenance?: (active: boolean) => void;
  onFrozen?: (message: string) => void;
}) {
  getToken = handlers.getToken;
  doRefresh = handlers.onRefresh;
  onUnauthorized = handlers.onUnauthorized;
  onMaintenance = handlers.onMaintenance ?? onMaintenance;
  onFrozen = handlers.onFrozen ?? onFrozen;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => {
    onMaintenance(false);
    return res;
  },
  async (error: AxiosError) => {
    const code = (error.response?.data as { error?: { code?: string; message?: string } } | undefined)?.error;
    if (error.response?.status === 503 && code?.code === 'MAINTENANCE') {
      onMaintenance(true);
      return Promise.reject(error);
    }
    if (error.response?.status === 403 && code?.code === 'ACCOUNT_FROZEN') {
      onFrozen(code.message ?? '');
      return Promise.reject(error);
    }
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Обновляем сессию только если запрос шёл с токеном: 401 на вход (неверный пароль, TWO_FACTOR_REQUIRED) — не истёкшая сессия
    const hadAuthorization = !!original?.headers?.get?.('Authorization');
    if (error.response?.status === 401 && original && hadAuthorization && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api(original);
      }
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);
