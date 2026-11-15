import { api } from './client';
import { attachMyVote } from './posts';
import type { Group, GroupEvent, EventAttendee, Post } from '@/shared/api-types';

export async function fetchMyGroups(): Promise<Group[]> {
  const res = await api.get('/groups/me');
  // Сервер отдаёт строки членства, сама группа лежит во вложенном `group`.
  return ((res.data.data.memberships ?? []) as { group: Group }[]).map((m) => m.group);
}

export async function fetchRecommendedGroups(): Promise<Group[]> {
  const res = await api.get('/groups/discover');
  return (res.data.data.groups ?? []) as Group[];
}

export async function searchGroups(q: string, page = 1): Promise<Group[]> {
  const res = await api.get('/groups/search', { params: { q, limit: 20, page } });
  return res.data.data.groups as Group[];
}

export async function fetchGroup(slugOrId: string): Promise<Group> {
  const res = await api.get(`/groups/${slugOrId}`);
  return res.data.data.group as Group;
}

export async function fetchGroupPosts(groupId: string, page = 1): Promise<Post[]> {
  const res = await api.get(`/groups/${groupId}/posts`, { params: { page, limit: GROUP_PAGE_SIZE } });
  // Сервер отдаёт строки GroupPost, сам пост лежит в `post`
  const posts = ((res.data.data.posts ?? []) as { post: Post }[]).map((row) => row.post).filter(Boolean);
  return attachMyVote(posts);
}

export const GROUP_PAGE_SIZE = 20;

/** Моё членство: роль в группе (веб: stores/groups.ts loadMyGroups). */
export interface GroupMembership {
  group_id: string;
  role: string;
  group: Group;
}

export async function fetchMyMemberships(): Promise<GroupMembership[]> {
  const res = await api.get('/groups/me');
  return (res.data.data.memberships ?? []) as GroupMembership[];
}

/** pending: true — у закрытой группы вместо вступления ушла заявка. */
export async function joinGroupRequest(id: string, message?: string): Promise<{ pending: boolean }> {
  const res = await api.post(`/groups/${id}/join`, message ? { message } : {});
  return { pending: !!res.data.data?.pending };
}

export async function fetchMyJoinRequest(id: string): Promise<boolean> {
  const res = await api.get(`/groups/${id}/join-request`);
  return !!res.data.data?.pending;
}

export async function cancelJoinRequest(id: string) {
  await api.delete(`/groups/${id}/join-request`);
}

export interface GroupMember {
  user_id: string;
  role: string;
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  customRole?: { id: string; name: string; color: string | null } | null;
}

export async function fetchGroupMembers(id: string, page = 1): Promise<GroupMember[]> {
  const res = await api.get(`/groups/${id}/members`, { params: { page, limit: GROUP_PAGE_SIZE } });
  return (res.data.data.members ?? []) as GroupMember[];
}

export async function fetchGroupEvents(id: string): Promise<GroupEvent[]> {
  const res = await api.get(`/groups/${id}/events`, { params: { limit: 20 } });
  return (res.data.data.events ?? []) as GroupEvent[];
}

export interface GroupReview {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  author: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

export async function fetchGroupReviews(id: string): Promise<{ reviews: GroupReview[]; average: number; total: number }> {
  const res = await api.get(`/groups/${id}/reviews`, { params: { page: 1 } });
  const d = res.data.data;
  return { reviews: d.reviews ?? [], average: d.average ?? 0, total: d.total ?? 0 };
}

export interface GroupInvite {
  id: string;
  created_at: string;
  group: Group;
  inviter: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

export async function fetchMyInvites(nsfw: string): Promise<GroupInvite[]> {
  const res = await api.get('/groups/invites/me', { params: { nsfw } });
  return (res.data.data.invites ?? []) as GroupInvite[];
}

export async function respondToInvite(inviteId: string, accept: boolean) {
  await api.post(`/groups/invites/${inviteId}`, { accept });
}

export async function joinGroup(id: string) {
  await api.post(`/groups/${id}/join`);
}

export async function leaveGroup(id: string) {
  await api.post(`/groups/${id}/leave`);
}

export async function fetchUpcomingEvents(): Promise<GroupEvent[]> {
  const res = await api.get('/groups/events', { params: { upcoming: true } });
  return res.data.data.events as GroupEvent[];
}

export async function fetchEvent(eventId: string): Promise<GroupEvent> {
  const res = await api.get(`/groups/events/${eventId}`);
  return res.data.data.event as GroupEvent;
}

export async function fetchMyRsvp(eventId: string): Promise<EventAttendee | null> {
  const res = await api.get(`/groups/events/${eventId}/my-rsvp`);
  return (res.data.data.rsvp as EventAttendee | null) ?? null;
}

export async function rsvpEvent(eventId: string, status: 'going' | 'maybe' | 'not_going') {
  await api.post(`/groups/events/${eventId}/rsvp`, { status });
}

export async function cancelRsvp(eventId: string) {
  await api.delete(`/groups/events/${eventId}/rsvp`);
}

export async function fetchEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const res = await api.get(`/groups/events/${eventId}/attendees`);
  return res.data.data.attendees as EventAttendee[];
}
