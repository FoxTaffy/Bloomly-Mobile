import { useEffect, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useWindowClass } from '@/hooks/useWindowClass';

/** Максимальная ширина содержимого на широких окнах (Pixel Fold, iPad), чтобы лента не растягивалась на весь экран. */
const CONTENT_MAX_WIDTH = 720;

interface ScreenProps {
  children: ReactNode;
  /** Какие края учитывать как безопасные. Экраны внутри вкладок: ['top'] (снизу — панель вкладок). */
  edges?: Edge[];
  /** Поднимать содержимое над клавиатурой (экраны с полями ввода). */
  keyboard?: boolean;
  /** Перехват жеста/кнопки «назад» на Android (например, закрыть лист). Вернуть true, если событие обработано. */
  onBackPress?: () => boolean;
  /** Без фона brand-bg: экран рисует свой фон (например, экран входа). */
  transparent?: boolean;
  className?: string;
}

export function Screen({ children, edges = ['top'], keyboard = false, onBackPress, transparent = false, className }: ScreenProps) {
  const windowClass = useWindowClass();

  useEffect(() => {
    if (!onBackPress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBackPress]);

  const body = (
    <View className="flex-1" style={windowClass === 'compact' ? undefined : { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${transparent ? '' : 'bg-brand-bg'} ${className ?? ''}`} edges={edges}>
      {keyboard ? (
        // Android 15+ рисует edge-to-edge: окно при появлении клавиатуры не сжимается, поэтому отступ нужен на обеих платформах.
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
