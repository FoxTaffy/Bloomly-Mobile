import { useCallback } from 'react';
import { useT } from '@/hooks/useT';
import { timeAgo } from '@/shared/time';

/** Относительное время на языке интерфейса: суффиксы из словаря (relSecShort…), как на вебе. */
export function useTimeAgo() {
  const { t, locale } = useT();
  return useCallback(
    (iso: string) => timeAgo(iso, { s: t('relSecShort'), m: t('relMinShort'), h: t('relHourShort'), d: t('relDayShort') }, locale),
    [t, locale],
  );
}
