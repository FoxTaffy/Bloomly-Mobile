import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { Button, Screen } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { reportError } from '@/lib/monitoring';
import { colors } from '@/theme/tokens';

interface ErrorScreenProps {
  error: Error;
  /** Повторить: перерисовать экран, на котором случилась ошибка. */
  retry: () => void | Promise<void>;
}

/**
 * Экран на случай необработанной ошибки отрисовки (ErrorBoundary expo-router). Без провайдеров и запросов: должен работать, даже
 * если сломалось всё остальное. Ошибка уходит в Sentry только при заданном DSN (события очищаются от персональных данных).
 */
export function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const { t } = useT();
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <TriangleAlert size={44} color={colors.error} />
        <Text className="text-center font-nunito-extrabold text-xl text-brand-offwhite">{t('mErrorTitle')}</Text>
        <Text className="text-center font-nunito text-sm leading-5 text-brand-muted">{t('mErrorHint')}</Text>
        {__DEV__ ? <Text className="text-center font-nunito text-xs text-brand-error">{error.message}</Text> : null}
        <Button title={t('mErrorRetry')} onPress={() => void retry()} className="mt-2" />
      </View>
    </Screen>
  );
}
