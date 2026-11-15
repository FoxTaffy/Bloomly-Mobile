import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle, MoreHorizontal, Search, UserPlus } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Screen, Sheet, Skeleton } from '@/components/ui';
import { useFriendList, useRemoveFriend, useRequestActions, useRequests, useSendFriendRequest, useSuggestions, useUnfollow } from '@/hooks/useFriends';
import { useOpenConversation, useToggleBlock } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';
import type { FriendTab } from '@/api/friends';
import type { FriendUser } from '@/shared/api-types';
import { colors } from '@/theme/tokens';

const TABS: { key: FriendTab; label: 'tabFriends' | 'tabFollowers' | 'tabFollowing' }[] = [
  { key: 'friends', label: 'tabFriends' },
  { key: 'followers', label: 'tabFollowers' },
  { key: 'following', label: 'tabFollowing' },
];

/** Люди: друзья (взаимные подписки), подписчики, подписки, рекомендации. Веб-аналог: views/FriendsView.vue + FriendsSidePanel.vue. */
export default function FriendsScreen() {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<FriendTab>('friends');
  const [query, setQuery] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [menuUser, setMenuUser] = useState<FriendUser | null>(null);
  const [addText, setAddText] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const list = useFriendList(tab);
  const suggestions = useSuggestions();
  const send = useSendFriendRequest();

  const shown = useMemo(() => {
    let items = list.data ?? [];
    if (tab === 'friends' && onlineOnly) items = items.filter((u) => u.online);
    const q = query.trim().toLowerCase();
    if (q) items = items.filter((u) => `${u.display_name ?? ''} ${u.username}`.toLowerCase().includes(q));
    return items;
  }, [list.data, tab, onlineOnly, query]);

  const invite = (target: string) => {
    const v = target.trim();
    if (!v || send.isPending) return;
    setNotice(null);
    send.mutate(v, {
      onSuccess: () => {
        setNotice({ ok: true, text: t('requestSent') });
        setAddText('');
      },
      onError: (e) => setNotice({ ok: false, text: apiErrorMessage(e) ?? t('friendsActionError') }),
    });
  };

  const onlineCount = (list.data ?? []).filter((u) => u.online).length;
  const emptyTitle = tab === 'friends' ? (onlineOnly ? t('emptyNoOnlineFriends') : t('emptyFriendsList')) : tab === 'followers' ? t('emptyFollowers') : t('emptyFollowing');

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mPeopleTitle')}</Text>
      </View>

      <FlatList<FriendUser>
        data={shown}
        keyExtractor={(u) => u.id}
        contentContainerClassName="px-4 pb-8"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="gap-3 pb-3">
            <View className="flex-row items-center gap-2">
              <Field value={addText} onChangeText={setAddText} placeholder={t('addPlaceholder')} maxLength={64} autoCapitalize="none" autoCorrect={false} returnKeyType="send" onSubmitEditing={() => invite(addText)} className="flex-1" />
              <Button title={t('addButton')} loading={send.isPending} disabled={!addText.trim()} onPress={() => invite(addText)} />
            </View>
            {notice ? <Text className={`font-nunito text-xs ${notice.ok ? 'text-brand-success' : 'text-brand-error'}`}>{notice.text}</Text> : null}

            <RequestsSection />

            <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
              {TABS.map((x) => (
                <Chip key={x.key} label={x.key === tab && list.data ? `${t(x.label)} · ${list.data.length}` : t(x.label)} selected={tab === x.key} onPress={() => { setTab(x.key); setOnlineOnly(false); setQuery(''); }} />
              ))}
            </View>

            <View className="flex-row items-center gap-2">
              <Field value={query} onChangeText={setQuery} placeholder={t('searchPlaceholder')} icon={<Search size={16} color={colors.mutedIcon} />} maxLength={100} autoCapitalize="none" autoCorrect={false} className="flex-1" />
              {tab === 'friends' ? <Chip label={onlineCount ? `${t('onlineFilter')} · ${onlineCount}` : t('onlineFilter')} selected={onlineOnly} onPress={() => setOnlineOnly((v) => !v)} /> : null}
            </View>
          </View>
        }
        renderItem={({ item }) => <PersonRow user={item} isFriend={tab === 'friends'} onMenu={() => setMenuUser(item)} />}
        ListEmptyComponent={
          list.isLoading ? (
            <View className="gap-3"><Skeleton height={64} /><Skeleton height={64} /><Skeleton height={64} /></View>
          ) : list.isError ? (
            <ErrorState title={t('friendsLoadError')} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState title={query.trim() ? t('convNothingFound') : emptyTitle} />
          )
        }
        ListFooterComponent={
          <View className="mt-6 gap-3">
            <Text className="font-nunito-extrabold text-base text-brand-offwhite">{t('rightPanelSuggestions')}</Text>
            {suggestions.isLoading ? (
              <Skeleton height={56} />
            ) : (suggestions.data ?? []).length === 0 ? (
              <Text className="py-2 text-center font-nunito text-xs text-brand-muted">{t('noSuggestions')}</Text>
            ) : (
              (suggestions.data ?? []).slice(0, 8).map((u) => (
                <Card key={u.id} padding="sm" className="flex-row items-center gap-3" onPress={() => router.push(`/profile/${u.username}`)}>
                  <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={40} />
                  <View className="flex-1">
                    <Text numberOfLines={1} className="font-nunito-bold text-brand-offwhite">{u.display_name ?? u.username}</Text>
                    <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{u.mutual_count ? t('friendsMutualCount', { n: u.mutual_count }) : `@${u.username}`}</Text>
                  </View>
                  <Pressable onPress={() => invite(u.id)} disabled={send.isPending} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('addButton')} className="h-10 w-10 items-center justify-center rounded-full bg-brand-accent active:opacity-80">
                    <UserPlus size={16} color={colors.offwhite} />
                  </Pressable>
                </Card>
              ))
            )}
          </View>
        }
      />

      <PersonMenu user={menuUser} isFriend={tab === 'friends'} isFollowing={tab === 'following'} onClose={() => setMenuUser(null)} />
    </Screen>
  );
}

function PersonRow({ user, isFriend, onMenu }: { user: FriendUser; isFriend: boolean; onMenu: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const open = useOpenConversation();
  const message = () => open.mutate(user.id, { onSuccess: (c) => router.push(`/messages/${c.id}`) });
  return (
    <Card padding="sm" className="mb-3 flex-row items-center gap-3" onPress={() => router.push(`/profile/${user.username}`)}>
      <Avatar uri={user.avatar_url} name={user.display_name ?? user.username} size={44} />
      <View className="flex-1">
        <Text numberOfLines={1} className="font-nunito-bold text-brand-offwhite">{user.display_name ?? user.username}</Text>
        <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">
          @{user.username}{isFriend ? ` · ${user.online ? t('onlineStatus') : t('chatOfflineLabel')}` : ''}
        </Text>
      </View>
      <Pressable onPress={message} disabled={open.isPending} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('msgBtnTitle')} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-80">
        <MessageCircle size={18} color={colors.offwhite} />
      </Pressable>
      <Pressable onPress={onMenu} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('mMore')} className="h-10 w-10 items-center justify-center rounded-full active:opacity-60">
        <MoreHorizontal size={18} color={colors.mutedIcon} />
      </Pressable>
    </Card>
  );
}

/** Действия над человеком (веб: меню PersonCard): профиль, отписаться / убрать из друзей, заблокировать. */
function PersonMenu({ user, isFriend, isFollowing, onClose }: { user: FriendUser | null; isFriend: boolean; isFollowing: boolean; onClose: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const remove = useRemoveFriend();
  const unfollow = useUnfollow();
  const block = useToggleBlock(user?.id ?? '');
  const [failed, setFailed] = useState(false);
  const name = user ? (user.display_name ?? user.username) : '';

  const done = { onSuccess: onClose, onError: () => setFailed(true) };
  const confirm = (title: string, hint: string, action: string, run: () => void) =>
    Alert.alert(title, hint, [
      { text: t('cancelBtn'), style: 'cancel' },
      { text: action, style: 'destructive', onPress: run },
    ]);

  return (
    <Sheet visible={!!user} title={name} onClose={() => { setFailed(false); onClose(); }}>
      {user ? (
        <View className="gap-2 pb-2">
          <Button title={t('viewProfileBtn')} variant="secondary" onPress={() => { onClose(); router.push(`/profile/${user.username}`); }} />
          {isFollowing ? <Button title={t('unfollowBtnTitle')} variant="secondary" loading={unfollow.isPending} onPress={() => unfollow.mutate(user.id, done)} /> : null}
          {isFriend ? (
            <Button
              title={t('removeFriendTitle')}
              variant="secondary"
              loading={remove.isPending}
              onPress={() => confirm(t('confirmRemoveTitle'), t('confirmRemoveHint'), t('confirmRemoveBtn'), () => remove.mutate(user.id, done))}
            />
          ) : null}
          <Button
            title={t('blockUserBtn')}
            variant="secondary"
            loading={block.isPending}
            onPress={() => confirm(t('friendsBlockTitle', { name }), t('friendsBlockHint'), t('blockUserBtn'), () => block.mutate(false, { onSuccess: () => { onClose(); }, onError: () => setFailed(true) }))}
          />
          {failed ? <Text className="font-nunito text-xs text-brand-error">{t('friendsActionError')}</Text> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

/** Заявки в друзья: входящие (принять / отклонить) и исходящие (отозвать). Раздела нет, пока заявок нет. */
function RequestsSection() {
  const { t } = useT();
  const router = useRouter();
  const incoming = useRequests('incoming');
  const outgoing = useRequests('outgoing');
  const { respond, cancel } = useRequestActions();
  const rows = [
    ...(incoming.data ?? []).map((r) => ({ ...r, dir: 'in' as const })),
    ...(outgoing.data ?? []).map((r) => ({ ...r, dir: 'out' as const })),
  ];
  if (rows.length === 0) return null;
  const busy = respond.isPending || cancel.isPending;

  return (
    <View className="gap-2">
      <Text className="font-nunito-extrabold text-base text-brand-offwhite">{t('mFriendRequestsTitle')} · {rows.length}</Text>
      {rows.map((r) => (
        <Card key={`${r.dir}:${r.id}`} padding="sm" className="flex-row items-center gap-3" onPress={() => router.push(`/profile/${r.user.username}`)}>
          <Avatar uri={r.user.avatar_url} name={r.user.display_name ?? r.user.username} size={40} />
          <View className="flex-1">
            <Text numberOfLines={1} className="font-nunito-bold text-brand-offwhite">{r.user.display_name ?? r.user.username}</Text>
            <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{r.dir === 'in' ? t('mFriendRequestsIn') : t('mFriendRequestsOut')} · @{r.user.username}</Text>
          </View>
          {r.dir === 'in' ? (
            <View className="flex-row gap-2">
              <Pressable onPress={() => respond.mutate({ id: r.id, accept: true })} disabled={busy} accessibilityRole="button" className="rounded-full bg-brand-accent px-3 py-1.5 active:opacity-80">
                <Text className="font-nunito-bold text-xs text-brand-offwhite">{t('mFriendAccept')}</Text>
              </Pressable>
              <Pressable onPress={() => respond.mutate({ id: r.id, accept: false })} disabled={busy} accessibilityRole="button" className="rounded-full bg-brand-card px-3 py-1.5 active:opacity-80">
                <Text className="font-nunito-bold text-xs text-brand-muted">{t('mFriendReject')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => cancel.mutate(r.id)} disabled={busy} accessibilityRole="button" className="rounded-full bg-brand-card px-3 py-1.5 active:opacity-80">
              <Text className="font-nunito-bold text-xs text-brand-muted">{t('mFriendCancel')}</Text>
            </Pressable>
          )}
        </Card>
      ))}
      {respond.isError || cancel.isError ? <Text className="font-nunito text-xs text-brand-error">{t('friendsActionError')}</Text> : null}
    </View>
  );
}
