import type { SchedulerConfigPayload } from '../../../shared/ipc/channels';
import { fetchTeamMembers } from '../api/teams-api';
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
  const teamLunchVoteTime = await getTeamEarliestLunchTime(
    profile?.lunchTime ?? null,
  );

  const payload: SchedulerConfigPayload = {
    workStartTime: profile?.workStartTime ?? null,
    lunchTime: profile?.lunchTime ?? null,
    teamLunchVoteTime,
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

/**
 * 팀원들의 lunchTime 중 가장 빠른 값을 점심 투표 시작 기준으로 사용한다.
 *
 * - 팀 API 호출이 실패하면 앱 시작/로그인 직후 네트워크 상태나 토큰 갱신 타이밍 문제일 수 있으므로
 *   스케줄러 전체를 끊지 않고 본인 lunchTime 으로 폴백한다.
 * - 팀원이 없거나 아직 팀 정보가 준비되지 않은 경우도 본인 lunchTime 으로 폴백한다.
 */
async function getTeamEarliestLunchTime(
  fallbackLunchTime: string | null,
): Promise<string | null> {
  try {
    const team = await fetchTeamMembers();
    const lunchTimes = team.members
      .map((member) => member.lunchTime)
      .filter(isValidHHMM);
    if (lunchTimes.length === 0) return fallbackLunchTime;
    return lunchTimes.sort(compareHHMM)[0];
  } catch (error) {
    console.warn('[scheduler] failed to fetch team lunch times', error);
    return fallbackLunchTime;
  }
}

function isValidHHMM(value: string | null | undefined): value is string {
  if (!value) return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function compareHHMM(a: string, b: string): number {
  return toMinutes(a) - toMinutes(b);
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
