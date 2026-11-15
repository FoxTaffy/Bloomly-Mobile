import type { TicketStatus, TicketType } from '@/api/support';
import type { MessageKey } from './i18n';

export const TICKET_TYPES: readonly TicketType[] = ['bug', 'feedback', 'question', 'other'];
export const TYPE_KEY: Record<TicketType, MessageKey> = { bug: 'helpTypeOptBug', feedback: 'helpTypeOptFeedback', question: 'helpTypeOptQuestion', other: 'helpTypeOptOther' };
export const STATUS_KEY: Record<TicketStatus, MessageKey> = {
  open: 'helpStatusOpen', in_progress: 'helpStatusInProgress', resolved: 'helpStatusResolved', closed: 'helpStatusClosed', confirmed: 'helpStatusConfirmed',
  fixed: 'helpStatusFixed', planned: 'helpStatusPlanned', implemented: 'helpStatusImplemented', duplicate: 'helpStatusDuplicate',
};

/** Форма обращения: тема от 3 до 150 символов, текст от 10 (web: SupportTicketForm.canSubmit). */
export const SUBJECT_MAX = 150;
export const canSubmitTicket = (subject: string, message: string): boolean => subject.trim().length >= 3 && message.trim().length >= 10;
