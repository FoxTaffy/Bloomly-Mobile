import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File as FsFile } from 'expo-file-system';
import { uploadFile } from '@/api/media';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';

type Kind = 'avatar' | 'banner';
const FOLDER = { avatar: 'avatars', banner: 'banners' } as const;
// Обрезка встроенным редактором выбора фото: аватар квадратом, баннер широкой полосой (на вебе то же: окно обрезки)
const ASPECT: Record<Kind, [number, number]> = { avatar: [1, 1], banner: [3, 1] };

/**
 * Выбор и загрузка аватара или баннера (веб: composables/settings/useProfileMedia.ts): фото из галереи с обрезкой,
 * загрузка в папку avatars/banners. Возвращает адрес загруженного файла; сохраняет его в профиль вызывающий код.
 */
export function useProfileImage(kind: Kind) {
  const { t } = useT();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(async (): Promise<string | null> => {
    setError(null);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: ASPECT[kind], quality: 0.9 });
      if (res.canceled) return null;
      const a = res.assets[0];
      const mime = a.mimeType ?? 'image/jpeg';
      let size = a.fileSize ?? 0;
      if (!size) {
        try {
          size = new FsFile(a.uri).size ?? 0;
        } catch {
          size = 0;
        }
      }
      setUploading(true);
      const data = await uploadFile({ uri: a.uri, name: a.fileName ?? `${kind}.jpg`, mime, size, folder: FOLDER[kind] });
      return data.url;
    } catch (e) {
      setError(apiErrorMessage(e) ?? t('settingsProfileImageUploadError'));
      return null;
    } finally {
      setUploading(false);
    }
  }, [kind, t]);

  return { pick, uploading, error };
}
