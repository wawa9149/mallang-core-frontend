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
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mallangWindow.setAlwaysOnTop(true, 'screen-saver');
  mallangWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  loadRenderer(mallangWindow, '/mallang');

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
