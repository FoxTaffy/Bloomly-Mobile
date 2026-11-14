import { TriangleAlert } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { useT } from '@/hooks/useT';

interface ErrorStateProps {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, hint, onRetry }: ErrorStateProps) {
  const { t } = useT();
  return (
    <EmptyState
      title={title ?? t('mLoadFailed')}
      hint={hint ?? t('mCheckConnection')}
      icon={<TriangleAlert size={28} color={colors.error} />}
      action={onRetry ? <Button title={t('retryBtn')} variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}
