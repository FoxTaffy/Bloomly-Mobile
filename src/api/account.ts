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

// ── Безопасность (веб: components/settings/SettingsSecuritySection.vue, stores/auth.ts) ────────────

export interface DeviceSession {
  id: string;
  device_name: string | null;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
  current: boolean;
}

export async function fetchSessions(): Promise<DeviceSession[]> {
  const res = await api.get('/auth/sessions');
  return (res.data.data.sessions ?? []) as DeviceSession[];
}

export async function revokeSession(id: string) {
  await api.delete(`/auth/sessions/${id}`);
}

export async function revokeOtherSessions() {
  await api.delete('/auth/sessions/other');
}

/** Смена пароля; у аккаунта без пароля (вход через соцсеть) текущий пароль не нужен. */
export async function changePassword(newPassword: string, currentPassword?: string) {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}

/** Шаг 1: код уходит на текущую почту. Шаг 2: код + новая почта. */
export async function requestEmailChange() {
  await api.post('/auth/change-email/request');
}

export async function confirmEmailChange(code: string, newEmail: string): Promise<string> {
  const res = await api.post('/auth/change-email/confirm', { code, newEmail });
  return res.data.data.email as string;
}

/** TOTP: секрет и QR (data-URL картинки) для приложения-аутентификатора. */
export async function totpSetup(): Promise<{ secret: string; qrDataUrl: string }> {
  const res = await api.post('/auth/2fa/totp/setup');
  return res.data.data;
}

export async function totpConfirm(code: string) {
  await api.post('/auth/2fa/totp/confirm', { code });
}

export async function email2faEnable() {
  await api.post('/auth/2fa/email/enable');
}

export async function email2faConfirm(code: string) {
  await api.post('/auth/2fa/email/confirm', { code });
}

export async function disableTwoFactor(password?: string) {
  await api.post('/auth/2fa/disable', { password });
}

/** Разморозка аккаунта: код на почту → подтверждение возвращает вход (токены). */
export async function requestUnfreeze(email: string) {
  await api.post('/auth/unfreeze/request', { email });
}

export async function verifyUnfreeze(email: string, code: string): Promise<{ token: string; refreshToken?: string }> {
  const res = await api.post('/auth/unfreeze/verify', { email, code, remember: true });
  return { token: res.data.data.token, refreshToken: res.data.data.refreshToken };
}
