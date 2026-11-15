import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ImageOff } from 'lucide-react-native';
import { mediaSource } from '@/lib/mediaAuth';
import type { Story } from '@/shared/api-types';
import { colors } from '@/theme/tokens';

interface StoryMediaProps {
  story: Story;
  paused: boolean;
  muted: boolean;
  /** Медиа загрузилось: у фото запускается таймер. */
  onReady: () => void;
  /** Доля воспроизведения видео (для полоски прогресса). */
  onFraction: (f: number) => void;
  /** Видео доиграло до конца. */
  onEnd: () => void;
}

/** Медиа истории на весь экран. Закрытые файлы читаются с токеном только на наш хост (`mediaSource`). */
export const StoryMedia = memo(function StoryMedia(props: StoryMediaProps) {
  const { story } = props;
  if (story.video_url) return <StoryVideo url={story.video_url} {...props} />;
  return <StoryImage url={story.image_url} onReady={props.onReady} />;
});

function StoryImage({ url, onReady }: { url: string | null; onReady: () => void }) {
  const [failed, setFailed] = useState(false);
  const source = useMemo(() => (url ? mediaSource(url) : null), [url]);
  // Не загрузилось: таймер всё равно идёт, чтобы просмотр не завис на пустой истории
  useEffect(() => {
    if (!source) onReady();
  }, [source, onReady]);
  if (!source || failed) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ImageOff size={40} color={colors.mutedIcon} />
      </View>
    );
  }
  return (
    <Image
      source={source}
      style={{ flex: 1 }}
      contentFit="contain"
      onLoad={onReady}
      onError={() => {
        setFailed(true);
        onReady();
      }}
    />
  );
}

function StoryVideo({ url, paused, muted, onReady, onFraction, onEnd }: StoryMediaProps & { url: string }) {
  const source = useMemo(() => mediaSource(url), [url]);
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = true; // звук включается кнопкой, как на вебе
    p.timeUpdateEventInterval = 0.1;
    p.staysActiveInBackground = false;
    p.play();
  });
  const cb = useRef({ onReady, onFraction, onEnd });
  cb.current = { onReady, onFraction, onEnd };

  useEffect(() => {
    const status = player.addListener('statusChange', ({ status: st }) => {
      if (st === 'readyToPlay') cb.current.onReady();
      // Не открылось: как с фото, не зависаем
      if (st === 'error') {
        cb.current.onReady();
        cb.current.onEnd();
      }
    });
    const time = player.addListener('timeUpdate', ({ currentTime }) => {
      const d = player.duration;
      if (d > 0) cb.current.onFraction(Math.min(1, currentTime / d));
    });
    const end = player.addListener('playToEnd', () => cb.current.onEnd());
    return () => {
      status.remove();
      time.remove();
      end.remove();
    };
  }, [player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);

  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} />;
}
