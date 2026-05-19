import type { User } from '../../../shared/types/domain';
import { useOnboardingStore } from '../../features/onboarding/onboarding-store';
import { hobbyToPersona } from '../api/mappers';
import { fetchTeamMembers } from '../api/teams-api';
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
 * 백엔드 user 응답을 UserProfile 로 변환해 store 에 채워 넣는다.
 *
 * 로그인 직후 호출하면 user-profile-store 가 비어 있어 MallangOverlayPage 가
 * OnboardingFlow 로 빠져버리는 문제를 막을 수 있다.
 * - team 이름은 BackendPublicUser 에 들어 있지 않아 별도 API 로 가져온다.
 *   비동기 호출 실패는 무시한다 (네트워크 일시 오류로 로그인 자체를 깨뜨릴 이유가 없다).
 * - signup 직후에는 호출하지 않는다. 신규 사용자는 OnboardingFlow 를 거치며 본인 값을 직접 입력해야 한다.
 */
export function hydrateProfileFromBackend(
  backendUser: BackendPublicUser,
): void {
  useUserProfileStore.getState().setProfile({
    name: backendUser.name,
    team: '',
    workStartTime: backendUser.workStartTime,
    lunchTime: backendUser.lunchTime,
    workEndTime: backendUser.workEndTime,
    hobby: hobbyToPersona(backendUser.hobby),
    allergies: backendUser.allergies ?? '',
  });

  if (!backendUser.teamId) return;
  fetchTeamMembers()
    .then((result) => {
      if (result.team?.name) {
        useUserProfileStore
          .getState()
          .updateProfile({ team: result.team.name });
      }
    })
    .catch((error) => {
      console.warn('[session] failed to hydrate team name', error);
    });
}
