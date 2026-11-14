import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ChevronLeft } from 'lucide-react-native';
import { ErrorState, Screen } from '@/components/ui';
import { WEB_URL } from '@/lib/config';
import { useT } from '@/hooks/useT';
import { isLegalDoc, LEGAL_PATH, type LegalDoc } from '@/shared/legal';
import type { MessageKey } from '@/shared/i18n';
import { colors } from '@/theme/tokens';

const TITLE: Record<LegalDoc, MessageKey> = { terms: 'termsTitle', privacy: 'privacyTitle', dmca: 'mDmcaTitle' };

/** Условия, политика, DMCA: публичные страницы сайта во встроенном WebView (доступны и без входа). */
export default function LegalScreen() {
  const { t } = useT();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const web = useRef<WebView>(null);

  const valid = isLegalDoc(doc);
  const url = valid ? `${WEB_URL}${LEGAL_PATH[doc]}` : null;
  const host = (() => {
    try {
      return new URL(WEB_URL).host;
    } catch {
      return '';
    }
  })();

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="flex-1 font-nunito-extrabold text-xl text-brand-offwhite" numberOfLines={1}>
          {valid ? t(TITLE[doc]) : ''}
        </Text>
      </View>
      {!url ? (
        <ErrorState title={t('userNotFound')} />
      ) : failed ? (
        <ErrorState
          onRetry={() => {
            setFailed(false);
            setLoading(true);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <View className="flex-1">
          <WebView
            key={attempt}
            ref={web}
            source={{ uri: url }}
            style={{ backgroundColor: colors.bg }}
            originWhitelist={['https://*']}
            // Только публичные страницы: ни cookie, ни токены приложения сюда не передаются
            incognito
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            // Ссылки на другие сайты открываем в системном браузере, а не внутри приложения
            onShouldStartLoadWithRequest={(req) => {
              try {
                if (new URL(req.url).host === host) return true;
              } catch {
                return false;
              }
              void Linking.openURL(req.url);
              return false;
            }}
          />
          {loading ? (
            <View className="absolute inset-0 items-center justify-center bg-brand-bg">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
