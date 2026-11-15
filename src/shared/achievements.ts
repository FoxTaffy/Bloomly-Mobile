// Значки профиля с уровнями: ответ GET /achievements/users/:id (веб: lib/achievements.ts). Каталог, названия и пороги — на бэкенде.

export interface AchievementItem {
  key: string;
  category: 'content' | 'social' | 'market' | 'profile' | 'time';
  title: string;
  level: number;
  maxLevel: number;
  levelName: string | null;
  earnedAt: string | null;
  hiddenUntilEarned: boolean;
}

export interface AchievementsData {
  earned: number;
  total: number;
  items: AchievementItem[];
}

export type Tone = 'warning' | 'accent' | 'yellow' | 'purple' | 'success' | 'muted';

/** Тон плитки по уровню: бронза → серебро → золото → платина; одноуровневые — зелёные (web: tierTone). */
export function tierTone(level: number, maxLevel: number): Tone {
  if (level < 1) return 'muted';
  if (maxLevel === 1) return 'success';
  const tones: Tone[] = ['warning', 'accent', 'yellow', 'purple'];
  return tones[Math.round(((level - 1) * 3) / (maxLevel - 1))];
}

/** Полученные значки: сначала более высокие уровни. Скрытые до получения без уровня не показываем. */
export const earnedItems = (d: AchievementsData | null | undefined): AchievementItem[] =>
  (d?.items ?? []).filter((i) => i.level > 0).sort((a, b) => b.level / b.maxLevel - a.level / a.maxLevel || a.title.localeCompare(b.title));
