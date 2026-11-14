// Вложения поста. Порт frontend/src/lib/mediaType.ts и postMedia.ts: в media_urls вперемешку изображения, видео и файлы.
const VIDEO_RE = /\.(mp4|webm|mov|mkv|ogv|m4v|avi)$/i;
const DOC_RE = /\.(zip|7z|rar|gz|psd)(\?.*)?$/i;

export function isVideoUrl(url: string): boolean {
  try {
    return VIDEO_RE.test(decodeURIComponent(new URL(url, 'https://local.invalid').pathname));
  } catch {
    return VIDEO_RE.test(url.split(/[?#]/)[0]);
  }
}

export const isDocUrl = (url: string): boolean => DOC_RE.test(url);

/** Только изображения и видео: файлы (PSD, архивы) в карусели не показываем. */
export const visualMedia = (urls: readonly string[] | null | undefined): string[] => (urls ?? []).filter((u) => !isDocUrl(u));
