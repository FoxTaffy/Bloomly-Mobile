import { isAxiosError } from 'axios';

// Перенос frontend/src/lib/apiError.ts. API отвечает { success: false, error: { code, message } }.

export function apiErrorMessage(e: unknown): string | undefined {
  if (!isAxiosError(e)) return undefined;
  const err = e.response?.data?.error;
  // Часть модулей отвечает плоской строкой { error: 'текст' }.
  return typeof err === 'string' ? err : err?.message;
}

export function apiErrorStatus(e: unknown): number | undefined {
  return isAxiosError(e) ? e.response?.status : undefined;
}

export function apiErrorCode(e: unknown): string | undefined {
  return isAxiosError(e) ? e.response?.data?.error?.code : undefined;
}

/** 404 и 403 на чтении — «не найдено» (web: views/PostView.vue). */
export function isNotFound(e: unknown): boolean {
  const s = apiErrorStatus(e);
  return s === 404 || (s === 403 && apiErrorCode(e) !== 'ACCOUNT_FROZEN');
}
