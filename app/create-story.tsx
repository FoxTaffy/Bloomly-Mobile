import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { RotateCcw, Video, X } from 'lucide-react-native';
import { PermissionDeniedSheet } from '@/components/PermissionDeniedSheet';
import { Button, Screen } from '@/components/ui';
import { usePostMedia } from '@/hooks/usePostMedia';
import { usePublishStory } from '@/hooks/useStories';
import { useT } from '@/hooks/useT';
import { apiErrorCode, apiErrorMessage } from '@/shared/apiError';
import { MAX_ACTIVE_STORIES } from '@/shared/stories';
import { colors } from '@/theme/tokens';

/**
 * Новая история. Веб истории создавать не умеет (StoryMobileOnlyModal: «только в приложении»), поэтому логика — от бэкенда:
 * файл загружается как у поста (папка posts, лимиты тарифа), затем POST /stories {image_url | video_url}; живёт 24 часа.
 */
export default function CreateStoryScreen() {
  const { t } = useT();
  const router = useRouter();
  const media = usePostMedia({ max: 1 });
  const publish = usePublishStory();
  const item = media.items[0];
  const url = media.mediaUrls[0];
  const canPublish = !!item && !!url && !media.uploading && !media.failed && !publish.isPending;

  const close = () => {
    if (!item) return router.back();
    Alert.alert(t('mDiscardPostTitle'), t('mStoryDiscardHint'), [
      { text: t('mKeepEditing'), style: 'cancel' },
      { text: t('mDiscard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const submit = () => {
    if (!canPublish || !item) return;
    publish.mutate(item.isVideo ? { video_url: url } : { image_url: url }, {
      onSuccess: () => {
        media.clear();
        router.back();
      },
    });
  };

  const error = publish.isError
    ? apiErrorCode(publish.error) === 'STORY_LIMIT_EXCEEDED'
      ? t('mStoryLimit', { n: MAX_ACTIVE_STORIES })
      : (apiErrorMessage(publish.error) ?? t('mStoryPublishFailed'))
    : null;

  return (
    <Screen onBackPress={() => (item ? (close(), true) : false)}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('mClose')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <X size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-lg text-brand-offwhite">{t('mStoryNewTitle')}</Text>
        <Button title={publish.isPending ? t('publishing') : t('publish')} loading={publish.isPending} disabled={!canPublish && !publish.isPending} onPress={submit} className="min-h-9 px-4 py-2" />
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        {item ? (
          <View className="aspect-[9/16] max-h-[460px] w-full self-center overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
            {item.isVideo ? (
              <View className="flex-1 items-center justify-center">
                <Video size={40} color={colors.mutedIcon} />
              </View>
            ) : (
              <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            )}
            {item.status === 'uploading' ? (
              <View className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                <View className="h-full bg-brand-accent" style={{ width: `${Math.round(item.progress * 100)}%` }} />
              </View>
            ) : null}
            {item.status === 'error' ? (
              <Pressable onPress={() => media.retry(item.id)} accessibilityRole="button" accessibilityLabel={t('mRetry')} className="absolute inset-0 items-center justify-center bg-black/60 px-4">
                <RotateCcw size={22} color={colors.offwhite} />
                <Text className="mt-2 text-center font-nunito text-xs text-brand-offwhite">{item.error}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => media.remove(item.id)} accessibilityRole="button" accessibilityLabel={t('mRemove')} hitSlop={6} className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60">
              <X size={16} color={colors.offwhite} />
            </Pressable>
          </View>
        ) : (
          <View className="gap-2">
            <Button title={t('mAddFromLibrary')} variant="secondary" onPress={() => void media.pickFromLibrary()} />
            <Button title={t('mAddFromCamera')} variant="secondary" onPress={() => void media.takeWithCamera()} />
          </View>
        )}
        {media.notice ? <Text className="font-nunito-bold text-xs text-brand-error">{media.notice}</Text> : null}
        <Text className="font-nunito text-xs text-brand-muted">{t('mStoryHint')}</Text>
        {error ? <Text className="font-nunito-bold text-sm text-brand-error">{error}</Text> : null}
      </ScrollView>
      <PermissionDeniedSheet gate={media.gate} />
    </Screen>
  );
}
