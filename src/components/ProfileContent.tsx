import { useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ban, Ellipsis, Lock, MessageCircle, Settings, Snowflake, UserCheck, UserPlus, UserX, Video } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { ReportSheet } from './ReportSheet';
import { VerifiedBadge } from './VerifiedBadge';
import { Button, Card, EmptyState, ErrorState, Sheet, Skeleton } from '@/components/ui';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { useRepawPost } from '@/hooks/usePosts';
import { useBlockStatus, useOpenConversation, useProfile, useToggleBlock, useToggleFollow, useUserPosts, type ProfileTab } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import { mediaSource } from '@/lib/mediaAuth';
import { isNotFound } from '@/shared/apiError';
import { isVideoUrl, visualMedia } from '@/shared/media';
import type { MessageKey } from '@/shared/i18n';
import type { Post, UserProfile } from '@/shared/api-types';
import { colors } from '@/theme/tokens';

const GRID_GAP = 4;
const CONTENT_MAX_WIDTH = 720; // как в ui/Screen на широких окнах
const TABS: { key: ProfileTab; label: MessageKey }[] = [
  { key: 'posts', label: 'postsTab' },
  { key: 'repaws', label: 'repawsTab' },
  { key: 'media', label: 'mediaTab' },
];

/** Профиль (веб: components/profile/ProfilePage.vue). Состояния: загрузка, ошибка, не найден, заблокировал вас, скрыт, заморожен, 18+. */
export function ProfileContent({ username, isOwn }: { username: string; isOwn: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const profileQuery = useProfile(username);
  const profile = profileQuery.data;
  const postsQuery = useUserPosts(profile && !profile.is_private && !profile.is_blocked_by_user ? profile.id : undefined, tab);
  const followMutation = useToggleFollow(username);
  const messageMutation = useOpenConversation();
  const blockStatus = useBlockStatus(profile?.id, !isOwn && !!profile);
  const blockMutation = useToggleBlock(profile?.id ?? '');
  const repaw = useRepawPost();
  const { nsfwMode } = useNsfwMode();
  const { width } = useWindowDimensions();
  const viewable = useViewableIds();

  if (profileQuery.isLoading) {
    return (
      <View className="gap-3 px-4 pt-2">
        <Skeleton height={140} />
        <Skeleton width={160} height={22} />
        <Skeleton height={60} />
      </View>
    );
  }
  if (profileQuery.isError) {
    return isNotFound(profileQuery.error) ? (
      <EmptyState
        icon={<UserX size={44} color={colors.mutedIcon} />}
        title={t('userNotFound')}
        hint={t('userNotFoundDesc')}
        action={<Button title={t('goHome')} onPress={() => router.replace('/')} />}
      />
    ) : (
      <ErrorState title={t('profileLoadFailedError')} onRetry={() => profileQuery.refetch()} />
    );
  }
  if (!profile) return null;

  if (profile.is_blocked_by_user || profile.is_private) {
    return (
      <EmptyState
        icon={profile.is_blocked_by_user ? <Ban size={44} color={colors.mutedIcon} /> : <Lock size={44} color={colors.mutedIcon} />}
        title={profile.display_name ?? profile.username}
        hint={profile.is_blocked_by_user ? t('profileBlockedByUser') : t('profileHiddenByPrivacy')}
      />
    );
  }

  const blocked = !!blockStatus.data;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const gridItem = (contentWidth - 32 - GRID_GAP * 2) / 3;
  const media = tab === 'media';

  const empty = postsQuery.isLoading ? (
    <View className="gap-3 px-4">
      <Skeleton height={120} />
    </View>
  ) : postsQuery.isError ? (
    <ErrorState onRetry={() => postsQuery.refetch()} />
  ) : tab === 'repaws' ? (
    <EmptyState title={t('profileRepawsEmptyLabel')} hint={t('profileRepawsEmptyHint')} />
  ) : (
    <EmptyState title={media ? t('noMediaYet') : t('noPostsLabel')} />
  );

  const header = (
    <ProfileHeader
      profile={profile}
      isOwn={isOwn}
      blocked={blocked}
      tab={tab}
      onTab={setTab}
      onFollow={() => followMutation.mutate(profile.id)}
      followBusy={followMutation.isPending}
      onMessage={() => messageMutation.mutate(profile.id, { onSuccess: (conv) => router.push(`/messages/${conv.id}`) })}
      onMenu={() => setMenuOpen(true)}
      onSettings={() => router.push('/settings')}
    />
  );

  return (
    <>
      <PostVisibilityProvider value={viewable.ids}>
      <FlatList<Post>
        {...viewable.props}
        key={media ? 'grid' : 'list'}
        data={postsQuery.data ?? []}
        keyExtractor={(p) => p.id}
        numColumns={media ? 3 : 1}
        columnWrapperStyle={media ? { gap: GRID_GAP, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={media ? { gap: GRID_GAP, paddingBottom: 24 } : { paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item }) =>
          media ? (
            <MediaTile post={item} size={gridItem} nsfwMode={nsfwMode} onPress={() => router.push(`/post/${item.id}`)} />
          ) : (
            <PostCard post={item} onRepaw={() => repaw.mutate(item.id)} />
          )
        }
      />
      </PostVisibilityProvider>

      {isOwn ? null : (
        <>
          <Sheet visible={menuOpen} title={`@${profile.username}`} onClose={() => setMenuOpen(false)}>
            <View className="gap-2 pb-2">
              <Button
                title={blocked ? t('mUnblockUser') : t('blockUserBtn')}
                variant="secondary"
                loading={blockMutation.isPending}
                onPress={() => blockMutation.mutate(blocked, { onSuccess: () => setMenuOpen(false) })}
              />
              <Button
                title={t('report')}
                variant="secondary"
                onPress={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
              />
            </View>
          </Sheet>
          <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={profile.id} />
        </>
      )}
    </>
  );
}

function ProfileHeader(props: {
  profile: UserProfile;
  isOwn: boolean;
  blocked: boolean;
  tab: ProfileTab;
  onTab: (t: ProfileTab) => void;
  onFollow: () => void;
  followBusy: boolean;
  onMessage: () => void;
  onMenu: () => void;
  onSettings: () => void;
}) {
  const { t, locale } = useT();
  const { profile, isOwn, blocked, tab, onTab } = props;
  const count = (n: number) => n.toLocaleString(locale);
  return (
    <View>
      <View className="mb-12">
        {profile.banner_url ? (
          <Image source={{ uri: profile.banner_url }} style={{ height: 140, width: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={[colors.accent, colors.purple]} style={{ height: 140, width: '100%' }} />
        )}
        <View className="absolute -bottom-10 left-4" style={{ borderRadius: 48, borderWidth: 4, borderColor: colors.bg }}>
          <Avatar uri={profile.avatar_url} name={profile.display_name ?? profile.username} size={88} />
        </View>
        {isOwn ? (
          <View className="absolute -bottom-11 right-4">
            <Pressable onPress={props.onSettings} accessibilityRole="button" accessibilityLabel={t('settings')} hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
              <Settings size={18} color={colors.offwhite} />
            </Pressable>
          </View>
        ) : (
          <View className="absolute -bottom-11 right-4 flex-row items-center gap-2">
            <Pressable onPress={props.onMenu} accessibilityRole="button" accessibilityLabel={t('mMore')} hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
              <Ellipsis size={18} color={colors.offwhite} />
            </Pressable>
            <Pressable onPress={props.onMessage} accessibilityRole="button" accessibilityLabel={t('messageBtn')} hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
              <MessageCircle size={18} color={colors.offwhite} />
            </Pressable>
            <Pressable
              onPress={props.onFollow}
              disabled={props.followBusy}
              accessibilityRole="button"
              className={`min-h-10 flex-row items-center gap-1.5 rounded-full px-4 py-2 active:opacity-80 ${profile.is_following ? 'border border-brand-border bg-brand-card' : 'bg-brand-accent'}`}
            >
              {profile.is_following ? <UserCheck size={16} color={colors.offwhite} /> : <UserPlus size={16} color={colors.offwhite} />}
              <Text className="font-nunito-bold text-brand-offwhite">{profile.is_following ? t('unsubscribe') : t('subscribe')}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View className="px-4">
        <View className="flex-row items-center gap-1.5">
          <Text className="flex-shrink font-nunito-extrabold text-xl text-brand-offwhite">{profile.display_name ?? profile.username}</Text>
          {profile.is_verified ? <VerifiedBadge /> : null}
          {profile.frozen_at ? (
            <View accessibilityLabel={t('profileFrozenAccountBadgeTitle')}>
              <Snowflake size={16} color={colors.accentMinus} />
            </View>
          ) : null}
        </View>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="font-nunito text-brand-muted">@{profile.username}</Text>
          {profile.pronouns ? (
            <View className="rounded-full bg-brand-accent-plus-plus px-2 py-0.5">
              <Text className="font-nunito text-xs text-brand-accent-minus">{profile.pronouns}</Text>
            </View>
          ) : null}
        </View>
        {blocked ? <Text className="mt-2 font-nunito text-xs text-brand-error">{t('profileBlockedByYouHint')}</Text> : null}

        {profile.fursona_name ? (
          <Card padding="sm" className="mt-4 flex-row items-center gap-3">
            <View className="h-9 w-9 rounded-lg" style={{ backgroundColor: profile.fursona_color ?? colors.accent }} />
            <Text className="flex-1 font-nunito-bold text-brand-offwhite">{profile.fursona_name}</Text>
          </Card>
        ) : null}

        {profile.bio ? <Text className="mt-4 font-nunito leading-5 text-brand-offwhite">{profile.bio}</Text> : null}

        <View className="mt-4 flex-row gap-3">
          <StatBox value={count(profile._count.posts)} label={t('posts')} />
          <StatBox value={count(profile._count.followers)} label={t('followers')} />
          <StatBox value={count(profile._count.following)} label={t('mFollowingLabel')} />
        </View>

        {profile.interests?.length ? (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {profile.interests.map((tag) => (
              <View key={tag} className="rounded-full bg-brand-card px-3 py-1.5">
                <Text className="font-nunito text-xs text-brand-offwhite">{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mb-3 mt-6 flex-row border-b border-brand-border" accessibilityRole="tablist">
          {TABS.map((x) => (
            <Pressable key={x.key} onPress={() => onTab(x.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === x.key }} className="mr-6 pb-3">
              <Text className={tab === x.key ? 'font-nunito-bold text-brand-accent' : 'font-nunito text-brand-muted'}>{t(x.label)}</Text>
              {tab === x.key ? <View className="mt-2 h-0.5 rounded-full bg-brand-accent" /> : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function MediaTile({ post, size, nsfwMode, onPress }: { post: Post; size: number; nsfwMode: string; onPress: () => void }) {
  const { t } = useT();
  const hidden = post.is_nsfw && nsfwMode === 'hide';
  const first = visualMedia(post.media_urls)[0];
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }} accessibilityRole="button" accessibilityLabel={t('exploreOpenPost')} className="overflow-hidden rounded-lg bg-brand-card">
      {hidden ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-nunito-bold text-xs text-brand-muted">18+</Text>
        </View>
      ) : first && isVideoUrl(first) ? (
        // Превью у видео нет: значок, само видео проигрывается на экране поста
        <View className="flex-1 items-center justify-center">
          <Video size={26} color={colors.mutedIcon} />
        </View>
      ) : first ? (
        <Image source={mediaSource(first)} style={{ width: '100%', height: '100%' }} contentFit="cover" blurRadius={post.is_nsfw && nsfwMode === 'blur' ? 30 : 0} />
      ) : (
        <View className="flex-1 items-center justify-center p-2">
          <Text numberOfLines={4} className="font-nunito text-xs text-brand-muted">{post.content}</Text>
        </View>
      )}
    </Pressable>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <Card padding="none" className="flex-1 items-center py-3">
      <Text className="font-nunito-extrabold text-lg text-brand-offwhite">{value}</Text>
      <Text className="font-nunito text-[11px] text-brand-muted">{label}</Text>
    </Card>
  );
}
