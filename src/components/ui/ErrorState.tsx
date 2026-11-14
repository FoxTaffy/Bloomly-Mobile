import { TriangleAlert } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Не удалось загрузить', hint = 'Проверьте соединение и попробуйте ещё раз.', onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      title={title}
      hint={hint}
      icon={<TriangleAlert size={28} color={colors.error} />}
      action={onRetry ? <Button title="Повторить" variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}
