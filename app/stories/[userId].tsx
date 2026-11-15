import { useLocalSearchParams } from 'expo-router';
import { StoryViewer } from '@/components/story/StoryViewer';

/** Просмотр историй автора (и следующих за ним). Веб-аналог: components/StoryViewer.vue. */
export default function StoriesScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <StoryViewer userId={userId} />;
}
