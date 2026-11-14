import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, SearchX } from 'lucide-react-native';
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { isNotFound } from '@/shared/apiError';
import { colors } from '@/theme/tokens';

interface DetailScreenStateProps {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Экран карточки (событие, группа), пока данных нет: загрузка, «не найдено» или ошибка с повтором. Никогда не пустой экран. */
export function DetailScreenState({ loading, error, onRetry }: DetailScreenStateProps) {
  const { t } = useT();
  const router = useRouter();
  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-xl text-brand-offwhite" />
      </View>
      {loading ? (
        <View className="gap-3 px-4 pt-2">
          <Skeleton height={160} />
          <Skeleton width={200} height={24} />
          <Skeleton height={60} />
        </View>
      ) : error && !isNotFound(error) ? (
        <ErrorState onRetry={onRetry} />
      ) : (
        <EmptyState icon={<SearchX size={44} color={colors.mutedIcon} />} title={t('mNotFoundTitle')} hint={t('mNotFoundHint')} />
      )}
    </Screen>
  );
}
