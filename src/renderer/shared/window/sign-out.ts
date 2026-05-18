import { useAuthStore } from '../stores/auth-store';
import { useMallangStore } from '../stores/mallang-store';
import { useUserProfileStore } from '../stores/user-profile-store';
import { useOnboardingStore } from '../../features/onboarding/onboarding-store';

/**
 * 로그아웃 시 영속/메모리 store를 모두 비우고 로그인 창으로 복귀한다.
 * - localStorage에 남아 있던 auth/profile/onboarding 상태를 정리해서
 *   다음 사용자가 이전 사용자의 자동 로그인/프로필을 보지 못하게 한다.
 * - 캐릭터/마이페이지/그룹 창을 닫고 메인 창을 다시 띄운다.
 */
export async function signOutAndReturnToLogin(): Promise<void> {
  const bridge = window.mallang?.window;
  if (!bridge) {
    throw new Error(
      '[sign-out] window.mallang.window 브릿지를 찾지 못했어. preload 빌드를 확인해 줘.',
    );
  }

  useAuthStore.getState().signOut();
  useUserProfileStore.getState().clearProfile();
  useOnboardingStore.getState().reset();
  useMallangStore.setState({
    state: 'neutral',
    persona: 'rest',
    recentBubble: null,
    isOnboarded: false,
  });

  await bridge.openMain('/login');
  await bridge.closeMyPage().catch(() => undefined);
  await bridge.closeGroup().catch(() => undefined);
  await bridge.closeMallang().catch(() => undefined);
}
