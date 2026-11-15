import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File as FsFile } from 'expo-file-system';
import { uploadFile } from '@/api/media';
import { usePermissionGate } from '@/hooks/usePermissionGate';
import { useT } from '@/hooks/useT';
import { apiErrorCode, apiErrorMessage } from '@/shared/apiError';
import type { MessageKey } from '@/shared/i18n';
import { checkUpload, FILE_LIMITS, formatBytes, isTier, MAX_POST_MEDIA, normalizeTier, TIER_NAME, uploadKind, type UploadKind, type UploadTier } from '@/shared/uploadLimits';
import { useSession } from '@/stores/session';

export type MediaStatus = 'uploading' | 'done' | 'error';

export interface MediaItem {
  id: number;
  uri: string;
  name: string;
  mime: string;
  size: number;
  isVideo: boolean;
  progress: number;
  status: MediaStatus;
  url?: string;
  originalUrl?: string;
  error?: string;
}

let nextId = 1;
const KIND_KEY: Record<UploadKind, MessageKey> = { photo: 'uploadErrPhoto', video: 'uploadErrVideo', document: 'uploadErrDocument' };

const defaultMime = (a: ImagePicker.ImagePickerAsset) => a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg');
const defaultName = (a: ImagePicker.ImagePickerAsset) => a.fileName ?? `upload-${Date.now()}.${a.type === 'video' ? 'mp4' : 'jpg'}`;
function sizeOf(a: ImagePicker.ImagePickerAsset): number {
  if (a.fileSize) return a.fileSize;
  try {
    return new FsFile(a.uri).size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Вложения поста: выбор из галереи или камеры, предпроверка по тарифу, загрузка с прогрессом, повтор при ошибке.
 * Веб-аналог: components/MediaUpload.vue + composables/useUploadPrecheck.ts (папка posts, не больше 20 файлов).
 */
export function usePostMedia(opts: { max?: number; folder?: 'posts' | 'messages' } = {}) {
  const folder = opts.folder ?? 'posts';
  const max = opts.max ?? MAX_POST_MEDIA;
  const { t } = useT();
  const gate = usePermissionGate();
  const tier = normalizeTier(useSession((s) => s.user?.subscription_tier));
  const [items, setItems] = useState<MediaItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const aborts = useRef(new Map<number, AbortController>());
  const itemsRef = useRef<MediaItem[]>([]);
  itemsRef.current = items;

  const patch = useCallback((id: number, p: Partial<MediaItem>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i))), []);

  const limitMessage = useCallback(
    (kind: UploadKind, limit: number, needTier: UploadTier | null) => {
      const base = t(KIND_KEY[kind], { limit: formatBytes(limit) });
      return needTier && needTier !== tier ? `${base}. ${t('uploadUpgradeTo', { tier: TIER_NAME[needTier] })}` : base;
    },
    [t, tier],
  );

  /** Текст по ответу сервера (413 FILE_LIMIT_EXCEEDED / 403 FILE_TYPE_NOT_IN_PLAN) или общий. */
  const errorMessage = useCallback(
    (err: unknown): string => {
      const code = apiErrorCode(err);
      if (code === 'FILE_LIMIT_EXCEEDED' || code === 'FILE_TYPE_NOT_IN_PLAN') {
        const d = (err as { response?: { data?: { error?: { details?: { kind?: UploadKind; limitBytes?: number; requiredTier?: string | null } } } } })?.response?.data?.error?.details;
        if (d?.kind) return limitMessage(d.kind, d.limitBytes ?? 0, isTier(d.requiredTier) ? d.requiredTier : null);
      }
      return apiErrorMessage(err) ?? t('mUploadFailed');
    },
    [limitMessage, t],
  );

  const start = useCallback(
    async (item: MediaItem) => {
      const ctrl = new AbortController();
      aborts.current.set(item.id, ctrl);
      patch(item.id, { status: 'uploading', progress: 0, error: undefined });
      try {
        const data = await uploadFile({
          uri: item.uri, name: item.name, mime: item.mime, size: item.size, folder, signal: ctrl.signal,
          onProgress: (f) => patch(item.id, { progress: f }),
        });
        patch(item.id, { status: 'done', progress: 1, url: data.url, originalUrl: data.originalUrl || data.url });
      } catch (err) {
        if (ctrl.signal.aborted) return; // удалили во время загрузки
        patch(item.id, { status: 'error', error: errorMessage(err) });
      } finally {
        aborts.current.delete(item.id);
      }
    },
    [errorMessage, folder, patch],
  );

  const addAssets = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      setNotice(null);
      const room = max - itemsRef.current.length;
      if (assets.length > room) setNotice(t('mUploadMaxFiles', { n: max }));
      const fresh: MediaItem[] = [];
      for (const a of assets.slice(0, Math.max(0, room))) {
        const mime = defaultMime(a);
        const size = sizeOf(a);
        const check = checkUpload({ mime, size }, tier);
        // Не гоним по сети файл, который тариф всё равно не пропустит
        if (!check.ok) {
          setNotice(limitMessage(check.kind, check.limit, check.needTier));
          continue;
        }
        if (itemsRef.current.some((i) => i.uri === a.uri) || fresh.some((i) => i.uri === a.uri)) continue;
        fresh.push({ id: nextId++, uri: a.uri, name: defaultName(a), mime, size, isVideo: uploadKind(mime) === 'video', progress: 0, status: 'uploading' });
      }
      if (!fresh.length) return;
      setItems((list) => [...list, ...fresh]);
      fresh.forEach((i) => void start(i));
    },
    [limitMessage, max, start, t, tier],
  );

  // Lite+ грузят фото как есть, на Free — сжатие JPEG (как на вебе: «стандартное сжатие»)
  const quality = FILE_LIMITS[tier].uncompressedPhotos ? 1 : 0.8;

  const pickFromLibrary = useCallback(async () => {
    const room = max - itemsRef.current.length;
    if (room <= 0) return setNotice(t('mUploadMaxFiles', { n: max }));
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: room, quality });
      if (!res.canceled) addAssets(res.assets);
    } catch {
      // системный выбор фото обычно не требует разрешения; если он всё же не открылся, говорим об этом, а не молчим
      setNotice(t('mPickFailed'));
    }
  }, [addAssets, max, quality, t]);

  const takeWithCamera = useCallback(async () => {
    if (!(await gate.ensure('camera'))) return; // отказ: объяснение и кнопка настроек показывает PermissionDeniedSheet
    try {
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality });
      if (!res.canceled) addAssets(res.assets);
    } catch {
      setNotice(t('mPickFailed'));
    }
  }, [addAssets, gate, quality, t]);

  const remove = useCallback((id: number) => {
    aborts.current.get(id)?.abort();
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const retry = useCallback((id: number) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (item) void start(item);
  }, [start]);

  const clear = useCallback(() => {
    aborts.current.forEach((c) => c.abort());
    aborts.current.clear();
    setItems([]);
  }, []);

  const uploading = items.some((i) => i.status === 'uploading');
  const failed = items.some((i) => i.status === 'error');
  const done = items.filter((i) => i.status === 'done' && i.url);

  return { gate, items, notice, uploading, failed, mediaUrls: done.map((i) => i.url!), mediaOriginalUrls: done.map((i) => i.originalUrl ?? i.url!), pickFromLibrary, takeWithCamera, remove, retry, clear };
}
