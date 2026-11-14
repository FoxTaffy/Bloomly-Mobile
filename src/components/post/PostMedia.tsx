import { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { PostVideo } from './PostVideo';
import { useIsPostVisible } from '@/hooks/usePostVisibility';
import { mediaSource } from '@/lib/mediaAuth';
import { isVideoUrl, visualMedia } from '@/shared/media';

interface PostMediaProps {
  postId: string;
  urls: string[];
  width: number;
  /** Пост отмечен 18+ и режим не «показан»: в режиме 'blur' изображения размываются, видео закрыто плашкой. */
  nsfwBlur: boolean;
}

/** Карусель вложений поста: изображения и видео (файлы PSD и архивы не показываются). */
export function PostMedia({ postId, urls, width, nsfwBlur }: PostMediaProps) {
  const media = visualMedia(urls);
  const [page, setPage] = useState(0);
  const visible = useIsPostVisible(postId);
  const height = width * 0.75;
  if (media.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View className="mb-3 overflow-hidden rounded-2xl">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {media.map((url, i) =>
          isVideoUrl(url) ? (
            <PostVideo key={url} url={url} width={width} height={height} pageActive={i === page} postVisible={visible} concealed={nsfwBlur} />
          ) : (
            <Image key={url} source={mediaSource(url)} style={{ width, height }} contentFit="cover" blurRadius={nsfwBlur ? 40 : 0} />
          ),
        )}
      </ScrollView>
      {media.length > 1 ? (
        <View className="absolute bottom-2.5 left-0 right-0 flex-row justify-center gap-1.5" pointerEvents="none">
          {media.map((url, i) => (
            <View key={url} className={`h-1.5 rounded-full ${i === page ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
