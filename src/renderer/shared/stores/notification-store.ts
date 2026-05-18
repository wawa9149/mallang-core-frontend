import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * 데스크탑 배너 알림 사용 여부. 메인 프로세스 스케줄러가 도래한 intent를 발화시킬 때
 * 이 토글이 켜져 있으면 OS 배너까지 띄우고, 꺼져 있으면 말풍선만 표시한다.
 *
 * 향후 서버 동기화가 필요해지면 useAuthStore 쪽 user 정보에 함께 옮겨도 된다.
 * 지금은 클라이언트 로컬 설정으로 충분.
 */
interface NotificationStoreState {
  bannerEnabled: boolean;
  setBannerEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationStoreState>()(
  persist(
    (set) => ({
      bannerEnabled: true,
      setBannerEnabled: (enabled) => set({ bannerEnabled: enabled }),
    }),
    {
      name: 'mallang.notification',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
