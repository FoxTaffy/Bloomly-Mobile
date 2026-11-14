import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { FEED_CACHE_MAX_AGE_MS, isCacheableFeedKey, sanitizeFeedData, type FeedCacheData } from '@/shared/feedCache';

// Кэш для чтения без сети хранится в AsyncStorage (не секрет): только первая страница публичной ленты. Токены остаются
// в SecureStore/памяти и сюда не попадают. При выходе из аккаунта кэш стирается (clearPersistedCache).
const KEY = 'bloomly_query_cache_v1';

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: KEY,
  throttleTime: 2000,
  // Защита от ошибки в фильтре dehydrate: перед записью оставляем только разрешённые запросы в очищенном виде
  serialize: (client) =>
    JSON.stringify({
      ...client,
      clientState: {
        mutations: [],
        queries: client.clientState.queries
          .filter((q) => isCacheableFeedKey(q.queryKey))
          .map((q) => ({ ...q, state: { ...q.state, data: sanitizeFeedData(q.state.data as FeedCacheData | undefined) } }))
          .filter((q) => q.state.data),
      },
    }),
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: FEED_CACHE_MAX_AGE_MS,
  // Смена версии приложения сбрасывает кэш: формат данных мог измениться
  buster: Constants.expoConfig?.version ?? '',
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.state.status === 'success' && isCacheableFeedKey(q.queryKey),
    shouldDehydrateMutation: () => false,
  },
};

export async function clearPersistedCache(): Promise<void> {
  try {
    await persister.removeClient();
    await AsyncStorage.removeItem(KEY);
  } catch {
    // нет доступа к хранилищу — нечего стирать
  }
}
