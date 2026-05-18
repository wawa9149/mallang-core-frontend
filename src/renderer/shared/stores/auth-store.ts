import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '../../../shared/types/domain';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * 로그인/회원가입 후 현재 사용자 세션과 JWT 토큰 페어를 보관한다.
 *
 * 토큰은 localStorage에 평문으로 들어간다. mock 단계에서만 사용하고,
 * 백엔드 연동 단계에서 keytar + secure storage로 교체한다.
 */
interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  setSession: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      tokens: null,
      setSession: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true }),
      setUser: (user) => set({ user, isAuthenticated: true }),
      setTokens: (tokens) => set({ tokens }),
      signOut: () => set({ user: null, tokens: null, isAuthenticated: false }),
    }),
    {
      name: 'mallang.auth',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
