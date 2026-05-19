import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
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
  groupWindow.setAlwaysOnTop(true, 'floating');
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

  groupWindow.on('closed', () => {
    groupWindow = null;
    unregisterPanel(SLOT_ID);
  });

  return groupWindow;
}
