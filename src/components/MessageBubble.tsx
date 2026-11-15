import { View, Text } from 'react-native';
import { Mic, Lock, Clock, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Image } from 'expo-image';
import { mediaSource } from '@/lib/mediaAuth';
import { parseStoryReply } from '@/shared/stories';
import type { Message } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';
import { ContentMenu } from './ContentMenu';
import { VoiceMessage } from '@/components/chat/VoiceMessage';

export function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const { t } = useT();
  const isVoice = message.type === 'voice' || message.type === 'audio';
  const isEncryptedPlaceholder = !!message.encrypted_text && !message.text;
  // Ответ на историю: на вебе это карточка со превью и текстом, а не служебная строка с JSON
  const storyReply = useMemo(() => parseStoryReply(message.text), [message.text]);

  return (
    <View className={`mb-2 max-w-[88%] flex-row items-center ${isMine ? 'self-end' : 'self-start'}`}>
      <View className="shrink">
      <View
        className={`rounded-2xl px-4 py-2.5 ${isMine ? 'bg-brand-accent rounded-br-sm' : 'bg-brand-card rounded-bl-sm border border-brand-border'}`}
      >
        {isVoice && message.file_url ? (
          <VoiceMessage id={message.id} url={message.file_url} isMine={isMine} />
        ) : isVoice ? (
          <View className="flex-row items-center gap-2">
            <Mic size={16} color={isMine ? colors.offwhite : colors.accentMinus} />
            <Text className={isMine ? 'text-brand-offwhite' : 'text-brand-offwhite'}>{t('chatVoiceMessageTitle')}</Text>
          </View>
        ) : isEncryptedPlaceholder ? (
          <View className="flex-row items-center gap-2">
            <Lock size={14} color={isMine ? colors.offwhite : colors.accentMinus} />
            <Text className="italic text-brand-offwhite">{t('mEncryptedMessage')}</Text>
          </View>
        ) : storyReply ? (
          <View className="w-48 gap-2">
            <View className="aspect-[9/16] max-h-56 items-center justify-center overflow-hidden rounded-xl bg-brand-bg">
              {storyReply.imageUrl && !storyReply.expired ? (
                <Image source={mediaSource(storyReply.imageUrl)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="items-center gap-1">
                  <Clock size={28} color={colors.mutedIcon} />
                  <Text className="font-nunito-bold text-xs text-brand-muted">{t('chatStoryExpiredLabel')}</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <Sparkles size={12} color={colors.accentMinus} />
              <Text numberOfLines={1} className="flex-1 font-nunito text-xs text-brand-offwhite/80">{storyReply.authorName ? `${t('story')} · ${storyReply.authorName}` : t('story')}</Text>
            </View>
            {storyReply.replyText ? <Text className="text-brand-offwhite">{storyReply.replyText}</Text> : null}
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
