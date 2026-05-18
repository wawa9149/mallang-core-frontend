import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
import { getMallangWindow } from './mallang-window';

let groupWindow: BrowserWindow | null = null;

export function getGroupWindow() {
  return groupWindow;
}

const WIDTH = 380;
const HEIGHT = 520;
const GAP = 12;

/**
 * 말랑이 창 오른쪽에 붙는 그룹(팀 말랑이) 패널.
 * 아직 기능 명세가 굳지 않아 더미 placeholder만 렌더링한다.
 */
export function createGroupWindow() {
  if (groupWindow && !groupWindow.isDestroyed()) {
    groupWindow.focus();
    return groupWindow;
  }

  const mallang = getMallangWindow();
  const mallangBounds = mallang?.getBounds();
  const x = mallangBounds
    ? mallangBounds.x + mallangBounds.width + GAP
    : undefined;
  const y = mallangBounds
    ? mallangBounds.y + mallangBounds.height - HEIGHT
    : undefined;

  groupWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x,
    y,
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

  groupWindow.setAlwaysOnTop(true, 'screen-saver');
  groupWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  loadRenderer(groupWindow, '/group');

  groupWindow.on('closed', () => {
    groupWindow = null;
  });

  return groupWindow;
}
