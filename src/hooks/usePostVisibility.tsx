import { createContext, useContext, useRef, useState } from 'react';

// Какие посты сейчас на экране в списке. Видео за пределами экрана останавливаем: список даёт id видимых постов
// через onViewableItemsChanged, карточка читает их из контекста. Без списка-поставщика (экран поста) считаем «виден».
const VisibleIdsContext = createContext<ReadonlySet<string> | null>(null);
export const PostVisibilityProvider = VisibleIdsContext.Provider;

export function useIsPostVisible(postId: string): boolean {
  const ids = useContext(VisibleIdsContext);
  return ids === null || ids.has(postId);
}

/** Подключить к FlatList/FlashList постов: `{...props}` на список, `ids` в PostVisibilityProvider вокруг него. */
export function useViewableIds() {
  const [ids, setIds] = useState<ReadonlySet<string> | null>(null);
  const props = useRef({
    onViewableItemsChanged: ({ viewableItems }: { viewableItems: { item?: unknown }[] }) =>
      setIds(new Set(viewableItems.map((v) => (v.item as { id?: string } | undefined)?.id).filter((id): id is string => !!id))),
    viewabilityConfig: { itemVisiblePercentThreshold: 40 },
  }).current;
  return { ids, props };
}
