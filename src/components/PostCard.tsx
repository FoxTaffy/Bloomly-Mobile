import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowBigDown, ArrowBigUp, Bookmark, EyeOff, MessageCircle, Repeat2, Pin } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { PostMedia } from '@/components/post/PostMedia';
import { PostMenu } from '@/components/post/PostMenu';
import { PostText } from '@/components/post/PostText';
import { Card } from '@/components/ui';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { VerifiedBadge } from './VerifiedBadge';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { Post, PostAuthor } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';
import { usePostVote } from '@/hooks/usePosts';
import { usePostActions } from '@/hooks/usePostActions';
import { useSession } from '@/stores/session';

// Feed list has px-4 (16+16) and the card has p-4 (16+16): media must fit inside both.
const HORIZONTAL_SPACE = 64;

interface PostCardProps {
  post: Post;
  /** Пост удалён или ушёл в архив (экран поста закрывается; в списках карточка исчезает сама). */
  onRemoved?: () => void;
  /** On the post screen the card is already open, so tapping it should not navigate again. */
  interactive?: boolean;
  /** Карточка на своём профиле: в меню появляется «Закрепить / Открепить». */
  pin?: { pinned: boolean };
}

export function PostCard({ post, onRemoved, interactive = true, pin }: PostCardProps) {
  const { t } = useT();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const mediaWidth = screenWidth - HORIZONTAL_SPACE;
  const author = post.author;
  const groupContext = post.groupPosts?.[0]?.group;
  const { vote, rating, cast } = usePostVote(post);
  const actions = usePostActions(post);
  const myId = useSession((s) => s.user?.id);
  // Свой пост репостнуть нельзя (web: toggleRepaw)
  const isOwn = !!myId && (myId === post.author_id || myId === author?.id);
  const tags = post.tags ?? [];

  const openPost = () => router.push(`/post/${post.id}`);

  const { nsfwMode } = useNsfwMode();
  // 18+: в режиме 'hide' скрываем текст и медиа, в 'blur' размываем изображения (web: PostCard.vue)
  const nsfwLocked = post.is_nsfw && nsfwMode === 'hide';
  const nsfwBlur = post.is_nsfw && nsfwMode === 'blur';

  // «Не интересно»: карточка свёрнута, пока не отменят (web: PostCard isHidden)
  if (post.hidden_by_me) {
    return (
      <Card className="mb-3 flex-row items-center gap-3">
        <EyeOff size={18} color={colors.mutedIcon} />
        <Text className="flex-1 font-nunito text-sm text-brand-muted">{t('mPostHidden')}</Text>
        <Pressable onPress={() => actions.markNotInterested(false)} hitSlop={10} accessibilityRole="button" className="active:opacity-60">
          <Text className="font-nunito-bold text-sm text-brand-accent-minus">{t('mUndo')}</Text>
        </Pressable>
      </Card>
    );
  }

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
        <PostMenu post={post} onRemoved={onRemoved} pin={pin} />
      </View>

      {nsfwLocked ? (
        <View className="mb-3 items-center rounded-2xl bg-brand-bg py-6">
          <Text className="font-nunito-bold text-brand-muted">{t('mNsfwHidden')}</Text>
        </View>
      ) : null}

      {!nsfwLocked && post.title ? <Text className="mb-1 text-base font-bold text-brand-offwhite">{post.title}</Text> : null}
      {!nsfwLocked && post.content ? (
        <PostText text={post.content} numberOfLines={interactive ? 6 : undefined} className="mb-3 leading-5 text-brand-offwhite" />
      ) : null}

      {!nsfwLocked && tags.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-1.5">
          {tags.map(({ tag }) => (
            // Тег ведёт в поиск по нему (web: /search?q=<тег>)
            <Pressable
              key={tag.id}
              onPress={() => router.push({ pathname: '/discover', params: { q: tag.name } })}
              hitSlop={4}
              accessibilityRole="link"
              className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 active:opacity-60"
            >
              <Text className="font-nunito-medium text-xs text-brand-muted">#{tag.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!nsfwLocked ? <PostMedia postId={post.id} urls={post.media_urls} width={mediaWidth} nsfwBlur={nsfwBlur} /> : null}

      <View className="flex-row items-center gap-4">
        {/* Рейтинг, не лайки: ▲ / ▼ и сумма, как в вебе (PostCard.vue → Vote) */}
        <View className="h-8 flex-row items-center rounded-full border border-brand-border bg-brand-bg px-1">
          <Pressable
            onPress={() => cast(1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: vote === 1 }}
            accessibilityLabel={t('mUpvote')}
            className="p-1 active:opacity-60"
          >
            <ArrowBigUp size={20} color={vote === 1 ? colors.success : colors.mutedIcon} fill={vote === 1 ? colors.success : 'transparent'} />
          </Pressable>
          <Text
            className={`min-w-6 text-center font-nunito-bold text-sm ${
              vote === 1 ? 'text-brand-success' : vote === -1 ? 'text-brand-error' : 'text-brand-muted'
            }`}
          >
            {rating}
          </Text>
          <Pressable
            onPress={() => cast(-1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: vote === -1 }}
            accessibilityLabel={t('mDownvote')}
            className="p-1 active:opacity-60"
          >
            <ArrowBigDown size={20} color={vote === -1 ? colors.error : colors.mutedIcon} fill={vote === -1 ? colors.error : 'transparent'} />
          </Pressable>
        </View>
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
          onPress={() => void actions.toggleRepaw()}
          disabled={isOwn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityState={{ selected: !!post.repawed, disabled: isOwn }}
          accessibilityLabel={t('mRepost')}
          className={`flex-row items-center gap-1.5 active:opacity-60 ${isOwn ? 'opacity-50' : ''}`}
        >
          <Repeat2 size={20} color={post.repawed ? colors.success : colors.mutedIcon} />
          <Text className={`text-sm ${post.repawed ? 'font-nunito-bold text-brand-success' : 'text-brand-muted'}`}>{post._count.repaws}</Text>
        </Pressable>
        <View className="flex-1" />
        <Pressable
          onPress={() => void actions.toggleFavourite()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityState={{ selected: !!post.favourited }}
          accessibilityLabel={post.favourited ? t('mBookmarked') : t('mBookmark')}
          className="active:opacity-60"
        >
          <Bookmark size={20} color={post.favourited ? colors.accent : colors.mutedIcon} fill={post.favourited ? colors.accent : 'transparent'} />
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
