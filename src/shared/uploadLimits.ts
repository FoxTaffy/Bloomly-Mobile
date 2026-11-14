// Предпроверка размера файла по тарифу. Порт frontend/src/lib/uploadLimits.ts (зеркало backend/src/modules/payments/plan-perks.ts).
// Решает всегда сервер: это только чтобы не гнать лишние мегабайты по сети. Без React.

const MB = 1024 * 1024;
const GB = 1024 * MB;

export type UploadTier = 'free' | 'lite' | 'pro' | 'business';
export type UploadKind = 'photo' | 'video' | 'document';

export interface FileLimits {
  maxPhotoBytes: number;
  maxVideoBytes: number;
  uncompressedPhotos: boolean;
}

export const FILE_LIMITS: Record<UploadTier, FileLimits> = {
  free: { maxPhotoBytes: 15 * MB, maxVideoBytes: 100 * MB, uncompressedPhotos: false },
  lite: { maxPhotoBytes: 50 * MB, maxVideoBytes: 500 * MB, uncompressedPhotos: true },
  pro: { maxPhotoBytes: 50 * MB, maxVideoBytes: 1 * GB, uncompressedPhotos: true },
  business: { maxPhotoBytes: 50 * MB, maxVideoBytes: 2 * GB, uncompressedPhotos: true },
};

const TIER_ORDER: UploadTier[] = ['free', 'lite', 'pro', 'business'];
export const TIER_NAME: Record<UploadTier, string> = { free: 'Free', lite: 'Lite', pro: 'Pro', business: 'Business' };

export const isTier = (v: unknown): v is UploadTier => typeof v === 'string' && (TIER_ORDER as string[]).includes(v);
export const normalizeTier = (tier?: string | null): UploadTier => (isTier(tier) ? tier : 'free');

export function uploadKind(mime: string): UploadKind {
  if (mime.startsWith('image/') && mime !== 'image/vnd.adobe.photoshop') return 'photo';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
  return 'document';
}

export function limitBytes(tier: UploadTier, kind: UploadKind): number {
  const l = FILE_LIMITS[tier];
  return kind === 'photo' ? l.maxPhotoBytes : kind === 'video' ? l.maxVideoBytes : 0;
}

/** Самый дешёвый тариф, на котором файл проходит; null — не проходит нигде. */
export function requiredTier(kind: UploadKind, size: number): UploadTier | null {
  return TIER_ORDER.find((t) => limitBytes(t, kind) > 0 && limitBytes(t, kind) >= size) ?? null;
}

export function formatBytes(bytes: number): string {
  return bytes >= GB ? `${+(bytes / GB).toFixed(1)} ГБ` : `${Math.round(bytes / MB)} МБ`;
}

export type UploadCheck =
  | { ok: true; kind: UploadKind }
  | { ok: false; kind: UploadKind; reason: 'too_big'; limit: number; needTier: UploadTier | null };

export function checkUpload(file: { mime: string; size: number }, tier?: string | null): UploadCheck {
  const t = normalizeTier(tier);
  const kind = uploadKind(file.mime);
  const limit = limitBytes(t, kind);
  if (file.size > limit) return { ok: false, kind, reason: 'too_big', limit, needTier: requiredTier(kind, file.size) };
  return { ok: true, kind };
}

/** Файлы до порога уходят одним запросом, крупнее — частями (лимит тела запроса Cloudflare). Как lib/uploadMedia.ts. */
export const CHUNKED_THRESHOLD_BYTES = 50 * MB;
export const CHUNK_RETRIES = 3;
/** Максимум вложений в обычный пост (веб: MediaUpload max-files 20). */
export const MAX_POST_MEDIA = 20;
