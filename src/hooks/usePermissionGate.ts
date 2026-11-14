import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';

export type PermissionKind = 'microphone' | 'camera';

/**
 * Разрешение перед действием: уже выдано — продолжаем; иначе системный запрос; отказ не молчит, а открывает объяснение
 * (PermissionDeniedSheet) с кнопкой «Открыть настройки». Галерею отдельно не запрашиваем: системный выбор фото (Android 13+, iOS 14+)
 * работает без разрешения, об ошибке выбора сообщает сам вызывающий код.
 */
export function usePermissionGate() {
  const [denied, setDenied] = useState<PermissionKind | null>(null);

  const ensure = useCallback(async (kind: PermissionKind): Promise<boolean> => {
    try {
      const get = kind === 'microphone' ? getRecordingPermissionsAsync : ImagePicker.getCameraPermissionsAsync;
      const request = kind === 'microphone' ? requestRecordingPermissionsAsync : ImagePicker.requestCameraPermissionsAsync;
      let res = await get();
      if (!res.granted && res.canAskAgain) res = await request();
      if (res.granted) return true;
    } catch {
      // платформа не смогла определить состояние: считаем, что доступа нет, и объясняем
    }
    setDenied(kind);
    return false;
  }, []);

  return {
    deniedKind: denied,
    ensure,
    dismiss: useCallback(() => setDenied(null), []),
    openSettings: useCallback(() => {
      setDenied(null);
      return Linking.openSettings();
    }, []),
  };
}
export type PermissionGate = ReturnType<typeof usePermissionGate>;
