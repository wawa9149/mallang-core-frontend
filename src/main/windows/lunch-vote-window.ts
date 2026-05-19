import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
import { registerPanel, unregisterPanel } from './panel-layout';

let lunchVoteWindow: BrowserWindow | null = null;

export function getLunchVoteWindow() {
  return lunchVoteWindow;
}

const WIDTH = 420;
const HEIGHT = 540;
const GAP = 12;
// 같은 좌측 슬롯에서 마이페이지(rank 0)보다 한 칸 바깥(말랑이에서 더 멀리)에 자리한다.
// 마이페이지가 함께 떠 있으면 자동으로 마이페이지의 왼쪽으로 밀린다.
const RANK = 10;
const SLOT_ID = 'lunch-vote';

/**
 * 점심 투표 별창. 평소엔 말랑이 창 바로 왼쪽에 붙고, 마이페이지가 함께 열려 있으면
 * panel-layout이 자동으로 마이페이지의 왼쪽으로 한 칸 더 밀어준다.
 */
export function createLunchVoteWindow() {
  if (lunchVoteWindow && !lunchVoteWindow.isDestroyed()) {
    lunchVoteWindow.focus();
    return lunchVoteWindow;
  }

  lunchVoteWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
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

  // 다른 앱에 가려지지 않도록 위에 띄우되, 'floating' 레벨을 사용해
  // macOS Spaces 전환 시 부속 패널이 다른 데스크탑까지 따라가지 않도록 한다.
  lunchVoteWindow.setAlwaysOnTop(true, 'floating');
  // 풀스크린 앱이나 다른 Space로 이동할 때 따라오지 않게 한다.
  lunchVoteWindow.setVisibleOnAllWorkspaces(false);

  loadRenderer(lunchVoteWindow, '/lunch/vote');

  registerPanel({
    id: SLOT_ID,
    side: 'left',
    width: WIDTH,
    height: HEIGHT,
    gap: GAP,
    rank: RANK,
    onReposition: ({ x, y }) => {
      if (!lunchVoteWindow || lunchVoteWindow.isDestroyed()) return;
      lunchVoteWindow.setBounds({ x, y, width: WIDTH, height: HEIGHT });
    },
  });

  lunchVoteWindow.on('closed', () => {
    lunchVoteWindow = null;
    unregisterPanel(SLOT_ID);
  });

  return lunchVoteWindow;
}
