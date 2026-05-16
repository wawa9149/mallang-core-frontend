import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './ipc';
import { createMallangWindow } from './windows/mallang-window';
import { createMainWindow } from './windows/main-window';

if (started) {
  app.quit();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMallangWindow();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMallangWindow();
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
