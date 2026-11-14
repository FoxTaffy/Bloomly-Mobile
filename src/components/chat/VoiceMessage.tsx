import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { useAppState } from '@/hooks/useAppState';
import { useT } from '@/hooks/useT';
import { mediaHeaders } from '@/lib/mediaAuth';
import { formatClock, progressOf } from '@/shared/duration';
import { useActiveVoice } from '@/stores/activeVoice';
import { colors } from '@/theme/tokens';

/** Сколько ждём загрузку файла, прежде чем показать ошибку. */
const LOAD_TIMEOUT_MS = 15_000;

interface VoiceMessageProps {
  id: string;
  url: string;
  isMine: boolean;
}

/**
 * Голосовое сообщение: воспроизведение, пауза, длительность, прогресс. Плеер создаётся по нажатию (как видео в постах),
 * играет одно сообщение за раз; останавливается при уходе с экрана, сворачивании и запуске другого. Фонового воспроизведения нет.
 */
export function VoiceMessage({ id, url, isMine }: VoiceMessageProps) {
  const [engaged, setEngaged] = useState(false);
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(true);
  const activeId = useActiveVoice((s) => s.id);
  const setActive = useActiveVoice((s) => s.set);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useAppState({ onBackground: () => setAppActive(false), onActive: () => setAppActive(true) });

  useEffect(() => {
    if (engaged && activeId !== id) setEngaged(false); // запустилось другое сообщение
  }, [activeId, engaged, id]);
  useEffect(() => {
    if (!focused || !appActive) setEngaged(false);
  }, [focused, appActive]);

  const onEnded = useCallback(() => setEngaged(false), []);

  if (!engaged) {
    return (
      <Layout
        isMine={isMine}
        playing={false}
        loading={false}
        failed={false}
        current={0}
        total={0}
        showTime={false}
        onToggle={() => {
          setActive(id);
          setEngaged(true);
        }}
      />
    );
  }
  return <ActiveVoice url={url} isMine={isMine} onEnded={onEnded} />;
}

function ActiveVoice({ url, isMine, onEnded }: { url: string; isMine: boolean; onEnded: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  // Закрытые файлы сообщений читаются с Bearer мобильного клиента; attempt пересоздаёт источник при повторе
  const source = useMemo(() => ({ uri: url, headers: mediaHeaders(url) }), [url, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let cancelled = false;
    // После записи сессия могла остаться в режиме записи (iOS тише, через разговорный динамик): переключаем на воспроизведение
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' })
      .catch(() => {})
      .then(() => {
        if (!cancelled) player.play();
      });
    return () => {
      cancelled = true;
      try {
        player.pause();
      } catch {
        // плеер уже освобождён
      }
    };
  }, [player]);

  useEffect(() => {
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  useEffect(() => {
    if (status.didJustFinish) onEnded();
  }, [status.didJustFinish, onEnded]);

  const failed = !!status.error || (timedOut && !status.isLoaded);
  const toggle = () => {
    if (failed) return setAttempt((n) => n + 1);
    if (status.playing) player.pause();
    else player.play();
  };

  return (
    <Layout isMine={isMine} playing={status.playing} loading={!status.isLoaded && !failed} failed={failed} current={status.currentTime} total={status.duration} showTime onToggle={toggle} />
  );
}

function Layout({ isMine, playing, loading, failed, current, total, showTime, onToggle }: {
  isMine: boolean;
  playing: boolean;
  loading: boolean;
  failed: boolean;
  current: number;
  total: number;
  showTime: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();
  const fg = isMine ? colors.offwhite : colors.accentMinus;
  const label = failed ? t('mVoiceRetry') : playing ? t('mVoicePause') : t('mVoicePlay');
  const progress = progressOf(current, total);
  return (
    <View className="min-w-[200px] flex-row items-center gap-3">
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-black/25 active:opacity-70">
        {failed ? <RotateCcw size={18} color={fg} /> : playing ? <Pause size={18} color={fg} fill={fg} /> : <Play size={18} color={fg} fill={fg} />}
      </Pressable>
      <View className="flex-1">
        {failed ? (
          <Text className="font-nunito text-xs text-brand-offwhite">{t('mVoiceLoadFailed')}</Text>
        ) : (
          <>
            <View className="h-1.5 overflow-hidden rounded-full bg-black/25" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
              <View className="h-full rounded-full bg-brand-offwhite" style={{ width: `${Math.round(progress * 100)}%` }} />
            </View>
            <Text className="mt-1 font-nunito text-[11px] text-brand-offwhite">
              {showTime ? `${formatClock(current)} / ${loading && !total ? '…' : formatClock(total)}` : t('chatVoiceMessageTitle')}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
