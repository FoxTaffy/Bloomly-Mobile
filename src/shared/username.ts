// Правила @ника: зеркало frontend/src/lib/usernameRules.ts (серверные: backend/src/lib/usernamePolicy.ts, зарезервированные слова проверяет сервер).
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/** Ввод → вид, в котором ник хранится: нижний регистр, пробелы → «_», только a–z, 0–9 и «_». */
export function normalizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, USERNAME_MAX);
}

/** Нарушена форма ника: начало, конец, «__», мало букв. Длину проверяют отдельно. */
export function usernameBreaksRules(u: string): boolean {
  if (!u) return false;
  return (
    !/^[a-z]/.test(u) ||
    u.endsWith('_') ||
    u.includes('__') ||
    (u.match(/[a-z]/g) ?? []).length < 2 ||
    new Set(u.replace(/_/g, '')).size < 2
  );
}

export const usernameValid = (u: string): boolean => u.length >= USERNAME_MIN && u.length <= USERNAME_MAX && !usernameBreaksRules(u);
