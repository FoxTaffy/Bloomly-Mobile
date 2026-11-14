import { useCallback, useState } from 'react';
import { ageConsentError, ageConsentPayload, emptyAgeConsent, isTooYoung, needsParent, type AgeConsentState } from '@/shared/age';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/shared/i18n';

const ERROR_KEY: Record<NonNullable<ReturnType<typeof ageConsentError>>, MessageKey> = {
  birthDate: 'ageConsentErrBirthDate',
  tooYoung: 'ageConsentTooYoung',
  parentEmail: 'ageConsentErrParentEmail',
  policy: 'ageConsentErrPolicy',
  age: 'ageConsentErrAge',
};

/** Состояние формы «дата рождения + согласия» (веб: composables/useAgeConsent.ts). */
export function useAgeConsent() {
  const { t } = useT();
  const [state, setState] = useState<AgeConsentState>(emptyAgeConsent);
  const patch = useCallback((p: Partial<AgeConsentState>) => setState((s) => ({ ...s, ...p })), []);
  const err = ageConsentError(state);
  return {
    state,
    patch,
    tooYoung: isTooYoung(state),
    needsParent: needsParent(state),
    /** Текст первой ошибки или null, если форму можно отправлять. */
    validationError: err ? t(ERROR_KEY[err]) : null,
    payload: () => ageConsentPayload(state),
  };
}
export type AgeConsentForm = ReturnType<typeof useAgeConsent>;
