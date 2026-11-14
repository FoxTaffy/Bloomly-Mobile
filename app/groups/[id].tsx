import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ContentMenu } from '@/components/ContentMenu';
import { DetailScreenState } from '@/components/DetailScreenState';
import { Screen } from '@/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useGroup, useJoinGroup } from '@/hooks/useGroups';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export default function GroupDetailScreen() {
  const { t, locale } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groupQuery = useGroup(id);
  const group = groupQuery.data;
  const joinMutation = useJoinGroup();

  if (!group) return <DetailScreenState loading={groupQuery.isLoading} error={groupQuery.error} onRetry={() => groupQuery.refetch()} />;

  return (
    <Screen>
      <ScrollView>
        <View className="relative">
          <LinearGradient colors={[group.accent_color ?? colors.accent, colors.purple]} style={{ height: 160, width: '100%' }}>
            {group.banner_url ? (
              <Image source={{ uri: group.banner_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : null}
          </LinearGradient>
          <Pressable
            onPress={() => router.back()}
            className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/40"
          >
            <ChevronLeft size={18} color={colors.offwhite} />
          </Pressable>
          <View className="absolute right-4 top-4 rounded-full bg-black/40">
            <ContentMenu report={{ type: 'group', id: group.id }} />
          </View>
        </View>
        <View className="p-4">
          <Text className="mb-1 text-2xl font-extrabold text-brand-offwhite">{group.name}</Text>
          <Text className="mb-4 text-brand-muted">{group.member_count.toLocaleString(locale)} {t('membersCount')}</Text>
          {group.description ? <Text className="mb-4 leading-5 text-brand-offwhite">{group.description}</Text> : null}
          <Pressable onPress={() => joinMutation.mutate(id)} className="rounded-2xl bg-brand-accent py-3.5">
            <Text className="text-center font-bold text-brand-offwhite">{t('mJoinGroup')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
