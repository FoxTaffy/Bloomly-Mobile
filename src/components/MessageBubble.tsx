import { View, Text } from 'react-native';
import { Mic, Lock } from 'lucide-react-native';
import type { Message } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';
import { ContentMenu } from './ContentMenu';

export function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const { t } = useT();
  const isVoice = message.type === 'voice' || message.type === 'audio';
  const isEncryptedPlaceholder = !!message.encrypted_text && !message.text;

  return (
    <View className={`mb-2 max-w-[88%] flex-row items-center ${isMine ? 'self-end' : 'self-start'}`}>
      <View className="shrink">
      <View
        className={`rounded-2xl px-4 py-2.5 ${isMine ? 'bg-brand-accent rounded-br-sm' : 'bg-brand-card rounded-bl-sm border border-brand-border'}`}
      >
        {isVoice ? (
          <View className="flex-row items-center gap-2">
            <Mic size={16} color={isMine ? colors.offwhite : colors.accentMinus} />
            <Text className={isMine ? 'text-brand-offwhite' : 'text-brand-offwhite'}>{t('chatVoiceMessageTitle')}</Text>
          </View>
        ) : isEncryptedPlaceholder ? (
          <View className="flex-row items-center gap-2">
            <Lock size={14} color={isMine ? colors.offwhite : colors.accentMinus} />
            <Text className="italic text-brand-offwhite">{t('mEncryptedMessage')}</Text>
          </View>
        ) : (
          <Text className="text-brand-offwhite">{message.text}</Text>
        )}
      </View>
      </View>
      {isMine ? null : (
        <ContentMenu
          size={16}
          report={{ type: 'message', id: message.id, evidence: message.text ?? undefined }}
          author={{ id: message.sender_id, name: message.sender?.username ?? t('mSomeone') }}
        />
      )}
    </View>
  );
}
