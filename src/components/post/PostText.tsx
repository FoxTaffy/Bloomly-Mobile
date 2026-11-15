import { useMemo } from 'react';
import { Linking, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { webPathToRoute } from '@/shared/links';
import { parsePostSegments } from '@/shared/postText';

interface PostTextProps {
  text: string;
  numberOfLines?: number;
  className?: string;
}

/** Текст поста или комментария с кликабельными @упоминаниями и ссылками (web: lib/postText + LinkifiedText). */
export function PostText({ text, numberOfLines, className }: PostTextProps) {
  const router = useRouter();
  const segs = useMemo(() => parsePostSegments(text), [text]);

  const openUrl = (href: string) => {
    // Ссылка на свой сайт открывает экран приложения, остальные — системный браузер
    const route = webPathToRoute(href);
    if (route) router.push(route as Href);
    else Linking.openURL(href).catch(() => {
      // нечем открыть ссылку: остаёмся на экране
    });
  };

  return (
    <Text numberOfLines={numberOfLines} className={className}>
      {segs.map((s) =>
        s.type === 'text' ? (
          s.text
        ) : s.type === 'mention' ? (
          <Text key={s.key} accessibilityRole="link" onPress={() => router.push(`/profile/${s.username}` as Href)} className="font-nunito-bold text-brand-accent-minus">
            {s.text}
          </Text>
        ) : (
          <Text key={s.key} accessibilityRole="link" onPress={() => openUrl(s.href)} className="text-brand-accent-minus underline">
            {s.text}
          </Text>
        ),
      )}
    </Text>
  );
}
