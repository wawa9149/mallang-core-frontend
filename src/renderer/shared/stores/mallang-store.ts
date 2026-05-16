import { create } from 'zustand';
import type { MallangState } from '../../../shared/types/domain';

/**
 * 말랑이 캐릭터 창과 메인 창이 같은 상태를 보도록 하기 위한 전역 store.
 * MVP에서는 localStorage 정도로만 영속화하고, 추후 서버 동기화로 확장한다.
 */
interface MallangStoreState {
  state: MallangState;
  recentBubble: string | null;
  setState: (next: MallangState) => void;
  setBubble: (message: string | null) => void;
}

export const useMallangStore = create<MallangStoreState>((set) => ({
  state: 'neutral',
  recentBubble: null,
  setState: (next) => set({ state: next }),
  setBubble: (message) => set({ recentBubble: message }),
}));
