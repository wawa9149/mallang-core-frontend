import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import {
  IPC_CHANNELS,
  type NotificationShowPayload,
  type SchedulerConfigPayload,
} from '../../shared/ipc/channels';
import {
  clearSchedulerConfig,
  getSchedulerBannerEnabled,
  setSchedulerConfig,
} from '../scheduler/intent-scheduler';
import { createGroupWindow, getGroupWindow } from '../windows/group-window';
import {
  createLunchVoteWindow,
  getLunchVoteWindow,
} from '../windows/lunch-vote-window';
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

  ipcMain.handle(IPC_CHANNELS.WINDOW.OPEN_LUNCH_VOTE, () => {
    createLunchVoteWindow();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE_LUNCH_VOTE, () => {
    getLunchVoteWindow()?.close();
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

  ipcMain.handle(
    IPC_CHANNELS.SCHEDULER.SYNC_CONFIG,
    (_event, config: SchedulerConfigPayload) => {
      setSchedulerConfig(config);
    },
  );

  ipcMain.handle(IPC_CHANNELS.SCHEDULER.CLEAR, () => {
    clearSchedulerConfig();
  });

  ipcMain.handle(
    IPC_CHANNELS.NOTIFICATION.SHOW,
    (_event, payload: NotificationShowPayload) => {
      if (!Notification.isSupported()) return;
      // 사용자가 토글로 끈 상태면 OS 알림은 띄우지 않는다. 말풍선은 별도로 렌더러가 띄움.
      if (!getSchedulerBannerEnabled()) return;
      const notification = new Notification({
        title: payload.title,
        body: payload.body,
        silent: false,
      });
      if (payload.focusMallang !== false) {
        notification.on('click', () => {
          const mallang = getMallangWindow();
          if (mallang && !mallang.isDestroyed()) {
            if (mallang.isMinimized()) mallang.restore();
            mallang.show();
            mallang.focus();
          }
        });
      }
      notification.show();
    },
  );
}
