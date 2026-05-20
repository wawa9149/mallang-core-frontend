import { useOnboardingStore } from '../../features/onboarding/onboarding-store';
import { clearScheduler } from '../scheduler/sync';
import { useAuthStore } from '../stores/auth-store';
import { useMallangStore } from '../stores/mallang-store';
import { useUserProfileStore } from '../stores/user-profile-store';

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
  // 온보딩 여부는 백엔드 user.onboardedAt 으로 추적되므로 별도 플래그를 다룰 필요가 없다.
  useMallangStore.setState({
    state: 'neutral',
    persona: 'rest',
    recentBubble: null,
    bubblePersistent: false,
  });
  // 메인 프로세스에 떠 있던 사용자 시간 설정과 발사 기록도 함께 비운다.
  await clearScheduler();

  // 1) 로그인 창을 먼저 띄워 둬야 모든 창이 닫혀도 앱이 종료되지 않는다.
  await bridge.openMain('/login');
  // 2) 말랑이 창을 닫으면 메인 프로세스의 'closed' 핸들러가 부속 패널
  //    (마이페이지/그룹/점심 투표)을 함께 정리해 준다.
  //    여기서 closeMyPage 같은 호출을 직접 await 하면, 마이페이지에서
  //    로그아웃을 눌렀을 때 자기 자신 렌더러가 먼저 파괴되면서 다음 IPC가
  //    실행되지 않아 말랑이 창이 남는 문제가 생긴다.
  await bridge.closeMallang().catch(() => undefined);
}
