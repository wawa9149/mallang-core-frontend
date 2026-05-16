import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc/channels';

const mallangBridge = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT),
  },
  window: {
    openMain: (route?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_MAIN, route),
    closeMallang: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE_MALLANG),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MINIMIZE),
    setIgnoreMouse: (ignore: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW.SET_IGNORE_MOUSE, ignore),
  },
} as const;

export type MallangBridge = typeof mallangBridge;

contextBridge.exposeInMainWorld('mallang', mallangBridge);
