import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  deleteComment,
  deletePost,
  editPost,
  favouritePost,
  repawPost,
  setNotInterested,
  toggleArchivePost,
  toggleCommentsDisabled,
  voteComment,
  type EditPostBody,
} from '@/api/posts';
import { fetchNotifyStatus, toggleNotify } from '@/api/users';
import type { Comment, Post } from '@/shared/api-types';

/** Ключи запросов, в которых лежат посты (ленты, обзор, поиск, профиль, один пост). */
const POST_QUERY_ROOTS = new Set(['feed', 'explore', 'search', 'profile-posts', 'post', 'bookmarks']);

type Patch = (post: Post) => Post | null;

const isPost = (v: unknown): v is Post => !!v && typeof v === 'object' && 'id' in v && 'media_urls' in v && '_count' in v;

/** Применяет правку к посту `id` в данных запроса любой из известных форм; `null` из правки убирает пост из списка. */
function patchData(data: unknown, id: string, patch: Patch): unknown {
  if (Array.isArray(data)) {
    if (!data.some((x) => isPost(x) && x.id === id)) return data;
    return data.flatMap((x) => {
      if (!isPost(x) || x.id !== id) return [x];
      const next = patch(x);
      return next ? [next] : [];
    });
  }
  if (isPost(data)) return data.id === id ? (patch(data) ?? data) : data;
  if (data && typeof data === 'object') {
    const obj = data as { pages?: unknown[]; items?: unknown[]; posts?: unknown[] };
    if (Array.isArray(obj.pages)) {
      const pages = obj.pages.map((page) => patchData(page, id, patch));
      return pages.some((page, i) => page !== obj.pages![i]) ? { ...obj, pages } : data;
    }
    if (Array.isArray(obj.posts)) {
      const posts = patchData(obj.posts, id, patch);
      return posts !== obj.posts ? { ...obj, posts } : data;
    }
    if (Array.isArray(obj.items)) {
      const items = patchData(obj.items, id, patch);
      return items !== obj.items ? { ...obj, items } : data;
    }
  }
  return data;
}

/** Правка поста сразу во всех кэшах: карточка в ленте, профиле, поиске и на экране поста показывает одно состояние. */
export function patchPostEverywhere(qc: QueryClient, id: string, patch: Patch) {
  qc.setQueriesData({ predicate: (q) => POST_QUERY_ROOTS.has(String(q.queryKey[0])) }, (data: unknown) => patchData(data, id, patch));
}

/**
 * Действия с постом (web: components/PostCard.vue). Состояние читателя живёт в кэше запросов, а не в карточке:
 * карточки списка переиспользуются, и локальное состояние переезжало бы на чужой пост.
 */
export function usePostActions(post: Post) {
  const qc = useQueryClient();
  const busy = useRef<Set<string>>(new Set());
  const id = post.id;

  /** Один запрос на действие за раз (web: repawPending и т.п.). */
  const once = useCallback(async (key: string, run: () => Promise<void>) => {
    const k = `${key}:${id}`;
    if (busy.current.has(k)) return;
    busy.current.add(k);
    try {
      await run();
    } finally {
      busy.current.delete(k);
    }
  }, [id]);

  /** Оптимистично, итог — из ответа сервера, при ошибке откат (web: toggleRepaw). */
  const toggleRepaw = useCallback(
    () =>
      once('repaw', async () => {
        const was = !!post.repawed;
        const count = post._count.repaws;
        patchPostEverywhere(qc, id, (p) => ({ ...p, repawed: !was, _count: { ...p._count, repaws: Math.max(0, count + (was ? -1 : 1)) } }));
        try {
          const r = await repawPost(id);
          patchPostEverywhere(qc, id, (p) => ({ ...p, repawed: r.repawed, _count: { ...p._count, repaws: r.repaw_count ?? p._count.repaws } }));
          qc.invalidateQueries({ queryKey: ['profile-posts'], refetchType: 'none' });
        } catch {
          patchPostEverywhere(qc, id, (p) => ({ ...p, repawed: was, _count: { ...p._count, repaws: count } }));
        }
      }),
    [once, qc, id, post.repawed, post._count.repaws],
  );

  const toggleFavourite = useCallback(
    () =>
      once('fav', async () => {
        const was = !!post.favourited;
        patchPostEverywhere(qc, id, (p) => ({ ...p, favourited: !was }));
        try {
          const favourited = await favouritePost(id);
          patchPostEverywhere(qc, id, (p) => ({ ...p, favourited }));
          // Список закладок меняется: пост появился или исчез
          qc.invalidateQueries({ queryKey: ['bookmarks', 'posts'] });
        } catch {
          patchPostEverywhere(qc, id, (p) => ({ ...p, favourited: was }));
        }
      }),
    [once, qc, id, post.favourited],
  );

  /** «Не интересно»: карточка сворачивается сразу, ошибка запроса не мешает (как на вебе). */
  const markNotInterested = useCallback(
    (value: boolean) => {
      patchPostEverywhere(qc, id, (p) => ({ ...p, hidden_by_me: value }));
      setNotInterested(id, value).catch(() => {
        // как на вебе: скрытие локальное, сервер учтёт при следующей попытке
      });
    },
    [qc, id],
  );

  /** Удаление и архив убирают пост из показанных списков (web: emit('deleted')). Возвращают, получилось ли. */
  const removeWith = useCallback(
    async (run: (postId: string) => Promise<void>): Promise<boolean> => {
      try {
        await run(id);
      } catch {
        return false;
      }
      patchPostEverywhere(qc, id, () => null);
      qc.invalidateQueries({ queryKey: ['profile-posts'] });
      return true;
    },
    [qc, id],
  );
  const remove = useCallback(() => removeWith(deletePost), [removeWith]);
  const toggleArchive = useCallback(() => removeWith(toggleArchivePost), [removeWith]);

  const toggleComments = useCallback(async (): Promise<boolean> => {
    try {
      const disabled = await toggleCommentsDisabled(id);
      patchPostEverywhere(qc, id, (p) => ({ ...p, comments_disabled: disabled }));
      return true;
    } catch {
      return false;
    }
  }, [qc, id]);

  return { toggleRepaw, toggleFavourite, markNotInterested, remove, toggleArchive, toggleComments };
}

/** Сохранение правки своего поста: ответ сервера кладём во все кэши, состояние читателя сохраняем. */
export function useEditPost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EditPostBody) => editPost(id, body),
    onSuccess: (updated) => {
      patchPostEverywhere(qc, id, (p) => ({ ...p, ...updated, my_vote: p.my_vote, repawed: p.repawed, favourited: p.favourited }));
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });
}

/** Уведомления о постах автора: статус грузится при открытии меню (web: notify-status по первому открытию). */
export function useAuthorNotify(authorId: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const key = ['notify-status', authorId];
  const status = useQuery({ queryKey: key, queryFn: () => fetchNotifyStatus(authorId!), enabled: enabled && !!authorId });
  const toggle = useMutation({
    mutationFn: () => toggleNotify(authorId!),
    onSuccess: (on) => qc.setQueryData(key, on),
  });
  return { on: !!status.data, toggle };
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

/**
 * Оценка комментария ▲/▼ (web: PostComments.vue voteComment): оптимистично, повтор той же стрелки снимает оценку,
 * рейтинг — из ответа сервера, при ошибке откат и сообщение. Комментарии не в переиспользуемом списке, состояние локальное.
 */
export function useCommentVote(comment: Comment) {
  const [vote, setVote] = useState<-1 | 0 | 1>(comment.user_vote ?? 0);
  const [rating, setRating] = useState(comment.rating ?? 0);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);

  useEffect(() => setVote(comment.user_vote ?? 0), [comment.id, comment.user_vote]);
  useEffect(() => setRating(comment.rating ?? 0), [comment.id, comment.rating]);

  const cast = useCallback(
    async (value: 1 | -1) => {
      if (pending.current) return;
      pending.current = true;
      setFailed(false);
      const prev = vote;
      const prevRating = rating;
      const next: -1 | 0 | 1 = prev === value ? 0 : value;
      setVote(next);
      setRating(prevRating + (next - prev));
      try {
        const serverRating = await voteComment(comment.id, value);
        if (serverRating !== null) setRating(serverRating);
      } catch {
        setVote(prev);
        setRating(prevRating);
        setFailed(true);
      } finally {
        pending.current = false;
      }
    },
    [comment.id, vote, rating],
  );

  return { vote, rating, failed, cast };
}
