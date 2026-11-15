// Отложенная публикация: быстрые варианты и ввод своего времени. Веб: components/PostScheduleMenu.vue (календарь и поля часов/минут).
// Сервер принимает `scheduledAt` в ISO (UTC) строго в будущем; без времени пост сохраняется черновиком.

export type SchedulePreset = 'hour' | 'evening' | 'tomorrow' | 'week';
export const SCHEDULE_PRESETS: readonly SchedulePreset[] = ['hour', 'evening', 'tomorrow', 'week'];

const at = (base: Date, days: number, hour: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/** Время для быстрого варианта: «через час», «сегодня в 20:00» (если ещё не прошло, иначе завтра), «завтра в 09:00», «через неделю в 09:00». */
export function presetTime(preset: SchedulePreset, now = new Date()): Date {
  switch (preset) {
    case 'hour':
      return new Date(now.getTime() + 3_600_000);
    case 'evening': {
      const today = at(now, 0, 20);
      return today.getTime() > now.getTime() + 60_000 ? today : at(now, 1, 20);
    }
    case 'tomorrow':
      return at(now, 1, 9);
    case 'week':
      return at(now, 7, 9);
  }
}

/** «дд.мм.гггг чч:мм» (местное время) → Date; null, если формат или дата неверны (31.02, 25:00). */
export function parseLocalDateTime(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [d, mo, y, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59) return null;
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  // Переполнение (31.02 → 3.03) отбрасываем
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

/** Не раньше чем через минуту: сервер отвергает прошлое, а «сейчас» уходит уже в пути. */
export const isSchedulable = (date: Date, now = new Date()): boolean => date.getTime() > now.getTime() + 60_000;

export const toScheduleBody = (date: Date) => ({ scheduledAt: date.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

export const pad2 = (n: number) => String(n).padStart(2, '0');
/** Для поля ввода: «дд.мм.гггг чч:мм». */
export const formatLocalDateTime = (d: Date): string => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
