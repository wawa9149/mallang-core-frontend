import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';
import { getMallangWindow } from './mallang-window';

let myPageWindow: BrowserWindow | null = null;

export function getMyPageWindow() {
  return myPageWindow;
}

const WIDTH = 320;
const HEIGHT = 520;
const GAP = 12;

/**
 * 말랑이 창 왼쪽에 붙어서 뜨는 마이페이지 패널.
 * 말랑이 창과 함께 항상 같은 시각적 묶음으로 보이도록 onTop을 공유한다.
 */
export function createMyPageWindow() {
  if (myPageWindow && !myPageWindow.isDestroyed()) {
    myPageWindow.focus();
    return myPageWindow;
  }

  const mallang = getMallangWindow();
  const mallangBounds = mallang?.getBounds();
  const x = mallangBounds ? mallangBounds.x - WIDTH - GAP : undefined;
  const y = mallangBounds
    ? mallangBounds.y + mallangBounds.height - HEIGHT
    : undefined;

  myPageWindow = new BrowserWindow({
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

  myPageWindow.setAlwaysOnTop(true, 'screen-saver');
  myPageWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  loadRenderer(myPageWindow, '/mypage');

  myPageWindow.on('closed', () => {
    myPageWindow = null;
  });

  return myPageWindow;
}
