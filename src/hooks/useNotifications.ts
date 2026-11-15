import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { deleteNotifications, fetchNotificationsPage, fetchUnreadNotifications, markNotificationsRead, restoreNotifications } from '@/api/notifications';
import { acceptRelationship, declineRelationship } from '@/api/relationships';
import type { AppNotification } from '@/shared/api-types';
import { groupNotifications, normalizeNotif } from '@/shared/notifications';

type Page = Awaited<ReturnType<typeof fetchNotificationsPage>>;

/** Уведомления страницами по курсору сервера; склеены пачками (лайки одного человека, комментарии под постом) как на вебе. */
export function useNotifications() {
  const query = useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
    getNextPageParam: (last) => last.nextCursor,
  });
  const raw = (query.data?.pages ?? []).flatMap((p) => p.notifications);
  const seen = new Set<string>();
  const list = raw.filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true))).map((n) => normalizeNotif(n as unknown as Record<string, unknown>));
  const items = groupNotifications(list);
  const unreadTotal = query.data?.pages[0]?.unread ?? 0;
  return { ...query, items, unreadTotal };
}

/** Число непрочитанных для значка колокольчика; обновляется само, пока приложение открыто (на вебе — раз в 30 с). */
export const NOTIF_REFRESH_MS = 30_000;
export function useUnreadNotifications() {
  return useQuery({ queryKey: ['notifications-count'], queryFn: fetchUnreadNotifications, refetchInterval: NOTIF_REFRESH_MS, refetchIntervalInBackground: false });
}

function patchRemove(data: InfiniteData<Page> | undefined, ids: string[] | null): InfiniteData<Page> | undefined {
  if (!data) return data;
  const gone = (n: AppNotification) => ids === null || ids.includes(n.id);
  return {
    ...data,
    pages: data.pages.map((p, i) => ({
      ...p,
      notifications: p.notifications.filter((n) => !gone(n)),
      unread: i === 0 ? (ids === null ? 0 : Math.max(0, p.unread - p.notifications.filter((n) => !n.read && gone(n)).length)) : p.unread,
    })),
  };
}

function patchRead(data: InfiniteData<Page> | undefined, ids: string[] | null): InfiniteData<Page> | undefined {
  if (!data) return data;
  const mark = (n: AppNotification) => (ids === null || ids.includes(n.id) ? { ...n, read: true } : n);
  return {
    ...data,
    pages: data.pages.map((p, i) => ({
      ...p,
      notifications: p.notifications.map(mark),
      unread: i === 0 ? (ids === null ? 0 : Math.max(0, p.unread - p.notifications.filter((n) => !n.read && ids.includes(n.id)).length)) : p.unread,
    })),
  };
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-count'] });
  };
  return {
    /** ids не передан — все. Кэш обновляем сразу, сервер догоняет. */
    markRead: useMutation({
      mutationFn: (ids?: string[]) => markNotificationsRead(ids),
      onMutate: (ids) => {
        qc.setQueryData<InfiniteData<Page>>(['notifications'], (d) => patchRead(d, ids ?? null));
      },
      onSettled: refresh,
    }),
    /** Удалить (ids не передан — все): пропадает сразу; в ответе — то, что удалил сервер, для «отменить». */
    remove: useMutation({
      mutationFn: (ids?: string[]) => deleteNotifications(ids),
      onMutate: (ids) => {
        qc.setQueryData<InfiniteData<Page>>(['notifications'], (d) => patchRemove(d, ids ?? null));
      },
      onError: refresh,
      onSettled: () => qc.invalidateQueries({ queryKey: ['notifications-count'] }),
    }),
    restore: useMutation({ mutationFn: (ids: string[]) => restoreNotifications(ids), onSettled: refresh }),
    accept: useMutation({ mutationFn: (id: string) => acceptRelationship(id), onSuccess: refresh }),
    decline: useMutation({ mutationFn: (id: string) => declineRelationship(id), onSuccess: refresh }),
  };
}
