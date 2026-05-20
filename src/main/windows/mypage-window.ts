import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
import { raiseMallangBundle } from './mallang-window';
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
    // 말랑이 본체와 동일한 z-order 정책을 따른다. 패널만 alwaysOnTop 으로 띄우면
    // 본체는 다른 앱에 가려지는데 패널만 위로 떠 있어 "본체보다 패널만 위에 있다"는 어색함이 생기므로,
    // 패널도 일반 z-order 윈도우로 두고 사용자가 클릭할 때만 위로 올라오게 한다.
    alwaysOnTop: false,
    focusable: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 풀스크린 앱이나 다른 Space로 이동할 때 따라오지 않게 한다.
  myPageWindow.setVisibleOnAllWorkspaces(false);

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

  // 패널이 포커스를 받으면 말랑이 본체와 다른 활성 패널까지 함께 위로 끌어올려서
  // 사용자에겐 한 묶음이 같이 움직이는 것처럼 보이게 한다.
  myPageWindow.on('focus', () => {
    raiseMallangBundle();
  });

  myPageWindow.on('closed', () => {
    myPageWindow = null;
    unregisterPanel(SLOT_ID);
  });

  return myPageWindow;
}
