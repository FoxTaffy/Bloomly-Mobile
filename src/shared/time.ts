export interface RelativeSuffixes {
  s: string;
  m: string;
  h: string;
  d: string;
}

/** «5с / 3м / 2ч / 4д», старше недели — дата в локали (web: lib/format.ts formatRelativeShort, maxDays = 7). */
export function timeAgo(iso: string, suffixes: RelativeSuffixes, locale: string, maxDays = 7): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}${suffixes.s}`;
  if (sec < 3600) return `${Math.floor(sec / 60)}${suffixes.m}`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}${suffixes.h}`;
  const days = Math.floor(sec / 86400);
  if (days < maxDays) return `${days}${suffixes.d}`;
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
