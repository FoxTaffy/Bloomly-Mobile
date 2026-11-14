import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, PawPrint, SendHorizontal, ShieldAlert, X } from 'lucide-react-native';
import { CommentItem } from '@/components/post/CommentList';
import { PostCard } from '@/components/PostCard';
import { Button, EmptyState, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { useCreateComment, usePost, usePostComments } from '@/hooks/usePost';
import { useRepawPost, useVotePost } from '@/hooks/usePosts';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { apiErrorMessage, isNotFound } from '@/shared/apiError';
import type { Comment } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

/** Пост и комментарии. Веб-аналог: views/PostView.vue + components/PostComments.vue. */
export default function PostScreen() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const postQuery = usePost(id);
  const commentsQuery = usePostComments(id);
  const createComment = useCreateComment(id);
  const vote = useVotePost();
  const repaw = useRepawPost();
  const { canUseNsfw, setNsfwMode, nsfwMode } = useNsfwMode();

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const post = postQuery.data;
  const comments = commentsQuery.data?.comments ?? [];
  const commentsClosed = !!post?.comments_disabled;

  const submit = () => {
    const content = draft.trim();
    if (!content || createComment.isPending) return;
    setSendError(null);
    createComment.mutate(
      { content, parentId: replyTo?.id },
      {
        onSuccess: () => {
          setDraft('');
          setReplyTo(null);
        },
        onError: (e) => setSendError(apiErrorMessage(e) ?? t('mCommentSendFailed')),
      },
    );
  };

  const back = (
    <View className="flex-row items-center gap-3 px-4 py-2">
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
        <ChevronLeft size={18} color={colors.offwhite} />
      </Pressable>
      <Text className="font-nunito-extrabold text-xl text-brand-offwhite">{t('groupDetailPostLabel')}</Text>
    </View>
  );

  if (postQuery.isLoading) {
    return (
      <Screen>
        {back}
        <View className="gap-3 px-4 pt-2">
          <Skeleton height={180} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      </Screen>
    );
  }

  if (postQuery.isError) {
    return (
      <Screen>
        {back}
        {isNotFound(postQuery.error) ? (
          <EmptyState
            icon={<PawPrint size={44} color={colors.mutedIcon} />}
            title={t('mPostNotFound')}
            hint={t('mPostNotFoundHint')}
            action={<Button title={t('goHome')} onPress={() => router.replace('/')} />}
          />
        ) : (
          <ErrorState onRetry={() => postQuery.refetch()} />
        )}
      </Screen>
    );
  }

  if (!post) return <Screen>{back}<ErrorState onRetry={() => postQuery.refetch()} /></Screen>;

  // 18+: на вебе 'hide' скрывает такие посты. Взрослым даём открыть вручную, остальным — объяснение.
  if (post.is_nsfw && nsfwMode === 'hide') {
    return (
      <Screen>
        {back}
        <EmptyState
          icon={<ShieldAlert size={44} color={colors.warning} />}
          title={t('dealersDenNsfwContentLabel')}
          hint={canUseNsfw ? t('mNsfwPostAskShow') : t('mNsfwPostAdultsOnly')}
          action={canUseNsfw ? <Button title={t('mShow')} onPress={() => setNsfwMode('show')} /> : undefined}
        />
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <FlatList<Comment>
        data={commentsClosed ? [] : comments}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 pb-4"
        ListHeaderComponent={
          <View>
            {back}
            <PostCard post={post} interactive={false} onVote={(value) => vote.mutate({ id: post.id, value })} onRepaw={() => repaw.mutate(post.id)} />
            <Text className="mb-1 mt-2 font-nunito-bold text-xs text-brand-muted">{t('mCommentsCaps')}</Text>
          </View>
        }
        renderItem={({ item }) => <CommentItem comment={item} onReply={commentsClosed ? undefined : setReplyTo} />}
        ListEmptyComponent={
          commentsClosed ? (
            <EmptyState title={t('mCommentsClosed')} hint={t('mCommentsClosedHint')} />
          ) : commentsQuery.isLoading ? (
            <View className="gap-3"><Skeleton height={44} /><Skeleton height={44} /></View>
          ) : commentsQuery.isError ? (
            <ErrorState title={t('mCommentsLoadFailed')} onRetry={() => commentsQuery.refetch()} />
          ) : (
            <EmptyState title={t('noComments')} hint={t('mBeFirst')} />
          )
        }
      />
      {commentsClosed ? null : (
        <View className="border-t border-brand-border bg-brand-bg px-4 py-2">
          {replyTo ? (
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-nunito text-xs text-brand-muted" numberOfLines={1}>
                {t('mReplyTo', { name: replyTo.author?.username ?? replyTo.group?.name ?? 'Bloomly' })}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('mCancelReply')}>
                <X size={16} color={colors.mutedIcon} />
              </Pressable>
            </View>
          ) : null}
          {sendError ? <Text className="mb-2 font-nunito text-xs text-brand-error">{sendError}</Text> : null}
          <View className="flex-row items-end gap-2">
            <Field value={draft} onChangeText={setDraft} placeholder={t('mWriteComment')} multiline className="flex-1" />
            <Pressable
              onPress={submit}
              disabled={!draft.trim() || createComment.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('send')}
              className={`h-11 w-11 items-center justify-center rounded-full bg-brand-accent ${!draft.trim() || createComment.isPending ? 'opacity-50' : ''}`}
            >
              <SendHorizontal size={18} color={colors.offwhite} />
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
