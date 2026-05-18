/**
 * 메인/렌더러 사이에서 사용하는 IPC 채널 이름을 한 곳에서 관리한다.
 * preload는 contextBridge로 이 채널만 노출한다.
 */
export const IPC_CHANNELS = {
  WINDOW: {
    OPEN_MAIN: 'window:open-main',
    CLOSE_MAIN: 'window:close-main',
    OPEN_MALLANG: 'window:open-mallang',
    CLOSE_MALLANG: 'window:close-mallang',
    OPEN_MYPAGE: 'window:open-mypage',
    CLOSE_MYPAGE: 'window:close-mypage',
    OPEN_GROUP: 'window:open-group',
    CLOSE_GROUP: 'window:close-group',
    MINIMIZE: 'window:minimize',
    SET_IGNORE_MOUSE: 'window:set-ignore-mouse',
  },
  APP: {
    GET_VERSION: 'app:get-version',
    QUIT: 'app:quit',
  },
} as const;

export type IpcChannel =
  | (typeof IPC_CHANNELS.WINDOW)[keyof typeof IPC_CHANNELS.WINDOW]
  | (typeof IPC_CHANNELS.APP)[keyof typeof IPC_CHANNELS.APP];
