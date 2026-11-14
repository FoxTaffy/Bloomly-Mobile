import { useCallback, useState } from 'react';
import { submitReport, type ReportTarget } from '@/api/reports';
import { apiErrorCode, apiErrorStatus } from '@/shared/apiError';

export type ReportStatus = 'idle' | 'sending' | 'sent' | 'duplicate' | 'rate' | 'error';

/** Отправка жалобы. Ошибки как в ReportModal.vue: 409/ALREADY_REPORTED, 429, прочее. */
export function useSubmitReport() {
  const [status, setStatus] = useState<ReportStatus>('idle');
  const submit = useCallback(async (body: { targetType: ReportTarget; targetId: string; reason: string }) => {
    setStatus('sending');
    try {
      await submitReport(body);
      setStatus('sent');
    } catch (e) {
      const s = apiErrorStatus(e);
      setStatus(apiErrorCode(e) === 'ALREADY_REPORTED' || s === 409 ? 'duplicate' : s === 429 ? 'rate' : 'error');
    }
  }, []);
  return { submit, status, reset: useCallback(() => setStatus('idle'), []) };
}
