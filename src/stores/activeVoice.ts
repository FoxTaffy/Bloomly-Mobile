import { create } from 'zustand';

/** Какое голосовое сообщение сейчас играет: одновременно только одно, начало другого останавливает первое. */
interface ActiveVoiceState {
  id: string | null;
  set: (id: string | null) => void;
}

export const useActiveVoice = create<ActiveVoiceState>((set) => ({ id: null, set: (id) => set({ id }) }));
