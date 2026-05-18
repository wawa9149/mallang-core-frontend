/**
 * 로그인/회원가입 직후 캐릭터 창을 띄우고 메인 창을 닫는 공통 시퀀스.
 * preload 브릿지가 없으면 명시적 에러로 알려서 silent fail을 막는다.
 */
export async function transitionToMallangWindow(): Promise<void> {
  const bridge = window.mallang?.window;
  if (!bridge) {
    throw new Error(
      '말랑이 데스크탑 브릿지에 연결할 수 없어. 앱을 완전히 종료하고 다시 실행해 줘.',
    );
  }

  try {
    await bridge.openMallang();
  } catch (error) {
    console.error('[mallang] openMallang failed', error);
    throw new Error('말랑이 창을 여는 데 실패했어. 앱을 재시작해 줘.');
  }

  try {
    await bridge.closeMain();
  } catch (error) {
    console.error('[mallang] closeMain failed', error);
    // 메인 창 닫기 실패는 치명적이지 않으므로 사용자 알림은 생략한다.
  }
}
