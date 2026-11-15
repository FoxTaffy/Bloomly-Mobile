import { api } from './client';

// Обращения в поддержку (веб: composables/useSupportTickets.ts, components/support/*).

export type TicketType = 'bug' | 'feedback' | 'question' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'confirmed' | 'fixed' | 'planned' | 'implemented' | 'duplicate';

export interface TicketMessage {
  id: string;
  sender_type: 'user' | 'admin' | 'external';
  body: string;
  created_at?: string;
}

export interface SupportTicket {
  id: string;
  type: TicketType;
  status: TicketStatus;
  subject: string;
  created_at: string;
  messages: TicketMessage[];
}

export async function fetchTickets(): Promise<SupportTicket[]> {
  const res = await api.get('/support/tickets');
  return (res.data.data.tickets ?? []) as SupportTicket[];
}

export interface NewTicket {
  type: TicketType;
  subject: string;
  message: string;
  contact_email?: string;
  /** Для багов: с какого устройства. */
  device?: 'mobile' | 'tablet';
}

export async function createTicket(body: NewTicket): Promise<SupportTicket> {
  const res = await api.post('/support/tickets', { ...body, attachment_urls: [] });
  return res.data.data.ticket as SupportTicket;
}

export async function replyTicket(id: string, message: string): Promise<{ message: TicketMessage; status: TicketStatus }> {
  const res = await api.post(`/support/tickets/${id}/messages`, { message, attachment_urls: [] });
  return { message: res.data.data.message as TicketMessage, status: res.data.data.status as TicketStatus };
}
