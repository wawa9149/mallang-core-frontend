import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MallangPersona } from '../../../shared/types/domain';

/**
 * 말랑이 생성 채팅의 진행 상태와 누적 답변을 보관한다.
 * 단계는 순서대로 진행되고, 마지막 confirm에서 yes를 누르면 완료된다.
 */
export interface OnboardingAnswers {
  name: string;
  workStart: string;
  lunch: string;
  workEnd: string;
  hobby: MallangPersona | null;
  allergies: string;
  team: string;
  address: string;
  apiKey: string;
}

const INITIAL_ANSWERS: OnboardingAnswers = {
  name: '',
  workStart: '',
  lunch: '',
  workEnd: '',
  hobby: null,
  allergies: '',
  team: '',
  address: '',
  apiKey: '',
};

interface OnboardingStoreState {
  stepIndex: number;
  answers: OnboardingAnswers;
  updateAnswers: (patch: Partial<OnboardingAnswers>) => void;
  next: () => void;
  /** 누적 답변을 유지한 채 첫 단계로만 되돌린다. 사용자가 확인 단계에서 "다시 알려줄게"를 누른 경우. */
  restart: () => void;
  /** 모든 상태를 초기화한다. 온보딩이 성공적으로 끝났을 때만 호출한다. */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set) => ({
      stepIndex: 0,
      answers: INITIAL_ANSWERS,
      updateAnswers: (patch) =>
        set((prev) => ({ answers: { ...prev.answers, ...patch } })),
      next: () => set((prev) => ({ stepIndex: prev.stepIndex + 1 })),
      restart: () => set({ stepIndex: 0 }),
      reset: () => set({ stepIndex: 0, answers: INITIAL_ANSWERS }),
    }),
    {
      name: 'mallang.onboarding',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
