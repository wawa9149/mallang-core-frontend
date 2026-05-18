import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile } from '../../../shared/types/domain';

/**
 * 사용자가 직접 편집하는 프로필 값. 온보딩 직후 한 번 채워지고,
 * 마이페이지에서 갱신될 때마다 localStorage에 그대로 덮어쓴다.
 * 단일 객체 덮어쓰기 구조라 사용량은 한 줄짜리 JSON만 유지된다.
 */
interface UserProfileStoreState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileStoreState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (patch) =>
        set((prev) =>
          prev.profile ? { profile: { ...prev.profile, ...patch } } : prev,
        ),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'mallang.user-profile',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
