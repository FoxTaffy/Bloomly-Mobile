// Проверка логики каталога мероприятий: src/shared/events.ts. Запуск: npm run test:events.
import { activeFilterCount, addDaysIso, buildListQuery, canRsvp, defaultFilters, eventTiming, formatEventWhen, presetRange } from '../src/shared/events.ts';

let bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.log(`ОШИБКА: ${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); bad++; } };

const wed = new Date(2026, 10, 18, 12, 0, 0); // среда, 18 ноября 2026
eq(presetRange('today', wed), { from: '2026-11-18', to: '2026-11-18' }, 'сегодня');
eq(presetRange('week', wed), { from: '2026-11-18', to: '2026-11-22' }, 'неделя — до воскресенья');
eq(presetRange('month', wed), { from: '2026-11-18', to: '2026-11-30' }, 'месяц — до конца месяца');
eq(presetRange('week', new Date(2026, 10, 22, 12)), { from: '2026-11-22', to: '2026-11-22' }, 'в воскресенье неделя — один день');
eq(presetRange('any', wed), null, 'любые даты');
eq(addDaysIso('2026-12-30', 3), '2027-01-02', 'сдвиг через границу года');

const f = { ...defaultFilters(), q: ' фест ', type: 'festival', city: 'Москва', datePreset: 'today', verified: true };
eq(buildListQuery(f, 2, wed), { scope: 'upcoming', page: 2, limit: 20, q: 'фест', type: 'festival', city: 'Москва', verified: '1', from: '2026-11-18', to: '2026-11-18' }, 'параметры запроса');
eq(buildListQuery(defaultFilters(), 1, wed), { scope: 'upcoming', page: 1, limit: 20 }, 'без фильтров — только вкладка и страница');
eq(activeFilterCount(f), 4, 'счётчик фильтров: поиск не в счёт');

const ev = (o) => ({ starts_on: '2026-11-20T00:00:00.000Z', ends_on: '2026-11-22T00:00:00.000Z', publication_status: 'published', ...o });
eq(eventTiming(ev({}), wed), { key: 'inDays', n: 2 }, 'через 2 дня');
eq(eventTiming(ev({ starts_on: '2026-11-19T00:00:00.000Z' }), wed), { key: 'tomorrow' }, 'завтра');
eq(eventTiming(ev({ starts_on: '2026-11-18T00:00:00.000Z' }), wed), { key: 'today' }, 'сегодня идёт');
eq(eventTiming(ev({ starts_on: '2026-11-17T00:00:00.000Z', ends_on: '2026-11-19T00:00:00.000Z' }), wed), { key: 'ongoing' }, 'идёт сейчас');
eq(eventTiming(ev({ starts_on: '2026-11-10T00:00:00.000Z', ends_on: '2026-11-12T00:00:00.000Z' }), wed), { key: 'finished' }, 'прошло');
eq(eventTiming(ev({ publication_status: 'cancelled' }), wed), { key: 'cancelled' }, 'отменено');
eq(canRsvp(ev({}), wed), true, 'запись открыта');
eq(canRsvp(ev({ ends_on: '2026-11-12T00:00:00.000Z' }), wed), false, 'после окончания записи нет');
eq(canRsvp(ev({ publication_status: 'cancelled' }), wed), false, 'отменено — записи нет');

const w = formatEventWhen({ ...ev({}), starts_at: '2026-11-20T07:00:00Z', ends_at: '2026-11-22T15:00:00Z', time_precision: 'datetime', timezone: 'Europe/Moscow', timezone_needs_review: false }, 'ru-RU');
eq(w.unknown, null, 'время известно');
eq(typeof w.time, 'string', 'есть строка времени');
eq(formatEventWhen({ ...ev({}), starts_at: '', ends_at: '', time_precision: 'date', timezone: null, timezone_needs_review: true }, 'ru-RU').unknown, 'review', 'только даты, пояс уточняется');
eq(formatEventWhen({ ...ev({}), starts_at: '', ends_at: '', time_precision: 'date', timezone: null, timezone_needs_review: false }, 'ru-RU').time, null, 'только даты — без часа');

if (bad) { console.log(`Провалено проверок: ${bad}`); process.exit(1); }
console.log('События: все проверки пройдены');
