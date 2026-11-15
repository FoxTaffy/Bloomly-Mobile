// Проверка отложенной публикации: src/shared/schedule.ts. Запуск: npm run test:schedule.
import { formatLocalDateTime, isSchedulable, parseLocalDateTime, presetTime } from '../src/shared/schedule.ts';

let bad = 0;
const eq = (a, b, m) => { if (a !== b) { console.log(`ОШИБКА: ${m}: ${a} ≠ ${b}`); bad++; } };
const fmt = formatLocalDateTime;

const morning = new Date(2026, 10, 18, 10, 30);
const lateNight = new Date(2026, 10, 18, 21, 0);
eq(fmt(presetTime('hour', morning)), '18.11.2026 11:30', 'через час');
eq(fmt(presetTime('evening', morning)), '18.11.2026 20:00', 'вечер сегодня');
eq(fmt(presetTime('evening', lateNight)), '19.11.2026 20:00', 'вечер уже прошёл — завтра');
eq(fmt(presetTime('tomorrow', lateNight)), '19.11.2026 09:00', 'завтра утром');
eq(fmt(presetTime('week', morning)), '25.11.2026 09:00', 'через неделю');
eq(fmt(presetTime('tomorrow', new Date(2026, 11, 31, 22, 0))), '01.01.2027 09:00', 'через границу года');

eq(fmt(parseLocalDateTime(' 5.1.2027  7:05 ')), '05.01.2027 07:05', 'ввод с короткими числами');
eq(parseLocalDateTime('31.02.2027 10:00'), null, 'несуществующая дата');
eq(parseLocalDateTime('10.13.2027 10:00'), null, 'месяц 13');
eq(parseLocalDateTime('10.01.2027 25:00'), null, 'час 25');
eq(parseLocalDateTime('10.01.2027'), null, 'без времени');
eq(parseLocalDateTime('завтра'), null, 'не дата');
eq(isSchedulable(new Date(morning.getTime() + 30_000), morning), false, 'через 30 секунд — рано');
eq(isSchedulable(new Date(morning.getTime() + 120_000), morning), true, 'через 2 минуты — можно');
eq(isSchedulable(new Date(morning.getTime() - 1000), morning), false, 'прошлое');

if (bad) { console.log(`Провалено проверок: ${bad}`); process.exit(1); }
console.log('Отложенные посты: все проверки пройдены');
