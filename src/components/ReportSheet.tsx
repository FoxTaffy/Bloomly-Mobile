import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, Field, Sheet } from '@/components/ui';
import { useSubmitReport } from '@/hooks/useReport';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/shared/i18n';
import type { ReportTarget } from '@/api/reports';

// Причины как в вебе (components/ReportModal.vue).
const REASONS: { value: string; label: MessageKey }[] = [
  { value: 'spam', label: 'mReasonSpam' },
  { value: 'fraud', label: 'mReasonFraud' },
  { value: 'adult', label: 'mReasonAdult' },
  { value: 'violence', label: 'mReasonViolence' },
  { value: 'copyright', label: 'mReasonCopyright' },
  { value: 'misinformation', label: 'mReasonMisinformation' },
  { value: 'other', label: 'mReasonOther' },
];

export function ReportSheet({ visible, onClose, targetType, targetId, evidence }: { visible: boolean; onClose: () => void; targetType: ReportTarget; targetId: string; /** Цитата для модераторов (текст сообщения или комментария), как evidence в ReportModal.vue. */ evidence?: string }) {
  const { t } = useT();
  const [reason, setReason] = useState<string | null>(null);
  const [extra, setExtra] = useState('');
  const { submit, status, reset } = useSubmitReport();

  const close = () => {
    reset();
    setReason(null);
    setExtra('');
    onClose();
  };

  const send = () => {
    if (!reason) return;
    const item = REASONS.find((r) => r.value === reason);
    const text = reason === 'other' ? extra.trim() || t('mReasonOther') : t(item!.label);
    submit({ targetType, targetId, reason: evidence ? `${text}\n\n${t('mReportQuoteHeader')}\n${evidence.slice(0, 1000)}` : text });
  };

  return (
    <Sheet visible={visible} title={t('report')} onClose={close}>
      {status === 'sent' ? (
        <View className="items-center py-6">
          <Text className="font-nunito-extrabold text-base text-brand-offwhite">{t('reportSent')}</Text>
          <Text className="mt-1 text-center font-nunito text-sm text-brand-muted">{t('mReportSentHint')}</Text>
          <Button title={t('mClose')} variant="secondary" className="mt-4" onPress={close} />
        </View>
      ) : (
        <View>
          {evidence ? <Text numberOfLines={3} className="mb-3 rounded-2xl border border-brand-border px-3 py-2 font-nunito text-xs text-brand-muted">{evidence}</Text> : null}
          <Text className="mb-2 font-nunito-bold text-xs text-brand-muted">{t('mReportChooseReason')}</Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {REASONS.map((r) => (
              <Chip key={r.value} label={t(r.label)} selected={reason === r.value} onPress={() => setReason(r.value)} />
            ))}
          </View>
          {reason === 'other' ? <Field value={extra} onChangeText={setExtra} placeholder={t('mReportOtherPlaceholder')} multiline maxLength={500} className="mb-3" /> : null}
          {status === 'duplicate' ? <Text className="mb-3 font-nunito text-xs text-brand-error">{t('mReportDuplicate')}</Text> : null}
          {status === 'rate' ? <Text className="mb-3 font-nunito text-xs text-brand-error">{t('mReportRateLimited')}</Text> : null}
          {status === 'error' ? <Text className="mb-3 font-nunito text-xs text-brand-error">{t('mReportFailed')}</Text> : null}
          <Button title={t('send')} loading={status === 'sending'} disabled={!reason} onPress={send} />
        </View>
      )}
    </Sheet>
  );
}
