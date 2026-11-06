import axios from 'axios';
import { Platform } from 'react-native';
import { getDeviceId } from '@/lib/storage';

// Бэкенд один на веб и мобильное приложение. Для локальной разработки: EXPO_PUBLIC_API_URL=http://<ip>:8080/api
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://bloomly.fun/api';

// Колбэки задаёт stores/auth, чтобы не было цикла api → auth → api (тот же приём, что в web api.ts).
let getToken: () => string | null = () => null;
export function setupApiAuth(fn: () => string | null) {
  getToken = fn;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-Id'] = await getDeviceId();
  config.headers['X-Platform'] = Platform.OS;
  return config;
});
// TODO(auth): single-flight refresh по 401 через /auth/refresh (см. docs/ARCHITECTURE.md, раздел «Авторизация»).
