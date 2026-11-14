import { useState } from 'react';
import { Text, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { ExploreFeed } from '@/components/explore/ExploreFeed';
import { SearchResults } from '@/components/search/SearchResults';
import { Field, Screen } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { colors } from '@/theme/tokens';

/** Вкладка «Поиск»: пока строка пуста — обзор (/explore на вебе), иначе результаты поиска (/search). */
export default function DiscoverScreen() {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const query = useDebouncedValue(text.trim(), 300);
  const searching = text.trim().length > 0;

  return (
    <Screen>
      <View className="px-4 py-2">
        <Text className="mb-3 font-nunito-extrabold text-2xl text-brand-offwhite">Поиск</Text>
        <Field
          value={text}
          onChangeText={setText}
          placeholder="Найти людей, группы, теги, посты"
          icon={<Search size={18} color={colors.mutedIcon} />}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          className="mb-3"
        />
      </View>
      {searching ? (
        <SearchResults
          query={query}
          onPickTag={(t) => {
            setTag(t);
            setText('');
          }}
        />
      ) : (
        <ExploreFeed tag={tag} onTagChange={setTag} />
      )}
    </Screen>
  );
}
