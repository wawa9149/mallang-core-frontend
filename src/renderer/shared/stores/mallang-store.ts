import { create } from 'zustand';
import type {
  MallangPersona,
  MallangState,
} from '../../../shared/types/domain';

/**
 * 캐릭터 창의 휘발성 표시 상태(말풍선 / 캐릭터 표정 / persona) 만 보관한다.
 * 온보딩 여부는 백엔드 user.onboardedAt 이 진실의 출처이므로 이 store 에 두지 않는다.
 */
/**
 * setBubble 옵션.
 * - persistent: true면 말풍선이 자동으로 사라지지 않는다. 말랑이가 먼저 던지는 질문처럼
 *   사용자 응답이 와야 의미가 있는 발화에 사용한다. 다음 setBubble 호출 시 다시 false로 돌아간다.
 */
export interface SetBubbleOptions {
  persistent?: boolean;
}

interface MallangStoreState {
  state: MallangState;
  persona: MallangPersona;
  recentBubble: string | null;
  /**
   * recentBubble 이 자동으로 사라지면 안 되는 상태인지 표시한다.
   * - 말랑이가 먼저 던지는 질문(스케줄 intent 응답)일 때 true 로 세팅.
   * - 사용자가 다른 발화/클릭으로 말풍선을 갱신하면 자동으로 false 로 풀린다.
   */
  bubblePersistent: boolean;
  setState: (next: MallangState) => void;
  setPersona: (persona: MallangPersona) => void;
  setBubble: (message: string | null, options?: SetBubbleOptions) => void;
}

export const useMallangStore = create<MallangStoreState>((set) => ({
  state: 'neutral',
  persona: 'rest',
  recentBubble: null,
  bubblePersistent: false,
  setState: (next) => set({ state: next }),
  setPersona: (persona) => set({ persona }),
  setBubble: (message, options) =>
    set({
      recentBubble: message,
      // 호출자가 명시한 옵션을 그대로 따른다. 호출 시점마다 persistent 가 리셋되어
      // 사용자가 새 발화를 던지면 자동 사라짐 룰이 다시 적용된다.
      bubblePersistent: options?.persistent ?? false,
    }),
}));
