import path from 'node:path';
import { BrowserWindow } from 'electron';
import { loadRenderer } from './load-renderer';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow() {
  return mainWindow;
}

export function createMainWindow(initialRoute = '/') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 880,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FAFAFC',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  loadRenderer(mainWindow, initialRoute);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}
