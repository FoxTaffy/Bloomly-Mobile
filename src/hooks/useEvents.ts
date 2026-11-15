import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCatalogEvent, fetchCitySubscriptions, fetchEventFacets, fetchEventList, subscribeCity, unsubscribeCity } from '@/api/events';
import { fetchEvent } from '@/api/groups';
import { apiErrorStatus } from '@/shared/apiError';
import type { GroupEvent } from '@/shared/api-types';
import type { CatalogEvent, CatalogEventDetail, EventFilters } from '@/shared/events';

/** Каталог страницами: фильтры входят в ключ запроса, следующая страница — по `hasMore`. */
export function useEventCatalog(filters: EventFilters) {
  const query = useInfiniteQuery({
    queryKey: ['event-catalog', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchEventList(filters, pageParam),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const seen = new Set<string>();
  const events = (query.data?.pages ?? []).flatMap((p) => p.events).filter((e: CatalogEvent) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  return { ...query, events, total: query.data?.pages[0]?.total ?? 0 };
}

/** Значения фильтров (страны, города): один раз за сессию, сбой не страшен — поиск работает и без них. */
export function useEventFacets() {
  return useQuery({ queryKey: ['event-facets'], queryFn: fetchEventFacets, staleTime: Infinity, retry: false });
}

export type EventDetail = { kind: 'catalog'; event: CatalogEventDetail } | { kind: 'group'; event: GroupEvent };

/**
 * Страница мероприятия (веб: EventDetailView): сначала каталог `/events/:id`; если там 404 — событие старой афиши группы
 * (`/groups/events/:id`). Ссылки из уведомлений «событие в вашем городе» ведут именно на каталог.
 */
export function useEventDetail(id: string) {
  return useQuery<EventDetail>({
    queryKey: ['event', id],
    enabled: !!id,
    retry: false,
    queryFn: async () => {
      try {
        return { kind: 'catalog', event: await fetchCatalogEvent(id) };
      } catch (e) {
        if (apiErrorStatus(e) !== 404) throw e;
      }
      return { kind: 'group', event: await fetchEvent(id) };
    },
  });
}

export function useCitySubscriptions() {
  return useQuery({ queryKey: ['city-subscriptions'], queryFn: fetchCitySubscriptions });
}

/** Подписка на город: уведомления «событие в вашем городе» (пуш `event_in_city`, категория «события»). */
export function useCitySubscribe() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['city-subscriptions'] });
  return {
    add: useMutation({ mutationFn: ({ country, city }: { country: string; city: string }) => subscribeCity(country, city), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => unsubscribeCity(id), onSuccess: refresh }),
  };
}
