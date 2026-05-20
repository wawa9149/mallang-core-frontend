import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type NotificationShowPayload,
  type ProfileUpdatedPayload,
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
  shell: {
    /**
     * 임의의 외부 URL 을 시스템 기본 브라우저로 연다.
     * 메인에서 http/https 만 허용하도록 한 번 더 검증한다.
     */
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, url),
  },
  profile: {
    /** 마이페이지에서 저장 직후 호출. 메인이 다른 BrowserWindow 들에 변경을 전파해 준다. */
    broadcastUpdated: (payload: ProfileUpdatedPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILE.BROADCAST_UPDATED, payload),
    /**
     * 다른 창에서 프로필이 변경됐다는 신호를 받아 자기 store 를 동기화하기 위한 구독.
     * 반환 함수를 호출하면 구독 해제된다.
     */
    onUpdated: (handler: (payload: ProfileUpdatedPayload) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: ProfileUpdatedPayload,
      ) => handler(payload);
      ipcRenderer.on(IPC_CHANNELS.PROFILE.UPDATED, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PROFILE.UPDATED, listener);
      };
    },
  },
} as const;

export type MallangBridge = typeof mallangBridge;

contextBridge.exposeInMainWorld('mallang', mallangBridge);
