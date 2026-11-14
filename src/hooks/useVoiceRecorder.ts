import { useCallback, useState } from 'react';
import { RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { usePermissionGate } from '@/hooks/usePermissionGate';

/**
 * Запись голосового сообщения: разрешение на микрофон перед записью (отказ объясняется, а не молчит), режим аудиосессии
 * на время записи, понятные ошибки. `finish` возвращает uri записи или null.
 */
export function useVoiceRecorder() {
  const gate = usePermissionGate();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [error, setError] = useState(false);

  /** 'denied': нет доступа (объяснение уже показано), 'failed': запись не началась. */
  const start = useCallback(async (): Promise<'started' | 'denied' | 'failed'> => {
    setError(false);
    if (!(await gate.ensure('microphone'))) return 'denied';
    try {
      // iOS: запись требует режима аудиосессии с записью; воспроизведение потом вернёт обычный режим
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return 'started';
    } catch {
      setError(true);
      return 'failed';
    }
  }, [gate, recorder]);

  const finish = useCallback(async (): Promise<string | null> => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
      return recorder.uri ?? null;
    } catch {
      setError(true);
      return null;
    }
  }, [recorder]);

  return { gate, isRecording: state.isRecording, error, clearError: () => setError(false), start, finish };
}
