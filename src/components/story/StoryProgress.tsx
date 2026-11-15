import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

interface StoryProgressProps {
  count: number;
  index: number;
  /** Меняется при смене истории: сбрасывает таймер, даже если позиция полоски та же (первая история другого автора). */
  resetKey: string;
  /** Идёт ли таймер фото (медиа загружено и нет паузы). У видео вместо таймера — `fraction`. */
  running: boolean;
  durationMs: number;
  /** Доля воспроизведённого видео, 0..1; null — таймер фото. */
  fraction: number | null;
  onDone: () => void;
}

/** Полоски прогресса: пройденные заполнены, текущая идёт по таймеру (фото) или по времени ролика (видео). */
export function StoryProgress({ count, index, resetKey, running, durationMs, fraction, onDone }: StoryProgressProps) {
  return (
    <View className="flex-row gap-1" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
          {i < index ? <View className="h-full w-full bg-white" /> : null}
          {i === index ? <ActiveBar key={resetKey} running={running} durationMs={durationMs} fraction={fraction} onDone={onDone} /> : null}
        </View>
      ))}
    </View>
  );
}

function ActiveBar({ running, durationMs, fraction, onDone }: Omit<StoryProgressProps, 'count' | 'index' | 'resetKey'>) {
  const [p, setP] = useState(0);
  const elapsed = useRef(0);
  const done = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (fraction !== null || !running) return;
    let last: number | null = null;
    let raf = 0;
    const tick = (now: number) => {
      if (last === null) last = now;
      elapsed.current += now - last;
      last = now;
      const v = Math.min(1, elapsed.current / durationMs);
      setP(v);
      if (v >= 1) {
        if (!done.current) {
          done.current = true;
          doneRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Пауза: накопленное время сохраняется в elapsed, дальше таймер продолжит с того же места
    return () => cancelAnimationFrame(raf);
  }, [running, fraction, durationMs]);

  const shown = fraction ?? p;
  return <View className="h-full bg-white" style={{ width: `${Math.round(shown * 100)}%` }} />;
}
