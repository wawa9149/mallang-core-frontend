import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../shared/stores/auth-store';
import { transitionToMallangWindow } from '../shared/window/transition-to-mallang';

/**
 * 앱 시작 라우트(/).
 *
 * - 로그인 상태가 localStorage에 남아 있으면 자동으로 캐릭터 창을 띄우고
 *   메인 창은 닫는다. (Slack/Discord식의 자동 로그인)
 * - 미로그인 상태면 평소처럼 /login으로 보낸다.
 */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const handedOff = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || handedOff.current) return;
    handedOff.current = true;
    transitionToMallangWindow().catch((error) => {
      // 브릿지 문제로 실패하면 다음 사이클에 다시 시도할 수 있도록 플래그를 푼다.
      handedOff.current = false;
      console.error('[auth-guard] failed to hand off to mallang window', error);
    });
  }, [isAuthenticated]);

  if (isAuthenticated) {
    // 핸드오프 동안 잠깐만 비워둔다 (메인 창이 곧 닫힘).
    return null;
  }

  return <Navigate to="/login" replace />;
}
