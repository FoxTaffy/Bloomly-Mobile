const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://bloomly.fun';

/** Адрес сайта: публичные страницы (условия, политика, DMCA) открываются отсюда. */
export const WEB_URL = API_BASE;

export const API_URL = `${API_BASE}/api`;
export const WS_URL = `${API_BASE.replace(/^http/, 'ws')}/api/`;
