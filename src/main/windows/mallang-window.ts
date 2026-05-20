import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import { getGroupWindow } from './group-window';
import { loadRenderer } from './load-renderer';
import { getLunchVoteWindow } from './lunch-vote-window';
import { getMyPageWindow } from './mypage-window';
import { resetPanelLayout } from './panel-layout';

let mallangWindow: BrowserWindow | null = null;

export function getMallangWindow() {
  return mallangWindow;
}

/**
 * 말랑이 창에 붙어 있던 보조 패널들을 일괄 정리한다.
 * - 메인 창(로그인/대기 창)은 그대로 둔다.
 * - 말랑이 창이 사라지면 단독으로 떠 있는 마이페이지/그룹/점심 투표 창은
 *   맥락을 잃어버리기 때문에 함께 닫아 준다.
 */
function closeAttachedPanels() {
  for (const win of [
    getMyPageWindow(),
    getGroupWindow(),
    getLunchVoteWindow(),
  ]) {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }
}

export function createMallangWindow() {
  if (mallangWindow && !mallangWindow.isDestroyed()) {
    mallangWindow.focus();
    return mallangWindow;
  }

  const { workArea } = screen.getPrimaryDisplay();
  const width = 380;
  const height = 460;

  mallangWindow = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + workArea.height - height - 24,
    frame: false,
    transparent: false,
    backgroundColor: '#FAFAFC',
    hasShadow: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    // 메인 앱 창 역할이라 작업표시줄/Dock 인디케이터에 노출해 둔다.
    // (메인 로그인 창이 닫힌 뒤에도 사용자가 앱이 실행 중임을 시각적으로 확인할 수 있게 한다.)
    skipTaskbar: false,
    // 말랑이 창은 다른 앱 창들 뒤에 자연스럽게 깔려야 한다. always-on-top 으로 띄우면
    // 마이페이지/그룹/점심 투표 같은 보조 창은 물론, 다른 외부 앱 창까지 가려 버리기 때문에
    // 일반 z-order 윈도우로 두고 사용자가 클릭할 때만 위로 올라오게 한다.
    alwaysOnTop: false,
    focusable: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Chrome 기본 autoplay 정책은 user gesture 가 없으면 HTMLAudioElement.play() 를
      // NotAllowedError 로 막아 버린다. 말랑이 자동 인사처럼 사용자 클릭 없이 발화하는
      // 케이스에서 TTS 가 silent 로 끊기는 원인이 되므로 명시적으로 풀어 둔다.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  // 가상 데스크탑(스페이스)을 이동해도 같은 위치에 보이도록 한다.
  // 전체화면 앱 위에 강제로 올라오지는 않게 visibleOnFullScreen 은 끈다.
  mallangWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: false,
  });

  loadRenderer(mallangWindow, '/mallang');

  // 새 창(마이페이지/그룹/점심 투표 등)이 열렸을 때 말랑이 창이 그 위에 떠 있는 인상을 주지
  // 않도록, 윈도우가 처음 표시되는 시점에 한 번 뒤로 보낸다. 이후 사용자 클릭으로 자연스럽게
  // 위로 올라오는 동작은 그대로 둔다.
  mallangWindow.once('ready-to-show', () => {
    if (!mallangWindow || mallangWindow.isDestroyed()) return;
    const others = BrowserWindow.getAllWindows().filter(
      (win) =>
        win.id !== mallangWindow!.id && !win.isDestroyed() && win.isVisible(),
    );
    if (others.length > 0) {
      // 다른 창이 이미 떠 있으면 그 창에 포커스를 양도해 말랑이가 z-order 아래로 가도록 한다.
      others[others.length - 1].focus();
    }
  });

  mallangWindow.on('closed', () => {
    mallangWindow = null;
    // 같은 세션에 패널 등록 정보가 남아 있으면 다음 말랑이 창이 떴을 때
    // 어색한 배치가 일어나므로 함께 정리한다.
    resetPanelLayout();
    // 말랑이 창이 사라지면 부속 패널만 단독으로 떠 있는 상태가 어색하므로
    // 마이페이지/그룹/점심 투표 창도 함께 닫는다. (메인 창은 유지)
    closeAttachedPanels();
  });

  return mallangWindow;
}
