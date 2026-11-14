import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { ReportSheet } from './ReportSheet';
import type { ReportTarget } from '@/api/reports';
import { Button, Sheet } from '@/components/ui';
import { useBlockStatus, useToggleBlock } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

interface ContentMenuProps {
  /** Что именно показывается: пост, сообщение, группа или пользователь (комментарий — жалоба на автора с цитатой). */
  report: { type: ReportTarget; id: string; evidence?: string };
  /** Автор, которого можно заблокировать (не нужен для групп). */
  author?: { id: string; name: string } | null;
  size?: number;
}

/**
 * Меню «⋯» у пользовательского контента: пожаловаться и заблокировать автора. Для своего контента не показывается.
 * Эндпоинты: POST /admin/reports (post, group, listing, message, user), POST/DELETE /users/:id/block.
 */
export function ContentMenu({ report, author, size = 18 }: ContentMenuProps) {
  const { t } = useT();
  const myId = useSession((s) => s.user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const authorId = author?.id ?? '';
  const isOwn = !!author && author.id === myId;
  const blockStatus = useBlockStatus(authorId || undefined, menuOpen && !!author && !isOwn);
  const toggleBlock = useToggleBlock(authorId);
  if (isOwn) return null;
  const blocked = !!blockStatus.data;

  return (
    <>
      <Pressable onPress={() => setMenuOpen(true)} accessibilityRole="button" accessibilityLabel={t('mMore')} hitSlop={10} className="h-9 w-9 items-center justify-center active:opacity-60">
        <Ellipsis size={size} color={colors.mutedIcon} />
      </Pressable>
      <Sheet visible={menuOpen} title={t('report')} onClose={() => setMenuOpen(false)}>
        <View className="gap-2 pb-2">
          <Button
            title={t('report')}
            variant="secondary"
            onPress={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
          />
          {author ? (
            <Button
              title={blocked ? `${t('mUnblockUser')} @${author.name}` : `${t('blockUserBtn')} @${author.name}`}
              variant="secondary"
              loading={toggleBlock.isPending}
              onPress={() => toggleBlock.mutate(blocked, { onSuccess: () => setMenuOpen(false) })}
            />
          ) : null}
        </View>
      </Sheet>
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType={report.type} targetId={report.id} evidence={report.evidence} />
    </>
  );
}
