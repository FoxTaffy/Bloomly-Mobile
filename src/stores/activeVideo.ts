import { create } from 'zustand';

/** Какое видео сейчас запущено: одновременно играет только одно, остальные возвращаются к кадру «нажмите для воспроизведения». */
interface ActiveVideoState {
  url: string | null;
  set: (url: string | null) => void;
}

export const useActiveVideo = create<ActiveVideoState>((set) => ({ url: null, set: (url) => set({ url }) }));
