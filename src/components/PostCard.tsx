import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Heart, MessageCircle, Repeat2, Pin } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { ContentMenu } from './ContentMenu';
import { PostMedia } from '@/components/post/PostMedia';
import { Card } from '@/components/ui';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { VerifiedBadge } from './VerifiedBadge';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { Post, PostAuthor } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

// Feed list has px-4 (16+16) and the card has p-4 (16+16): media must fit inside both.
const HORIZONTAL_SPACE = 64;

interface PostCardProps {
  post: Post;
  onVote?: (value: 1 | -1 | 0) => void;
  onRepaw?: () => void;
  /** On the post screen the card is already open, so tapping it should not navigate again. */
  interactive?: boolean;
}

export function PostCard({ post, onVote, onRepaw, interactive = true }: PostCardProps) {
  const { t } = useT();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const mediaWidth = screenWidth - HORIZONTAL_SPACE;
  const author = post.author;
  const groupContext = post.groupPosts?.[0]?.group;
  const liked = post.my_vote === 1;

  const openPost = () => router.push(`/post/${post.id}`);

  const { nsfwMode } = useNsfwMode();
  // 18+: в режиме 'hide' скрываем текст и медиа, в 'blur' размываем изображения (web: PostCard.vue)
  const nsfwLocked = post.is_nsfw && nsfwMode === 'hide';
  const nsfwBlur = post.is_nsfw && nsfwMode === 'blur';

  return (
    <Card
      className="mb-3"
      {...(interactive ? { onPress: openPost, accessibilityRole: 'button' as const, accessibilityLabel: t('exploreOpenPost') } : {})}
    >
      <View className="mb-3 flex-row items-center justify-between">
        {author ? (
          <Link href={`/profile/${author.username}`} asChild>
            <Pressable className="flex-1 flex-row items-center gap-3 active:opacity-60">
              <PostAuthorHeader post={post} author={author} groupContext={groupContext} />
            </Pressable>
          </Link>
        ) : (
          <View className="flex-1 flex-row items-center gap-3">
            <PostAuthorHeader post={post} author={author} groupContext={groupContext} />
          </View>
        )}
        {post.is_announcement ? (
          <View className="ml-2 flex-row items-center gap-1 rounded-full bg-brand-accent-plus-plus px-2 py-1">
            <Pin size={12} color={colors.accentMinus} />
            <Text className="text-xs font-semibold text-brand-accent-minus">{t('mPinned')}</Text>
          </View>
        ) : null}
        <ContentMenu report={{ type: 'post', id: post.id }} author={author ? { id: author.id, name: author.username } : null} />
      </View>

      {nsfwLocked ? (
        <View className="mb-3 items-center rounded-2xl bg-brand-bg py-6">
          <Text className="font-nunito-bold text-brand-muted">{t('mNsfwHidden')}</Text>
        </View>
      ) : null}

      {!nsfwLocked && post.title ? <Text className="mb-1 text-base font-bold text-brand-offwhite">{post.title}</Text> : null}
      {!nsfwLocked && post.content ? (
        <Text numberOfLines={interactive ? 6 : undefined} className="mb-3 leading-5 text-brand-offwhite">
          {post.content}
        </Text>
      ) : null}

      {!nsfwLocked ? <PostMedia postId={post.id} urls={post.media_urls} width={mediaWidth} nsfwBlur={nsfwBlur} /> : null}

      <View className="flex-row items-center gap-7">
        <Pressable
          onPress={() => onVote?.(liked ? 0 : 1)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={liked ? t('mUnlike') : t('mLike')}
          className="flex-row items-center gap-1.5 active:opacity-60"
        >
          <Heart size={20} color={liked ? colors.error : colors.mutedIcon} fill={liked ? colors.error : 'transparent'} />
          <Text className={`text-sm ${liked ? 'font-bold text-brand-error' : 'text-brand-muted'}`}>{post._count.votes}</Text>
        </Pressable>
        <Pressable
          onPress={interactive ? openPost : undefined}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('comments')}
          className="flex-row items-center gap-1.5 active:opacity-60"
        >
          <MessageCircle size={20} color={colors.mutedIcon} />
          <Text className="text-sm text-brand-muted">{post._count.comments}</Text>
        </Pressable>
        <Pressable
          onPress={onRepaw}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('mRepost')}
          className="flex-row items-center gap-1.5 active:opacity-60"
        >
          <Repeat2 size={20} color={colors.mutedIcon} />
          <Text className="text-sm text-brand-muted">{post._count.repaws}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function PostAuthorHeader({
  post,
  author,
  groupContext,
}: {
  post: Post;
  author: PostAuthor | null;
  groupContext?: { name: string };
}) {
  const timeAgo = useTimeAgo();
  return (
    <>
      <Avatar uri={author?.avatar_url} name={author?.display_name ?? author?.username} size={40} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Text className="flex-shrink font-bold text-brand-offwhite" numberOfLines={1}>
            {groupContext ? groupContext.name : (author?.display_name ?? author?.username ?? 'Bloomly')}
          </Text>
          {author?.is_verified ? <VerifiedBadge size={14} /> : null}
        </View>
        <Text className="text-xs text-brand-muted">
          @{author?.username ?? 'group'} · {timeAgo(post.created_at)}
        </Text>
      </View>
    </>
  );
}
