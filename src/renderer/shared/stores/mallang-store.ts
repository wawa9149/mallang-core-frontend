import { create } from 'zustand';
import type {
  MallangPersona,
  MallangState,
} from '../../../shared/types/domain';

/**
 * 캐릭터 창과 메인 창이 같은 상태를 공유하기 위한 전역 store.
 * MVP는 메모리만 유지하고, 추후 secure storage(electron-store + keytar)로 영속화한다.
 */
interface MallangStoreState {
  state: MallangState;
  persona: MallangPersona;
  recentBubble: string | null;
  isOnboarded: boolean;
  setState: (next: MallangState) => void;
  setPersona: (persona: MallangPersona) => void;
  setBubble: (message: string | null) => void;
  setOnboarded: (value: boolean) => void;
}

export const useMallangStore = create<MallangStoreState>((set) => ({
  state: 'neutral',
  persona: 'rest',
  recentBubble: null,
  isOnboarded: false,
  setState: (next) => set({ state: next }),
  setPersona: (persona) => set({ persona }),
  setBubble: (message) => set({ recentBubble: message }),
  setOnboarded: (value) => set({ isOnboarded: value }),
}));
