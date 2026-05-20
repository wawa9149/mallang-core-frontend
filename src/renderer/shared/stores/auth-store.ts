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

/**
 * Electron 멀티 윈도우에서 각 BrowserWindow 는 별도의 zustand 인스턴스를 갖는다.
 * persist 미들웨어는 마운트 시 localStorage 에서 한 번만 hydrate 하므로,
 * 다른 창에서 refresh 후 setTokens 로 토큰이 회전돼도 이쪽 창 메모리는 stale 인 채로 남는다.
 * → 다음 401 에서 stale refresh token 으로 재시도 → 백엔드 revoked → 강제 로그아웃이 반복된다.
 *
 * localStorage 의 'mallang.auth' 키가 다른 창에서 갱신되면 storage 이벤트로 알 수 있으니,
 * 이벤트를 받을 때마다 persist 의 rehydrate 를 호출해 메모리 상태를 최신화한다.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'mallang.auth') return;
    void useAuthStore.persist.rehydrate();
  });
}
