import { useEffect, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, View } from 'react-native';
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
  className?: string;
}

export function Screen({ children, edges = ['top'], keyboard = false, onBackPress, className }: ScreenProps) {
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
    <SafeAreaView className={`flex-1 bg-brand-bg ${className ?? ''}`} edges={edges}>
      {keyboard ? (
        // На Android окно меняет размер само (softwareKeyboardLayoutMode: resize), на iOS нужен отступ.
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
