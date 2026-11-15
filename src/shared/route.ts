// Куда вести пользователя при входе в приложение и по неизвестной ссылке. Условия повторяют Stack.Protected в app/_layout.tsx
// и app/(auth)/_layout.tsx: если изменить guard там, изменить здесь. Без React, проверяется scripts/check-route.mjs.

export type EntryRoute = '/(tabs)/feed' | '/(auth)/login' | '/(auth)/onboarding';

export interface EntryState {
  /** Сессия восстановлена из хранилища (до этого маршрут неизвестен). */
  hydrated: boolean;
  authenticated: boolean;
  /** Вошёл, но онбординг не пройден (user.onboarding_done === false, как в _layout). */
  needsOnboarding: boolean;
}

/** null — состояние ещё не известно: экран остаётся на сплэше, редиректа нет. */
export function entryRoute(s: EntryState): EntryRoute | null {
  if (!s.hydrated) return null;
  if (!s.authenticated) return '/(auth)/login';
  if (s.needsOnboarding) return '/(auth)/onboarding';
  return '/(tabs)/feed';
}

/** Адреса, которые открываются только после входа. Ссылка на них без сессии запоминается и открывается после входа. */
const PROTECTED_PREFIXES = ['/post/', '/profile/', '/groups/', '/events/', '/messages/', '/notifications', '/settings'];

export function isProtectedTarget(path: string): boolean {
  const clean = path.split(/[?#]/)[0];
  return PROTECTED_PREFIXES.some((p) => clean === p.replace(/\/$/, '') || clean.startsWith(p));
}
