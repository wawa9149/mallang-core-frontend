import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '../../../shared/types/domain';

/**
 * 로그인/회원가입 후 현재 사용자 세션을 보관한다.
 * localStorage에 평문으로 들어가므로 mock 단계에서만 사용하고,
 * 백엔드 연동 단계에서 keytar + secure storage로 교체한다.
 */
interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      signOut: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'mallang.auth',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
