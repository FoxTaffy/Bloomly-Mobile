import { api } from './client';

export type ReportTarget = 'post' | 'group' | 'listing' | 'message' | 'user';

/** Жалоба модераторам (веб: components/ReportModal.vue → POST /admin/reports). */
export async function submitReport(body: { targetType: ReportTarget; targetId: string; reason: string }) {
  await api.post('/admin/reports', body);
}
