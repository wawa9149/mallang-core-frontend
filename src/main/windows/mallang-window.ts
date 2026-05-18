import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import { loadRenderer } from './load-renderer';

let mallangWindow: BrowserWindow | null = null;

export function getMallangWindow() {
  return mallangWindow;
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
  });

  return mallangWindow;
}
