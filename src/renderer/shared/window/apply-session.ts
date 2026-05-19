import type { User } from '../../../shared/types/domain';
import { useOnboardingStore } from '../../features/onboarding/onboarding-store';
import type { BackendPublicUser } from '../api/types';
import type { AuthTokens } from '../stores/auth-store';
import { useAuthStore } from '../stores/auth-store';
import { useMallangStore } from '../stores/mallang-store';
import { useUserProfileStore } from '../stores/user-profile-store';

/**
 * 로그인/회원가입 성공 시 세션을 적용한다.
 *
 * - 직전에 로그인돼 있던 사용자와 id가 다르면(혹은 비어 있다가 새로 들어오면)
 *   user-profile / onboarding / mallang state를 모두 초기화해서 이전 사용자의
 *   데이터(특히 온보딩 완료 여부 / hobby / 근무 시간)가 새 사용자에게 새지 않게 한다.
 * - 같은 사용자의 재로그인은 그대로 두어 자동 로그인 UX를 유지한다.
 */
export function applyAuthenticatedSession(
  user: User,
  tokens: AuthTokens,
): void {
  const prev = useAuthStore.getState().user;
  const isDifferentUser = !prev || prev.id !== user.id;

  if (isDifferentUser) {
    useUserProfileStore.getState().clearProfile();
    useOnboardingStore.getState().reset();
    useMallangStore.setState({
      state: 'neutral',
      persona: 'rest',
      recentBubble: null,
      isOnboarded: false,
    });
  }

  useAuthStore.getState().setSession(user, tokens);
}

/**
 * 백엔드 user 응답을 보고 "이미 온보딩을 마친 사용자"인지 판단한다.
 *
 * 주의: 백엔드 signup 시 `name`이 비어 있으면 자동으로 이메일 prefix 로 채워지기 때문에
 * `name` 단독 기준은 신규 가입자를 잘못된 onboarded 로 인식할 수 있다.
 * 그래서 OnboardingFlow 의 PATCH 흐름에서만 채워지는 `teamId` 가 함께 존재하는지를 확인한다.
 *  - name 만 있고 teamId 가 null → 가입만 한 상태(=OnboardingFlow 필요)
 *  - name + teamId 둘 다 있음 → 이미 온보딩을 마침
 */
export function isUserOnboarded(backendUser: BackendPublicUser): boolean {
  const hasName = backendUser.name.trim().length > 0;
  const hasTeam = Boolean(backendUser.teamId);
  return hasName && hasTeam;
}
