import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ErrorState, Sheet, Skeleton } from '@/components/ui';
import { useAlbum, useAlbums } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import { mediaSource } from '@/lib/mediaAuth';
import { colors } from '@/theme/tokens';
import { ImageOff } from 'lucide-react-native';

/** Альбомы профиля: сетка обложек и просмотр альбома. Только чтение; доступ к альбомам решает сервер (приватность). Веб: AlbumsPanel.vue. */
export function AlbumsTab({ userId }: { userId: string }) {
  const { t } = useT();
  const albums = useAlbums(userId, true);
  const [openId, setOpenId] = useState<string | null>(null);
  const album = useAlbum(openId);

  if (albums.isLoading) return <View className="gap-3 px-4"><Skeleton height={140} /></View>;
  if (albums.isError) return <ErrorState onRetry={() => albums.refetch()} />;
  const list = albums.data ?? [];
  if (list.length === 0) return <Text className="px-4 py-10 text-center font-nunito text-sm text-brand-muted">{t('mAlbumsEmpty')}</Text>;

  return (
    <>
      <View className="flex-row flex-wrap gap-3 px-4 pb-6">
        {list.map((a) => {
          const cover = a.items[0]?.media_url;
          return (
            <Pressable key={a.id} onPress={() => setOpenId(a.id)} accessibilityRole="button" accessibilityLabel={a.title} className="w-[47%] overflow-hidden rounded-2xl border border-brand-border bg-brand-card active:opacity-80">
              <View className="aspect-square items-center justify-center bg-brand-bg">
                {cover ? <Image source={mediaSource(cover)} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <ImageOff size={24} color={colors.mutedIcon} />}
              </View>
              <View className="p-2.5">
                <Text numberOfLines={1} className="font-nunito-bold text-sm text-brand-offwhite">{a.title}</Text>
                <Text className="font-nunito text-xs text-brand-muted">{t('mAlbumItems', { n: a._count?.items ?? a.items.length })}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Sheet visible={!!openId} title={album.data?.title ?? t('mAlbumsTab')} onClose={() => setOpenId(null)}>
        <View className="max-h-[70%] pb-2">
          {album.isLoading ? (
            <Skeleton height={160} />
          ) : album.isError || !album.data ? (
            <ErrorState onRetry={() => album.refetch()} />
          ) : (
            <ScrollView>
              {album.data.description ? <Text className="mb-3 font-nunito text-sm text-brand-muted">{album.data.description}</Text> : null}
              <View className="flex-row flex-wrap gap-1.5">
                {album.data.items.map((i) => (
                  <Image key={i.media_url} source={mediaSource(i.media_url)} style={{ width: '31.5%', aspectRatio: 1, borderRadius: 8 }} contentFit="cover" />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </Sheet>
    </>
  );
}
