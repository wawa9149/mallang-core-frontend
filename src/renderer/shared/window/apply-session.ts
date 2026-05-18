import type { User } from '../../../shared/types/domain';
import { useOnboardingStore } from '../../features/onboarding/onboarding-store';
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
