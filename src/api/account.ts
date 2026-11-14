import { api } from './client';

/** Что сервер требует для подтверждения удаления: пароль и/или код (приложение-аутентификатор или письмо). */
export interface DeletionRequirements {
  password: boolean;
  code: 'totp' | 'email' | null;
}

export async function fetchDeletionRequirements(): Promise<DeletionRequirements> {
  const res = await api.get('/users/me/account/requirements');
  return res.data.data as DeletionRequirements;
}

export async function sendDeletionCode(): Promise<void> {
  await api.post('/users/me/account/code');
}

export async function deleteMyAccount(body: { password?: string; code?: string }): Promise<void> {
  await api.delete('/users/me/account', { data: body });
}
