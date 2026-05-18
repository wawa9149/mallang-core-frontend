import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './ipc';
import { createMainWindow } from './windows/main-window';

if (started) {
  app.quit();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  // 캐릭터 창은 로그인/회원가입이 완료된 뒤 렌더러에서 IPC로 요청해 띄운다.
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
