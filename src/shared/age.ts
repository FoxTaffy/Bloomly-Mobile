// Возраст и согласия. Порт frontend/src/composables/useAgeConsent.ts и components/DateInput.vue.
// Пороги совпадают с backend/src/lib/legal.ts. Без React.

export const MIN_AGE = 13;
export const PARENTAL_CONSENT_AGE = 16;
export const ADULT_AGE = 18;

export type DateParts = { day: string; month: string; year: string };

export type DateParse =
  | { state: 'empty' }
  | { state: 'incomplete' }
  | { state: 'invalid'; reason: 'range' | 'overflow' | 'future' }
  | { state: 'valid'; value: string };

/** Три поля даты → ISO (YYYY-MM-DD). `max` — ISO верхней границы (сегодня). */
export function parseDateParts(p: DateParts, max?: string): DateParse {
  if (!p.day && !p.month && !p.year) return { state: 'empty' };
  if (p.day.length !== 2 || p.month.length !== 2 || p.year.length !== 4) return { state: 'incomplete' };
  const d = Number(p.day), m = Number(p.month), y = Number(p.year);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return { state: 'invalid', reason: 'range' };
  const candidate = `${p.year}-${p.month}-${p.day}`;
  const dt = new Date(`${candidate}T00:00:00.000Z`);
  // Отбрасываем переполнение (31.02): компоненты UTC должны совпасть
  if (dt.getUTCDate() !== d || dt.getUTCMonth() + 1 !== m || dt.getUTCFullYear() !== y) return { state: 'invalid', reason: 'overflow' };
  if (max && candidate > max) return { state: 'invalid', reason: 'future' };
  return { state: 'valid', value: candidate };
}

export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** Полных лет на `now` (как на сервере). null — даты нет. */
export function ageOf(birthDate: string | null, now = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years--;
  return years;
}

export interface AgeConsentState {
  birthDate: string | null;
  birthDateInvalid: boolean;
  parentEmail: string;
  consentPolicy: boolean;
  consentAge: boolean;
  consentMarketing: boolean;
}

export const emptyAgeConsent = (): AgeConsentState => ({
  birthDate: null, birthDateInvalid: false, parentEmail: '', consentPolicy: false, consentAge: false, consentMarketing: false,
});

export type AgeConsentError = 'birthDate' | 'tooYoung' | 'parentEmail' | 'policy' | 'age';

export const isTooYoung = (s: AgeConsentState) => { const a = ageOf(s.birthDate); return a !== null && a < MIN_AGE; };
export const needsParent = (s: AgeConsentState) => { const a = ageOf(s.birthDate); return a !== null && a >= MIN_AGE && a < PARENTAL_CONSENT_AGE; };

/** Первая причина, по которой форму нельзя отправлять; null — можно. */
export function ageConsentError(s: AgeConsentState): AgeConsentError | null {
  if (!s.birthDate || s.birthDateInvalid) return 'birthDate';
  if (isTooYoung(s)) return 'tooYoung';
  if (needsParent(s) && !s.parentEmail.trim()) return 'parentEmail';
  if (!s.consentPolicy) return 'policy';
  if (!s.consentAge) return 'age';
  return null;
}

/** Поля запроса к API: имена совпадают с телом /auth/register и /auth/oauth/complete. */
export function ageConsentPayload(s: AgeConsentState) {
  return {
    birthDate: s.birthDate as string,
    ...(needsParent(s) ? { parentEmail: s.parentEmail.trim() } : {}),
    consent_policy: s.consentPolicy,
    consent_age: s.consentAge,
    consent_marketing: s.consentMarketing,
  };
}
export type AgeConsentPayload = ReturnType<typeof ageConsentPayload>;

export type DateField = 'day' | 'month' | 'year';

/** Порядок полей даты по обычаю локали (веб: DATE_FIELD_ORDER): ru — ДД ММ ГГГГ, en-US — ММ ДД ГГГГ. */
export function dateFieldOrder(locale: string): DateField[] {
  try {
    const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date(2020, 0, 15));
    const order = parts.filter((p): p is Intl.DateTimeFormatPart & { type: DateField } => p.type === 'day' || p.type === 'month' || p.type === 'year').map((p) => p.type);
    if (order.length === 3) return order;
  } catch {
    // Intl недоступен — порядок по умолчанию
  }
  return ['day', 'month', 'year'];
}
