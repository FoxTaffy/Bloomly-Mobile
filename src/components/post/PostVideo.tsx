import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, Video as VideoIcon, Volume2, VolumeX } from 'lucide-react-native';
import { useAppState } from '@/hooks/useAppState';
import { useT } from '@/hooks/useT';
import { useActiveVideo } from '@/stores/activeVideo';
import { colors } from '@/theme/tokens';

interface PostVideoProps {
  url: string;
  width: number;
  height: number;
  /** Страница карусели на экране (у видео не на текущей странице воспроизведение останавливается). */
  pageActive: boolean;
  /** Пост виден в списке. */
  postVisible: boolean;
  /** Режим 18+ «размыт»: показываем закрытую плашку, видео не загружаем (кадр размыть нельзя, поэтому не показываем вовсе). */
  concealed: boolean;
}

/**
 * Видео поста: кадра-заставки нет (сервер не отдаёт превью), поэтому плашка «воспроизвести»; плеер создаётся только после
 * нажатия, звук выключен по умолчанию, автозапуска нет. Останавливается при прокрутке, смене страницы карусели, уходе с экрана,
 * сворачивании приложения и запуске другого видео.
 */
export function PostVideo({ url, width, height, pageActive, postVisible, concealed }: PostVideoProps) {
  const { t } = useT();
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(true);
  const activeUrl = useActiveVideo((s) => s.url);
  const setActive = useActiveVideo((s) => s.set);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useAppState({ onBackground: () => setAppActive(false), onActive: () => setAppActive(true) });

  const mayPlay = postVisible && pageActive && focused && appActive && !concealed;
  useEffect(() => {
    if (!mayPlay) setStarted(false);
  }, [mayPlay]);
  // Запустилось другое видео
  useEffect(() => {
    if (started && activeUrl !== url) setStarted(false);
  }, [activeUrl, started, url]);

  const box = { width, height };

  if (concealed) {
    return (
      <View style={box} className="items-center justify-center bg-brand-bg">
        <VideoIcon size={28} color={colors.mutedIcon} />
        <Text className="mt-1 font-nunito-bold text-xs text-brand-muted">{t('mNsfwHidden')}</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <Pressable
        onPress={() => {
          setActive(url);
          setStarted(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('mPlayVideo')}
        style={box}
        className="items-center justify-center bg-brand-card"
      >
        <View className="h-14 w-14 items-center justify-center rounded-full bg-black/55">
          <Play size={26} color={colors.offwhite} fill={colors.offwhite} />
        </View>
        <Text className="mt-2 font-nunito text-xs text-brand-muted">{t('mVideoTapToPlay')}</Text>
      </Pressable>
    );
  }

  return <ActiveVideo url={url} width={width} height={height} />;
}

function ActiveVideo({ url, width, height }: { url: string; width: number; height: number }) {
  const { t } = useT();
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(url, (p) => {
    p.muted = true; // звук выключен по умолчанию, включается кнопкой
    p.loop = false;
    p.staysActiveInBackground = false;
    p.play();
  });

  const toggleMute = () => {
    player.muted = !player.muted;
    setMuted(player.muted);
  };

  return (
    <View style={{ width, height }} className="bg-black">
      <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls allowsPictureInPicture={false} />
      <Pressable
        onPress={toggleMute}
        accessibilityRole="button"
        accessibilityLabel={muted ? t('mVideoUnmute') : t('mVideoMute')}
        hitSlop={8}
        className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-black/55"
      >
        {muted ? <VolumeX size={18} color={colors.offwhite} /> : <Volume2 size={18} color={colors.offwhite} />}
      </Pressable>
    </View>
  );
}
