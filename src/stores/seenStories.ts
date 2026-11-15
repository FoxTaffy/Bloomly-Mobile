import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEEN_STORIES_KEY } from '@/shared/stories';

// Какие истории уже смотрели: только для рамки вокруг аватара, не секрет → AsyncStorage (ключ как на вебе).
// Истории живут сутки, поэтому список ограничиваем, оставляя свежие.
const MAX_SEEN = 500;

interface SeenState {
  seen: ReadonlySet<string>;
  hydrate: () => Promise<void>;
  mark: (ids: string[]) => void;
}

const persist = (ids: ReadonlySet<string>) => {
  AsyncStorage.setItem(SEEN_STORIES_KEY, JSON.stringify([...ids].slice(-MAX_SEEN))).catch(() => {
    // отметки действуют до перезапуска
  });
};

export const useSeenStories = create<SeenState>((set, get) => ({
  seen: new Set<string>(),
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(SEEN_STORIES_KEY);
      const stored = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(stored)) set({ seen: new Set([...get().seen, ...stored.filter((x): x is string => typeof x === 'string')]) });
    } catch {
      // остаёмся с пустым списком: рамки будут «не просмотрено»
    }
  },
  mark: (ids) => {
    const cur = get().seen;
    if (ids.every((id) => cur.has(id))) return;
    const next = new Set([...cur, ...ids]);
    set({ seen: next });
    persist(next);
  },
}));
