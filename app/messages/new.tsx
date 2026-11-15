import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Search } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Button, Chip, EmptyState, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { useCreateGroupChat } from '@/hooks/useChatActions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOpenConversation } from '@/hooks/useProfile';
import { useSearchUsers } from '@/hooks/useSearch';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';
import type { UserSummary } from '@/shared/api-types';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/** Новый чат: личный (нажать на человека) или групповой (отметить людей, название). Веб: NewDmModal.vue и NewChatGroupModal.vue. */
export default function NewChatScreen() {
  const { t } = useT();
  const router = useRouter();
  const myId = useSession((s) => s.user?.id);
  const [group, setGroup] = useState(false);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<UserSummary[]>([]);
  const q = useDebouncedValue(text.trim().replace(/^@/, ''), 300);
  const users = useSearchUsers(q);
  const open = useOpenConversation();
  const create = useCreateGroupChat();
  const results = users.items.filter((u) => u.id !== myId);

  const toggle = (u: UserSummary) => setPicked((l) => (l.some((x) => x.id === u.id) ? l.filter((x) => x.id !== u.id) : [...l, u]));
  const onPick = (u: UserSummary) => {
    if (group) return toggle(u);
    open.mutate(u.id, { onSuccess: (c) => router.replace(`/messages/${c.id}`) });
  };
  const canCreate = group && picked.length >= 1 && name.trim().length > 0 && !create.isPending;
  const submit = () =>
    canCreate && create.mutate({ name: name.trim(), userIds: picked.map((u) => u.id) }, { onSuccess: (c) => router.replace(`/messages/${c.id}`) });
  const err = open.isError ? apiErrorMessage(open.error) : create.isError ? apiErrorMessage(create.error) : null;

  return (
    <Screen keyboard>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mNewChat')}</Text>
      </View>

      <View className="gap-3 px-4 pb-2">
        <View className="flex-row gap-2">
          <Chip label={t('mNewChatDirect')} selected={!group} onPress={() => setGroup(false)} />
          <Chip label={t('mNewChatGroup')} selected={group} onPress={() => setGroup(true)} />
        </View>
        {group ? <Field value={name} onChangeText={setName} placeholder={t('mGroupChatName')} maxLength={100} /> : null}
        <Field value={text} onChangeText={setText} placeholder={t('mSearchPlaceholder')} icon={<Search size={16} color={colors.mutedIcon} />} autoCapitalize="none" autoCorrect={false} maxLength={64} />
        {group && picked.length > 0 ? <Text numberOfLines={2} className="font-nunito text-xs text-brand-muted">{t('mGroupChatPicked', { n: picked.length })}: {picked.map((u) => u.display_name ?? u.username).join(', ')}</Text> : null}
        {err ? <Text className="font-nunito-bold text-xs text-brand-error">{err}</Text> : null}
      </View>

      <FlatList<UserSummary>
        data={results}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 pb-6"
        onEndReached={() => users.hasNextPage && !users.isFetchingNextPage && users.fetchNextPage()}
        renderItem={({ item }) => {
          const on = picked.some((x) => x.id === item.id);
          return (
            <Pressable onPress={() => onPick(item)} disabled={open.isPending} accessibilityRole="button" accessibilityState={{ selected: on }} className="flex-row items-center gap-3 py-2 active:opacity-70">
              <Avatar uri={item.avatar_url} name={item.display_name ?? item.username} size={44} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-nunito-bold text-brand-offwhite">{item.display_name ?? item.username}</Text>
                <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">@{item.username}</Text>
              </View>
              {group ? <View className={`h-6 w-6 items-center justify-center rounded-full border ${on ? 'border-brand-accent bg-brand-accent' : 'border-brand-border'}`}>{on ? <Check size={14} color={colors.offwhite} /> : null}</View> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !q ? (
            <EmptyState title={t('mNewChatHint')} />
          ) : users.isLoading ? (
            <View className="gap-3"><Skeleton height={44} /><Skeleton height={44} /></View>
          ) : users.isError ? (
            <ErrorState onRetry={() => users.refetch()} />
          ) : (
            <EmptyState title={t('convNothingFound')} />
          )
        }
      />

      {group ? (
        <View className="px-4 pb-4 pt-2">
          <Button title={t('mCreateGroupChat')} loading={create.isPending} disabled={!canCreate} onPress={submit} />
        </View>
      ) : null}
    </Screen>
  );
}
