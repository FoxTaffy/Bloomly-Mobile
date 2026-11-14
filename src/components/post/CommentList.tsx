import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { timeAgo } from '@/lib/time';
import type { Comment } from '@/shared/api-types';

// Как на вебе (PostComments.vue): сначала две реплики, остальные по кнопке.
const REPLIES_PREVIEW = 2;

function CommentBody({ comment, onReply, nested }: { comment: Comment; onReply?: (c: Comment) => void; nested?: boolean }) {
  const author = comment.author;
  const name = comment.group?.name ?? author?.display_name ?? author?.username ?? 'Bloomly';
  return (
    <View className={`flex-row gap-3 ${nested ? 'mt-3' : ''}`}>
      <Avatar uri={comment.group?.avatar_url ?? author?.avatar_url} name={name} size={nested ? 28 : 34} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Text className="flex-shrink font-nunito-bold text-sm text-brand-offwhite" numberOfLines={1}>{name}</Text>
          {author?.is_verified ? <VerifiedBadge size={12} /> : null}
          <Text className="font-nunito text-xs text-brand-muted"> · {timeAgo(comment.created_at)}</Text>
        </View>
        <Text className="mt-0.5 font-nunito leading-5 text-brand-offwhite">{comment.content}</Text>
        {onReply ? (
          <Pressable onPress={() => onReply(comment)} hitSlop={8} accessibilityRole="button" className="mt-1 self-start active:opacity-60">
            <Text className="font-nunito-bold text-xs text-brand-muted">Ответить</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function CommentItem({ comment, onReply }: { comment: Comment; onReply?: (c: Comment) => void }) {
  const [expanded, setExpanded] = useState(false);
  const replies = comment.replies ?? [];
  const shown = expanded ? replies : replies.slice(0, REPLIES_PREVIEW);
  return (
    <View className="border-b border-brand-border py-3">
      <CommentBody comment={comment} onReply={onReply} />
      {shown.length > 0 ? (
        <View className="ml-10">
          {shown.map((r) => (
            // Ответ на реплику привязывается к корневому комментарию, как на вебе (глубина — один уровень).
            <CommentBody key={r.id} comment={r} nested onReply={onReply ? () => onReply(comment) : undefined} />
          ))}
          {replies.length > REPLIES_PREVIEW ? (
            <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} className="mt-2 self-start active:opacity-60">
              <Text className="font-nunito-bold text-xs text-brand-accent-minus">
                {expanded ? 'Скрыть ответы' : `Ещё ответов: ${replies.length - REPLIES_PREVIEW}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
