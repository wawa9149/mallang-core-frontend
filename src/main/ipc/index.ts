import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import { createGroupWindow, getGroupWindow } from '../windows/group-window';
import { createMainWindow, getMainWindow } from '../windows/main-window';
import {
  createMallangWindow,
  getMallangWindow,
} from '../windows/mallang-window';
import { createMyPageWindow, getMyPageWindow } from '../windows/mypage-window';

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => app.getVersion());

  ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => {
    app.quit();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.OPEN_MAIN, (_event, route?: string) => {
    createMainWindow(route);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE_MAIN, () => {
    getMainWindow()?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.OPEN_MALLANG, () => {
    createMallangWindow();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE_MALLANG, () => {
    getMallangWindow()?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.OPEN_MYPAGE, () => {
    createMyPageWindow();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE_MYPAGE, () => {
    getMyPageWindow()?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.OPEN_GROUP, () => {
    createGroupWindow();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE_GROUP, () => {
    getGroupWindow()?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle(
    IPC_CHANNELS.WINDOW.SET_IGNORE_MOUSE,
    (event, ignore: boolean) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.setIgnoreMouseEvents(ignore, { forward: true });
    },
  );
}
