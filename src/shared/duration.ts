/** Секунды → «m:ss» (голосовые сообщения). Нечисловое и отрицательное — «0:00». */
export function formatClock(seconds: number | null | undefined): string {
  const s = Number.isFinite(seconds) && (seconds as number) > 0 ? Math.floor(seconds as number) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Доля воспроизведённого, 0..1 (длительность неизвестна — 0). */
export function progressOf(current: number, total: number): number {
  return total > 0 && Number.isFinite(total) ? Math.min(1, Math.max(0, current / total)) : 0;
}
