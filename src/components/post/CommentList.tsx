import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ArrowBigDown, ArrowBigUp, Trash2 } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { ContentMenu } from '@/components/ContentMenu';
import { PostText } from '@/components/post/PostText';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { Comment } from '@/shared/api-types';
import { useT } from '@/hooks/useT';
import { useCommentVote, useDeleteComment } from '@/hooks/usePostActions';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

// Как на вебе (PostComments.vue): сначала две реплики, остальные по кнопке.
const REPLIES_PREVIEW = 2;

interface CommentCommon {
  postId: string;
  /** Модератор поста может удалять чужие комментарии (сервер отдаёт canModerate вместе со списком). */
  canModerate?: boolean;
}

function CommentBody({ comment, onReply, nested, postId, canModerate }: CommentCommon & { comment: Comment; onReply?: (c: Comment) => void; nested?: boolean }) {
  const timeAgo = useTimeAgo();
  const { t } = useT();
  const author = comment.author;
  const name = comment.group?.name ?? author?.display_name ?? author?.username ?? 'Bloomly';
  const myId = useSession((s) => s.user?.id);
  const { vote, rating, failed, cast } = useCommentVote(comment);
  const del = useDeleteComment(postId);
  // Удалять можно свой комментарий или любой — модератору (web: PostComments.vue)
  const canDelete = !!myId && ((comment.author_id ?? author?.id) === myId || !!canModerate);
  const confirmDelete = () =>
    Alert.alert(t('mDeleteCommentTitle'), t('mDeleteHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('mDelete'), style: 'destructive', onPress: () => del.mutate(comment.id) },
    ]);
  return (
    <View className={`flex-row gap-3 ${nested ? 'mt-3' : ''}`}>
      <Avatar uri={comment.group?.avatar_url ?? author?.avatar_url} name={name} size={nested ? 28 : 34} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Text className="flex-shrink font-nunito-bold text-sm text-brand-offwhite" numberOfLines={1}>{name}</Text>
          {author?.is_verified ? <VerifiedBadge size={12} /> : null}
          <Text className="font-nunito text-xs text-brand-muted"> · {timeAgo(comment.created_at)}</Text>
          <View className="flex-1 items-end">
            {/* В бэкенде нет цели «comment»: жалоба уходит на автора (user) с цитатой комментария */}
            {author ? <ContentMenu size={16} report={{ type: 'user', id: author.id, evidence: comment.content }} author={{ id: author.id, name: author.username }} /> : null}
          </View>
        </View>
        <PostText text={comment.content} className="mt-0.5 font-nunito leading-5 text-brand-offwhite" />
        <View className="mt-1 flex-row items-center gap-4">
          <View className="flex-row items-center">
            <Pressable onPress={() => void cast(1)} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: vote === 1 }} accessibilityLabel={t('mUpvote')} className="p-0.5 active:opacity-60">
              <ArrowBigUp size={18} color={vote === 1 ? colors.success : colors.mutedIcon} fill={vote === 1 ? colors.success : 'transparent'} />
            </Pressable>
            <Text className={`min-w-5 text-center font-nunito-bold text-xs ${vote === 1 ? 'text-brand-success' : vote === -1 ? 'text-brand-error' : 'text-brand-muted'}`}>{rating}</Text>
            <Pressable onPress={() => void cast(-1)} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: vote === -1 }} accessibilityLabel={t('mDownvote')} className="p-0.5 active:opacity-60">
              <ArrowBigDown size={18} color={vote === -1 ? colors.error : colors.mutedIcon} fill={vote === -1 ? colors.error : 'transparent'} />
            </Pressable>
          </View>
          {onReply ? (
            <Pressable onPress={() => onReply(comment)} hitSlop={8} accessibilityRole="button" className="active:opacity-60">
              <Text className="font-nunito-bold text-xs text-brand-muted">{t('reply')}</Text>
            </Pressable>
          ) : null}
          {canDelete ? (
            <Pressable onPress={confirmDelete} disabled={del.isPending} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('mDelete')} className={`active:opacity-60 ${del.isPending ? 'opacity-50' : ''}`}>
              <Trash2 size={15} color={colors.mutedIcon} />
            </Pressable>
          ) : null}
        </View>
        {failed ? <Text className="mt-1 font-nunito text-xs text-brand-error">{t('commentsVoteFail')}</Text> : null}
        {del.isError ? <Text className="mt-1 font-nunito text-xs text-brand-error">{t('commentsDeleteFail')}</Text> : null}
      </View>
    </View>
  );
}

export function CommentItem({ comment, onReply, postId, canModerate }: CommentCommon & { comment: Comment; onReply?: (c: Comment) => void }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const replies = comment.replies ?? [];
  const shown = expanded ? replies : replies.slice(0, REPLIES_PREVIEW);
  return (
    <View className="border-b border-brand-border py-3">
      <CommentBody comment={comment} onReply={onReply} postId={postId} canModerate={canModerate} />
      {shown.length > 0 ? (
        <View className="ml-10">
          {shown.map((r) => (
            // Ответ на реплику привязывается к корневому комментарию, как на вебе (глубина — один уровень).
            <CommentBody key={r.id} comment={r} nested postId={postId} canModerate={canModerate} onReply={onReply ? () => onReply(comment) : undefined} />
          ))}
          {replies.length > REPLIES_PREVIEW ? (
            <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} className="mt-2 self-start active:opacity-60">
              <Text className="font-nunito-bold text-xs text-brand-accent-minus">
                {expanded ? t('commentsCollapseReplies') : t('commentsMoreReplies', { n: replies.length - REPLIES_PREVIEW })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
