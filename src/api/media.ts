import type { AxiosRequestConfig } from 'axios';
import { File as FsFile } from 'expo-file-system';
import { api } from './client';
import { CHUNK_RETRIES, CHUNKED_THRESHOLD_BYTES } from '@/shared/uploadLimits';

export interface UploadResult {
  url: string;
  originalUrl?: string;
  videoUrl?: string;
  isSilentVideo?: boolean;
}

export interface UploadFileInput {
  uri: string;
  name: string;
  mime: string;
  size: number;
  folder: 'posts' | 'avatars' | 'stories' | 'messages';
  /** Доля отправленного, 0..1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

// Ошибки, которые повтором не лечатся: лимит тарифа, формат, доступ, сессия (как в web lib/uploadMedia.ts)
const DEFINITIVE = new Set([400, 401, 403, 404, 413, 415, 422]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const statusOf = (e: unknown): number | undefined => (e as { response?: { status?: number } })?.response?.status;
const codeOf = (e: unknown): string | undefined => (e as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
const receivedOf = (e: unknown): number | undefined => (e as { response?: { data?: { error?: { details?: { received?: number } } } } })?.response?.data?.error?.details?.received;
const isAborted = (e: unknown) => (e as { code?: string })?.code === 'ERR_CANCELED' || (e as { name?: string })?.name === 'CanceledError';

async function uploadSingle(f: UploadFileInput): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', { uri: f.uri, name: f.name, type: f.mime } as unknown as Blob);
  const res = await api.post(`/media/upload?folder=${encodeURIComponent(f.folder)}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: f.signal,
    onUploadProgress: (p) => {
      if (p.total && p.total > 0) f.onProgress?.(p.loaded / p.total);
    },
  } as AxiosRequestConfig);
  return res.data.data as UploadResult;
}

/** Крупные файлы частями: читаем кусок с диска, не загружая весь файл в память. */
async function uploadChunked(f: UploadFileInput): Promise<UploadResult> {
  const init = await api.post('/media/upload/init', { fileName: f.name, mimeType: f.mime, totalSize: f.size, folder: f.folder }, { signal: f.signal });
  const { uploadId, chunkSize } = init.data.data as { uploadId: string; chunkSize: number };
  const base = `/media/upload/${uploadId}`;
  const total = f.size;
  let confirmed = 0;
  const report = (inflight = 0) => f.onProgress?.(Math.min(0.99, (confirmed + inflight) / total));

  const handle = new FsFile(f.uri).open();
  try {
    while (confirmed < total) {
      const start = confirmed;
      const end = Math.min(start + chunkSize, total);
      handle.offset = start;
      const bytes = handle.readBytes(end - start);
      let attempt = 0;
      for (;;) {
        try {
          const res = await api.patch(base, bytes, {
            headers: { 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(start) },
            signal: f.signal,
            onUploadProgress: (p) => report(Math.min(p.loaded, end - start)),
            // Тело — готовый буфер: axios не должен его преобразовывать
            transformRequest: [(data: unknown) => data],
          } as AxiosRequestConfig);
          confirmed = res.data.data.received as number;
          report();
          break;
        } catch (err) {
          if (isAborted(err)) throw err;
          // Сервер уже принял больше (ответ потерялся): продолжаем с его места
          if (statusOf(err) === 409 && codeOf(err) === 'OFFSET_MISMATCH' && typeof receivedOf(err) === 'number') {
            confirmed = receivedOf(err)!;
            report();
            break;
          }
          const status = statusOf(err);
          if ((status && DEFINITIVE.has(status)) || attempt >= CHUNK_RETRIES) throw err;
          attempt += 1;
          await sleep(1000 * 2 ** (attempt - 1));
          try {
            const st = await api.get(base, { signal: f.signal });
            const got = st.data.data.received as number;
            if (got !== start) {
              confirmed = got;
              report();
              break;
            }
          } catch (e2) {
            if (isAborted(e2)) throw e2;
          }
        }
      }
    }
    const done = await api.post(`${base}/complete`, undefined, { signal: f.signal });
    f.onProgress?.(1);
    return done.data.data as UploadResult;
  } catch (err) {
    // Временные части на сервере не нужны (если сессия ещё жива)
    if (statusOf(err) !== 404) api.delete(base).catch(() => {});
    throw err;
  } finally {
    handle.close();
  }
}

/** Единая загрузка: до 50 МБ одним запросом, крупнее частями. Ответ у обоих путей одинаковый. */
export function uploadFile(f: UploadFileInput): Promise<UploadResult> {
  return f.size <= CHUNKED_THRESHOLD_BYTES ? uploadSingle(f) : uploadChunked(f);
}

/** Короткая загрузка одного файла без прогресса (голосовые сообщения). */
export async function uploadMedia(
  uri: string,
  folder: 'posts' | 'avatars' | 'stories' | 'messages',
  mimeType = 'image/jpeg',
): Promise<{ url: string; videoUrl?: string }> {
  const name = uri.split('/').pop() ?? `upload-${Date.now()}`;
  const form = new FormData();
  form.append('file', { uri, name, type: mimeType } as unknown as Blob);
  const res = await api.post(`/media/upload?folder=${folder}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.data;
}
