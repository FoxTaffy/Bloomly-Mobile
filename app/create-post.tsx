import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ImagePlus, RotateCcw, Video, X } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { PermissionDeniedSheet } from '@/components/PermissionDeniedSheet';
import { Button, Chip, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { usePublishPost, useTagSuggestions } from '@/hooks/useComposer';
import { usePost } from '@/hooks/usePost';
import { useEditPost } from '@/hooks/usePostActions';
import { usePostMedia, type MediaItem } from '@/hooks/usePostMedia';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';
import { extractHashtags, sanitizeTagInput } from '@/shared/hashtags';
import { MAX_POST_MEDIA } from '@/shared/uploadLimits';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

type Visibility = 'public' | 'subscriber_only';

/** Новый пост. Веб-аналог: components/feed/PostComposer.vue (текст, медиа, теги, NSFW, пометка ИИ, видимость). Черновики, журналы, соавторы и группы — позже. */
export default function CreatePostScreen() {
  const { t } = useT();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const media = usePostMedia();
  const publish = usePublishPost();
  // Правка своего поста: /create-post?edit=<id> (web: PostCard.vue startEdit/saveEdit — текст, теги, NSFW, пометка ИИ)
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = typeof edit === 'string' ? edit : '';
  const editing = !!editId;
  const original = usePost(editId);
  const save = useEditPost(editId);
  const loaded = useRef(false);

  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isNsfw, setIsNsfw] = useState(false);
  const [isAi, setIsAi] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [error, setError] = useState<string | null>(null);
  const suggestions = useTagSuggestions(tagInput).filter((s) => !tags.includes(s.name)).slice(0, 8);

  const source = original.data;
  useEffect(() => {
    if (!editing || !source || loaded.current) return;
    loaded.current = true;
    setContent(source.content ?? '');
    setTags((source.tags ?? []).map((x) => x.tag.name));
    setIsNsfw(!!source.is_nsfw);
    setIsAi(!!source.is_ai_generated);
  }, [editing, source]);

  const pending = publish.isPending || save.isPending;
  const keptMedia = editing ? (source?.media_urls.length ?? 0) : 0;
  const hasContent = !!content.trim() || media.mediaUrls.length > 0 || keptMedia > 0;
  const dirty = editing
    ? !!source &&
      (content !== (source.content ?? '') ||
        tags.join(',') !== (source.tags ?? []).map((x) => x.tag.name).join(',') ||
        isNsfw !== !!source.is_nsfw ||
        isAi !== !!source.is_ai_generated)
    : !!content.trim() || media.items.length > 0 || tags.length > 0;
  const canPublish = hasContent && !media.uploading && !media.failed && !pending && (!editing || !!source);

  const addTag = (raw: string) => {
    const name = sanitizeTagInput(raw.replace(/^\s*#/, ''));
    if (name && !tags.includes(name)) setTags((l) => [...l, name]);
    setTagInput('');
  };

  const close = () => {
    if (!dirty) return router.back();
    Alert.alert(t('mDiscardPostTitle'), t('mDiscardPostHint'), [
      { text: t('mKeepEditing'), style: 'cancel' },
      { text: t('mDiscard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const submit = () => {
    if (media.uploading) return setError(t('mPostUploadingWait'));
    if (media.failed) return setError(t('mPostFailedMedia'));
    if (!canPublish) return;
    setError(null);
    const text = content.trim();
    // Последний «#тег» без пробела мог не попасть в список: итоговый проход, как на вебе
    const allTags = Array.from(new Set([...tags, ...extractHashtags(text)]));
    if (editing) {
      // Вложения при правке в приложении не меняются: новых не добавляем
      return save.mutate(
        { content: text, tags: allTags, isNsfw, isAiGenerated: isAi, addMediaUrls: [], addMediaOriginalUrls: [] },
        { onSuccess: () => router.back(), onError: (e) => setError(apiErrorMessage(e) ?? t('mPostSaveFailed')) },
      );
    }
    publish.mutate(
      {
        content: text,
        tags: allTags,
        isNsfw,
        isAiGenerated: isAi,
        mediaUrls: media.mediaUrls,
        mediaOriginalUrls: media.mediaOriginalUrls,
        subscriberOnly: visibility === 'subscriber_only',
      },
      {
        onSuccess: () => {
          media.clear();
          router.back();
        },
        onError: (e) => setError(apiErrorMessage(e) ?? t('mPostPublishFailed')),
      },
    );
  };

  return (
    <Screen keyboard onBackPress={() => (dirty ? (close(), true) : false)}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('mClose')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <X size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-lg text-brand-offwhite">{editing ? t('mEditPostTitle') : t('mNewPostTitle')}</Text>
        <Button title={editing ? t('mSave') : publish.isPending ? t('publishing') : t('publish')} loading={pending} disabled={!canPublish && !pending} onPress={submit} className="min-h-9 py-2" />
      </View>

      {editing && !source ? (
        <View className="gap-3 px-4 pt-2">
          {original.isError ? <ErrorState onRetry={() => original.refetch()} /> : <Skeleton height={160} />}
        </View>
      ) : (
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start gap-3">
          <Avatar uri={user?.avatar_url} name={user?.display_name ?? user?.username} size={40} />
          <Field value={content} onChangeText={setContent} placeholder={t('mPostPlaceholder')} multiline autoFocus className="flex-1" />
        </View>

        {media.items.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {media.items.map((item) => (
              <MediaTile key={item.id} item={item} onRemove={() => media.remove(item.id)} onRetry={() => media.retry(item.id)} />
            ))}
          </View>
        ) : null}
        {media.notice ? <Text className="font-nunito-bold text-xs text-brand-error">{media.notice}</Text> : null}

        {editing ? (
          keptMedia > 0 ? <Text className="font-nunito text-xs text-brand-muted">{t('mEditMediaNote', { n: keptMedia })}</Text> : null
        ) : (
        <View className="flex-row gap-2">
          <Button title={`${t('mAddFromLibrary')} · ${media.items.length}/${MAX_POST_MEDIA}`} variant="secondary" onPress={() => void media.pickFromLibrary()} className="flex-1" />
          <Button title={t('mAddFromCamera')} variant="secondary" onPress={() => void media.takeWithCamera()} />
        </View>
        )}

        <View className="gap-2">
          {tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => (
                <Pressable key={tag} onPress={() => setTags((l) => l.filter((x) => x !== tag))} accessibilityRole="button" accessibilityLabel={`#${tag}: ${t('mRemove')}`} className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-brand-border bg-brand-card px-3">
                  <Text className="font-nunito-bold text-sm text-brand-offwhite">#{tag}</Text>
                  <X size={12} color={colors.mutedIcon} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <Field value={tagInput} onChangeText={setTagInput} placeholder={t('mTagPlaceholder')} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => addTag(tagInput)} />
          {suggestions.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {suggestions.map((s) => (
                <Chip key={s.name} label={`#${s.name}`} onPress={() => addTag(s.name)} />
              ))}
            </View>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Chip label={t('mNsfwLabel')} selected={isNsfw} onPress={() => setIsNsfw((v) => !v)} />
          <Chip label={t('aiGenBadge')} selected={isAi} onPress={() => setIsAi((v) => !v)} />
        </View>
        {isAi ? <Text className="font-nunito text-xs text-brand-muted">{t('aiGenToggleTitle')}</Text> : null}

        {editing ? null : (
        <View className="flex-row flex-wrap gap-2">
          <Chip label={t('mVisibilityPublic')} selected={visibility === 'public'} onPress={() => setVisibility('public')} />
          <Chip label={t('mVisibilitySubscribers')} selected={visibility === 'subscriber_only'} onPress={() => setVisibility('subscriber_only')} />
        </View>
        )}

        {error ? <Text className="font-nunito-bold text-sm text-brand-error">{error}</Text> : null}
      </ScrollView>
      )}
      <PermissionDeniedSheet gate={media.gate} />
    </Screen>
  );
}

const TILE = 96;

function MediaTile({ item, onRemove, onRetry }: { item: MediaItem; onRemove: () => void; onRetry: () => void }) {
  const { t } = useT();
  return (
    <View style={{ width: TILE, height: TILE }} className="overflow-hidden rounded-xl border border-brand-border bg-brand-card">
      {item.isVideo ? (
        <View className="flex-1 items-center justify-center">
          <Video size={28} color={colors.mutedIcon} />
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
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('mRetry')} className="absolute inset-0 items-center justify-center bg-black/60 px-1">
          <RotateCcw size={18} color={colors.offwhite} />
          <Text numberOfLines={3} className="mt-1 text-center font-nunito text-[10px] text-brand-offwhite">{item.error}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('mRemove')} hitSlop={6} className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60">
        <X size={12} color={colors.offwhite} />
      </Pressable>
    </View>
  );
}
