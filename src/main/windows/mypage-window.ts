import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
import { registerPanel, unregisterPanel } from './panel-layout';

let myPageWindow: BrowserWindow | null = null;

export function getMyPageWindow() {
  return myPageWindow;
}

const WIDTH = 480;
const HEIGHT = 560;
const GAP = 12;
// 같은 좌측 슬롯에서 가장 안쪽(말랑이 창에 가장 가까운) 자리 우선권을 가진다.
const RANK = 0;
const SLOT_ID = 'mypage';

/**
 * 말랑이 창 왼쪽에 붙는 마이페이지 패널. panel-layout에 등록해 두면
 * 다른 좌측 패널(점심 투표 등)이 같이 떠 있어도 우선권에 따라 자동 정렬된다.
 */
export function createMyPageWindow() {
  if (myPageWindow && !myPageWindow.isDestroyed()) {
    myPageWindow.focus();
    return myPageWindow;
  }

  myPageWindow = new BrowserWindow({
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

  myPageWindow.setAlwaysOnTop(true, 'screen-saver');
  myPageWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  loadRenderer(myPageWindow, '/mypage');

  // 등록과 동시에 panel-layout이 자기 위치를 잡아 준다.
  registerPanel({
    id: SLOT_ID,
    side: 'left',
    width: WIDTH,
    height: HEIGHT,
    gap: GAP,
    rank: RANK,
    onReposition: ({ x, y }) => {
      if (!myPageWindow || myPageWindow.isDestroyed()) return;
      myPageWindow.setBounds({ x, y, width: WIDTH, height: HEIGHT });
    },
  });

  myPageWindow.on('closed', () => {
    myPageWindow = null;
    unregisterPanel(SLOT_ID);
  });

  return myPageWindow;
}
