import { useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Award, Bell, BellOff, Ban, Globe, MapPin, Pin, Bookmark, Ellipsis, Lock, MessageCircle, Pencil, Settings, Users, Snowflake, UserCheck, UserPlus, UserX, Video } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { ReportSheet } from './ReportSheet';
import { VerifiedBadge } from './VerifiedBadge';
import { Button, Card, EmptyState, ErrorState, Sheet, Skeleton } from '@/components/ui';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { AlbumsTab } from '@/components/profile/AlbumsTab';
import { FursonaTab } from '@/components/profile/FursonaTab';
import { isPostTab, useAchievements, useBlockStatus, useOpenConversation, useProfile, useToggleBlock, useToggleFollow, useUserPosts, type ProfileTab } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import { useAuthorNotify } from '@/hooks/usePostActions';
import { mediaSource } from '@/lib/mediaAuth';
import { isNotFound } from '@/shared/apiError';
import { isVideoUrl, visualMedia } from '@/shared/media';
import type { MessageKey } from '@/shared/i18n';
import type { Post, UserProfile } from '@/shared/api-types';
import { earnedItems, tierTone, type Tone } from '@/shared/achievements';
import { colors } from '@/theme/tokens';

const GRID_GAP = 4;
const CONTENT_MAX_WIDTH = 720; // как в ui/Screen на широких окнах
const TABS: { key: ProfileTab; label: MessageKey; ownOnly?: boolean }[] = [
  { key: 'posts', label: 'postsTab' },
  { key: 'repaws', label: 'repawsTab' },
  { key: 'media', label: 'mediaTab' },
  { key: 'fursona', label: 'mFursonaTab' },
  { key: 'albums', label: 'mAlbumsTab' },
  { key: 'archive', label: 'mArchiveTab', ownOnly: true },
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
  const pinnedId = profile?.pinned_post_id ?? null;
  // Закреплённый пост показан отдельно сверху вкладки «Посты», в списке его нет (web: visiblePosts)
  const listPosts = !isPostTab(tab) ? [] : tab === 'posts' && pinnedId ? (postsQuery.data ?? []).filter((p) => p.id !== pinnedId) : (postsQuery.data ?? []);

  const empty = tab === 'fursona' && profile ? (
    <FursonaTab userId={profile.id} isOwn={isOwn} />
  ) : tab === 'albums' && profile ? (
    <AlbumsTab userId={profile.id} />
  ) : postsQuery.isLoading ? (
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
      pinned={tab === 'posts' && profile.pinnedPost ? { ...profile.pinnedPost, author_id: profile.id } : null}
      canPin={isOwn}
    />
  );

  return (
    <>
      <PostVisibilityProvider value={viewable.ids}>
      <FlatList<Post>
        {...viewable.props}
        key={media ? 'grid' : 'list'}
        data={listPosts}
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
            <PostCard post={item} pin={isOwn && tab === 'posts' ? { pinned: false } : undefined} />
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
  pinned: Post | null;
  canPin: boolean;
}) {
  const { t, locale } = useT();
  const router = useRouter();
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
          <View className="absolute -bottom-11 right-4 flex-row items-center gap-2">
            {[
              { onPress: () => router.push('/edit-profile'), label: t('mEditProfileTitle'), icon: <Pencil size={18} color={colors.offwhite} /> },
              { onPress: () => router.push('/friends'), label: t('mPeopleTitle'), icon: <Users size={18} color={colors.offwhite} /> },
              { onPress: () => router.push('/bookmarks'), label: t('bookmarksPageTitle'), icon: <Bookmark size={18} color={colors.offwhite} /> },
              { onPress: props.onSettings, label: t('settings'), icon: <Settings size={18} color={colors.offwhite} /> },
            ].map((b) => (
              <Pressable key={b.label} onPress={b.onPress} accessibilityRole="button" accessibilityLabel={b.label} hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
                {b.icon}
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="absolute -bottom-11 right-4 flex-row items-center gap-2">
            {profile.is_following ? <NotifyBell userId={profile.id} /> : null}
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

        <AboutInfo profile={profile} isOwn={isOwn} />
        <AchievementsRow userId={profile.id} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 mt-6 grow-0 border-b border-brand-border" accessibilityRole="tablist">
          {TABS.filter((x) => !x.ownOnly || isOwn).map((x) => (
            <Pressable key={x.key} onPress={() => onTab(x.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === x.key }} className="mr-6 pb-3">
              <Text className={tab === x.key ? 'font-nunito-bold text-brand-accent' : 'font-nunito text-brand-muted'}>{t(x.label)}</Text>
              {tab === x.key ? <View className="mt-2 h-0.5 rounded-full bg-brand-accent" /> : null}
            </Pressable>
          ))}
        </ScrollView>
        {props.pinned ? (
          <View className="mb-1">
            <View className="mb-2 flex-row items-center gap-1.5">
              <Pin size={13} color={colors.accentMinus} />
              <Text className="font-nunito-bold text-xs text-brand-accent-minus">{t('mPinnedPost')}</Text>
            </View>
            <PostCard post={props.pinned} pin={props.canPin ? { pinned: true } : undefined} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Блок «О себе»: местоположение, сайт, «Нравится» / «Не нравится» (веб: ProfileAboutInfo.vue; остальное — позже). */
function AboutInfo({ profile, isOwn }: { profile: UserProfile; isOwn: boolean }) {
  const { t } = useT();
  const likes = profile.likes ?? [];
  const dislikes = profile.dislikes ?? [];
  // Владелец скрыл симпатии — видит их только он сам
  const showLikes = (likes.length > 0 || dislikes.length > 0) && (profile.likes_dislikes_visible !== false || isOwn);
  const site = profile.website && /^https?:\/\//i.test(profile.website) ? profile.website : profile.website ? `https://${profile.website}` : null;
  if (!profile.location && !site && !showLikes) return null;
  return (
    <View className="mt-4 gap-3">
      {profile.location ? (
        <View className="flex-row items-center gap-2">
          <MapPin size={14} color={colors.mutedIcon} />
          <Text className="flex-1 font-nunito text-sm text-brand-offwhite">{profile.location}</Text>
        </View>
      ) : null}
      {site ? (
        <Pressable onPress={() => void Linking.openURL(site).catch(() => {})} accessibilityRole="link" className="flex-row items-center gap-2 active:opacity-70">
          <Globe size={14} color={colors.mutedIcon} />
          <Text numberOfLines={1} className="flex-1 font-nunito text-sm text-brand-accent-minus underline">{profile.website}</Text>
        </Pressable>
      ) : null}
      {showLikes ? (
        <View className="gap-2">
          {likes.length > 0 ? <TagRow label={t('fursonaLikesLabel')} tags={likes} tone="success" /> : null}
          {dislikes.length > 0 ? <TagRow label={t('fursonaDislikesLabel')} tags={dislikes} tone="error" /> : null}
        </View>
      ) : null}
    </View>
  );
}

function TagRow({ label, tags, tone }: { label: string; tags: string[]; tone: 'success' | 'error' }) {
  return (
    <View className="gap-1.5">
      <Text className={`font-nunito-bold text-xs ${tone === 'success' ? 'text-brand-success' : 'text-brand-error'}`}>{label}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {tags.map((x) => (
          <View key={x} className="rounded-full border border-brand-border bg-brand-card px-3 py-1">
            <Text className="font-nunito text-xs text-brand-offwhite">{x}</Text>
          </View>
        ))}
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

/** Колокольчик «уведомлять о постах автора»: только для тех, на кого подписан (веб: PersonCard notify-toggle). */
function NotifyBell({ userId }: { userId: string }) {
  const { t } = useT();
  const { on, toggle } = useAuthorNotify(userId, true);
  return (
    <Pressable
      onPress={() => toggle.mutate()}
      disabled={toggle.isPending}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? t('disableNotifyTitle') : t('enableNotifyTitle')}
      hitSlop={6}
      className="h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-card active:opacity-70"
    >
      {on ? <Bell size={18} color={colors.accent} fill={colors.accent} /> : <BellOff size={18} color={colors.offwhite} />}
    </Pressable>
  );
}

const TONE_TEXT: Record<Tone, string> = {
  warning: 'text-brand-warning', accent: 'text-brand-accent-minus', yellow: 'text-brand-yellow', purple: 'text-brand-purple', success: 'text-brand-success', muted: 'text-brand-muted',
};

/** Значки: «получено N из M» и полученные с уровнем (веб: ProfileAchievementRow). Названия значков приходят с сервера. */
function AchievementsRow({ userId }: { userId: string }) {
  const { t } = useT();
  const q = useAchievements(userId);
  const items = earnedItems(q.data);
  if (!q.data || items.length === 0) return null;
  return (
    <View className="mt-4 gap-2">
      <Text className="font-nunito-bold text-xs text-brand-muted">{t('mAchievements', { earned: q.data.earned, total: q.data.total })}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {items.slice(0, 12).map((i) => (
          <View key={i.key} className="flex-row items-center gap-1 rounded-full border border-brand-border bg-brand-card px-3 py-1">
            <Award size={12} color={colors.mutedIcon} />
            <Text className={`font-nunito-bold text-xs ${TONE_TEXT[tierTone(i.level, i.maxLevel)]}`}>{i.title}{i.maxLevel > 1 && i.levelName ? ` · ${i.levelName}` : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
