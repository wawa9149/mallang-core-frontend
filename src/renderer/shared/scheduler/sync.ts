import type { SchedulerConfigPayload } from '../../../shared/ipc/channels';
import { useNotificationStore } from '../stores/notification-store';
import { useUserProfileStore } from '../stores/user-profile-store';

/**
 * 현재 zustand 상태(프로필 + 알림 토글)를 메인 프로세스 스케줄러에 동기화한다.
 *
 * 호출 시점:
 *  - 말랑이 창 마운트 직후(GET /auth/me 동기화 끝나고)
 *  - 마이페이지 PATCH /users/me 성공 시
 *  - 알림 토글이 바뀔 때
 *  - 로그아웃 시(별도 clearScheduler 사용)
 */
export async function syncSchedulerFromStores(): Promise<void> {
  if (!window.mallang) return;
  const profile = useUserProfileStore.getState().profile;
  const bannerEnabled = useNotificationStore.getState().bannerEnabled;

  const payload: SchedulerConfigPayload = {
    workStartTime: profile?.workStartTime ?? null,
    lunchTime: profile?.lunchTime ?? null,
    workEndTime: profile?.workEndTime ?? null,
    bannerEnabled,
  };
  try {
    await window.mallang.scheduler.syncConfig(payload);
  } catch (error) {
    console.error('[scheduler] sync failed', error);
  }
}

export async function clearScheduler(): Promise<void> {
  if (!window.mallang) return;
  try {
    await window.mallang.scheduler.clear();
  } catch (error) {
    console.error('[scheduler] clear failed', error);
  }
}
