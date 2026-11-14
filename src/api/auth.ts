import { api } from './client';
import type { AuthUser } from '@/shared/api-types';
import type { AgeConsentPayload } from '@/shared/age';

export type OnboardingResult =
  | { kind: 'ok'; token: string; refreshToken?: string; user: AuthUser }
  | { kind: 'parental-pending' };

/** Завершение регистрации: дата рождения и согласия, аккаунт создаётся здесь (веб: auth store completeOAuthOnboarding). */
export async function completeSignup(signupToken: string, consent: AgeConsentPayload): Promise<OnboardingResult> {
  const res = await api.post('/auth/oauth/complete', { signupToken, ...consent });
  const d = res.data.data;
  if (d.parentalConsentPending) return { kind: 'parental-pending' };
  return { kind: 'ok', token: d.token, refreshToken: d.refreshToken, user: d.user };
}

/** Шаг профиля после входа (веб: OnboardingView saveProfile → PATCH /users/me). */
export async function saveOnboarding(body: {
  onboarding_done: true;
  display_name?: string;
  birth_date?: string;
  likes?: string[];
  dislikes?: string[];
}): Promise<Partial<AuthUser>> {
  const res = await api.patch('/users/me', body);
  return (res.data.data?.user ?? {}) as Partial<AuthUser>;
}
