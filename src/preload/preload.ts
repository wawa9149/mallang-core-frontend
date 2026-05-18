import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type NotificationShowPayload,
  type SchedulerConfigPayload,
  type SchedulerIntentFiredPayload,
} from '../shared/ipc/channels';

const mallangBridge = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT),
  },
  window: {
    openMain: (route?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_MAIN, route),
    closeMain: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE_MAIN),
    openMallang: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_MALLANG),
    closeMallang: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE_MALLANG),
    openMyPage: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_MYPAGE),
    closeMyPage: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE_MYPAGE),
    openGroup: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_GROUP),
    closeGroup: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE_GROUP),
    openLunchVote: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_LUNCH_VOTE),
    closeLunchVote: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE_LUNCH_VOTE),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MINIMIZE),
    setIgnoreMouse: (ignore: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW.SET_IGNORE_MOUSE, ignore),
  },
  scheduler: {
    syncConfig: (config: SchedulerConfigPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.SYNC_CONFIG, config),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.CLEAR),
    /** 메인 → 렌더러 intent 발화 신호 구독. 반환된 함수를 호출하면 구독 해제된다. */
    onIntentFired: (
      handler: (payload: SchedulerIntentFiredPayload) => void,
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: SchedulerIntentFiredPayload,
      ) => handler(payload);
      ipcRenderer.on(IPC_CHANNELS.SCHEDULER.INTENT_FIRED, listener);
      return () => {
        ipcRenderer.removeListener(
          IPC_CHANNELS.SCHEDULER.INTENT_FIRED,
          listener,
        );
      };
    },
  },
  notification: {
    show: (payload: NotificationShowPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION.SHOW, payload),
  },
} as const;

export type MallangBridge = typeof mallangBridge;

contextBridge.exposeInMainWorld('mallang', mallangBridge);
