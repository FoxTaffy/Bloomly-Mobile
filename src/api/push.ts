import type { AxiosRequestConfig } from 'axios';
import { api } from './client';

export type PushPlatform = 'ios' | 'android';

export async function registerExpoToken(token: string, platform: PushPlatform): Promise<void> {
  await api.post('/push/expo-token', { token, platform });
}

export async function unregisterExpoToken(token: string): Promise<void> {
  // _retry: при 401 не запускать refresh — отвязка вызывается из logout, иначе refresh и logout зациклятся
  await api.post('/push/expo-unsubscribe', { token }, { _retry: true } as AxiosRequestConfig);
}
