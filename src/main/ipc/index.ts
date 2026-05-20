import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron';
import {
  IPC_CHANNELS,
  type NotificationShowPayload,
  type ProfileUpdatedPayload,
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
    IPC_CHANNELS.PROFILE.BROADCAST_UPDATED,
    (event, payload: ProfileUpdatedPayload) => {
      // 같은 사용자의 zustand store 가 BrowserWindow 마다 독립이라,
      // 한쪽 창에서 setProfile 해도 다른 창은 갱신되지 않는다.
      // 보낸 창은 이미 자기 store 를 갱신했을 테니 본인은 제외하고 나머지 창에만 전파한다.
      const senderId = event.sender.id;
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed()) continue;
        if (win.webContents.id === senderId) continue;
        win.webContents.send(IPC_CHANNELS.PROFILE.UPDATED, payload);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SHELL.OPEN_EXTERNAL,
    async (_event, url: string) => {
      // 렌더러에서 임의의 스킴(file:, javascript: 등)이 넘어오면 위험하므로,
      // http/https 만 허용해서 OS 기본 브라우저로 넘긴다.
      if (typeof url !== 'string') return;
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      await shell.openExternal(parsed.toString());
    },
  );

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
