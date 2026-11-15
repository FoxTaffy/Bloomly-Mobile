import { api } from './client';
import { buildListQuery, type CatalogEventDetail, type CitySubscription, type EventFacets, type EventFilters, type EventListPage } from '@/shared/events';

// Каталог мероприятий (веб: stores/eventCatalog.ts). Запись «Иду / Возможно» общая с событиями групп: /groups/events/:id/rsvp.

export async function fetchEventList(f: EventFilters, page: number): Promise<EventListPage> {
  const res = await api.get('/events', { params: buildListQuery(f, page) });
  const d = res.data.data;
  return { events: d.events ?? [], total: d.total ?? 0, page: d.page ?? page, hasMore: !!d.hasMore };
}

export async function fetchEventFacets(): Promise<EventFacets> {
  const res = await api.get('/events/facets');
  const d = res.data.data;
  return { countries: d.countries ?? [], cities: d.cities ?? [] };
}

/** Мероприятие каталога по id или slug. 404 — это может быть событие старой афиши группы (тогда `fetchEvent` из api/groups). */
export async function fetchCatalogEvent(id: string): Promise<CatalogEventDetail> {
  const res = await api.get(`/events/${id}`);
  return (res.data.data.event ?? res.data.data) as CatalogEventDetail;
}

export async function fetchCitySubscriptions(): Promise<CitySubscription[]> {
  const res = await api.get('/events/city-subscriptions');
  return (res.data.data.subscriptions ?? res.data.data ?? []) as CitySubscription[];
}

export async function subscribeCity(countryCode: string, city: string) {
  await api.post('/events/city-subscriptions', { countryCode, city });
}

export async function unsubscribeCity(id: string) {
  await api.delete(`/events/city-subscriptions/${id}`);
}
