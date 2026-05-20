import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
import { raiseMallangBundle } from './mallang-window';
import { registerPanel, unregisterPanel } from './panel-layout';

let groupWindow: BrowserWindow | null = null;

export function getGroupWindow() {
  return groupWindow;
}

const WIDTH = 380;
const HEIGHT = 520;
const GAP = 12;
const RANK = 0;
const SLOT_ID = 'group';

/**
 * 말랑이 창 오른쪽에 붙는 그룹(팀 말랑이) 패널.
 */
export function createGroupWindow() {
  if (groupWindow && !groupWindow.isDestroyed()) {
    groupWindow.focus();
    return groupWindow;
  }

  groupWindow = new BrowserWindow({
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
    // 말랑이 본체와 동일한 z-order 정책을 따른다 (mypage-window.ts 의 설명 참고).
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
  groupWindow.setVisibleOnAllWorkspaces(false);

  loadRenderer(groupWindow, '/group');

  registerPanel({
    id: SLOT_ID,
    side: 'right',
    width: WIDTH,
    height: HEIGHT,
    gap: GAP,
    rank: RANK,
    onReposition: ({ x, y }) => {
      if (!groupWindow || groupWindow.isDestroyed()) return;
      groupWindow.setBounds({ x, y, width: WIDTH, height: HEIGHT });
    },
  });

  // 패널이 포커스를 받으면 말랑이 본체와 다른 활성 패널까지 함께 위로 끌어올린다 (한 묶음).
  groupWindow.on('focus', () => {
    raiseMallangBundle();
  });

  groupWindow.on('closed', () => {
    groupWindow = null;
    unregisterPanel(SLOT_ID);
  });

  return groupWindow;
}
