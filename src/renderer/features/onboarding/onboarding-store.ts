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
}

const INITIAL_ANSWERS: OnboardingAnswers = {
  name: '',
  workStart: '',
  lunch: '',
  workEnd: '',
  hobby: null,
  allergies: '',
  team: '',
};

interface OnboardingStoreState {
  stepIndex: number;
  answers: OnboardingAnswers;
  updateAnswers: (patch: Partial<OnboardingAnswers>) => void;
  next: () => void;
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
      reset: () => set({ stepIndex: 0, answers: INITIAL_ANSWERS }),
    }),
    {
      name: 'mallang.onboarding',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
