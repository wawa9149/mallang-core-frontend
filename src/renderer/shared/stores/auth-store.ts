import { create } from 'zustand';
import type { User } from '../../../shared/types/domain';

/**
 * 로그인/회원가입 후 현재 사용자 세션을 보관한다.
 * MVP에서는 메모리만 유지하고, 추후 secure storage(electron-store + keytar)로 영속화한다.
 */
interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  signOut: () => set({ user: null, isAuthenticated: false }),
}));
