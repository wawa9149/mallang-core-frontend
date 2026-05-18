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
    OPEN_LUNCH_VOTE: 'window:open-lunch-vote',
    CLOSE_LUNCH_VOTE: 'window:close-lunch-vote',
    MINIMIZE: 'window:minimize',
    SET_IGNORE_MOUSE: 'window:set-ignore-mouse',
  },
  APP: {
    GET_VERSION: 'app:get-version',
    QUIT: 'app:quit',
  },
  SCHEDULER: {
    /** 렌더러 → 메인: 사용자 시간 설정/토글 등을 동기화한다. */
    SYNC_CONFIG: 'scheduler:sync-config',
    /** 렌더러 → 메인: 스케줄러를 완전히 중단한다(로그아웃 등). */
    CLEAR: 'scheduler:clear',
    /** 메인 → 렌더러: 지정 시각이 도래해 intent 발화를 요청한다. */
    INTENT_FIRED: 'scheduler:intent-fired',
  },
  NOTIFICATION: {
    /** 렌더러 → 메인: OS 배너 알림 표시 요청. */
    SHOW: 'notification:show',
  },
} as const;

export type ScheduledIntent =
  | 'morning_check'
  | 'lunch_alert'
  | 'lunch_review'
  | 'evening_check';

export interface SchedulerConfigPayload {
  /** 'HH:MM' (KST). 없으면 morning_check 비활성. */
  workStartTime: string | null;
  /** 'HH:MM' (KST). lunch_alert는 이 시각 10분 전, lunch_review는 30분 후. */
  lunchTime: string | null;
  /** 'HH:MM' (KST). evening_check 트리거. */
  workEndTime: string | null;
  /** 데스크탑 배너 알림 사용 여부. false면 메인 → 렌더러 신호는 보내되 OS 알림은 띄우지 않는다. */
  bannerEnabled: boolean;
}

export interface SchedulerIntentFiredPayload {
  intent: ScheduledIntent;
  /** 트리거 기준 시각(ISO). 디버깅/표시용. */
  firedAt: string;
}

export interface NotificationShowPayload {
  title: string;
  body: string;
  /** 알림 클릭 시 말랑이 창을 포커스할지 여부. 기본 true. */
  focusMallang?: boolean;
}

export type IpcChannel =
  | (typeof IPC_CHANNELS.WINDOW)[keyof typeof IPC_CHANNELS.WINDOW]
  | (typeof IPC_CHANNELS.APP)[keyof typeof IPC_CHANNELS.APP]
  | (typeof IPC_CHANNELS.SCHEDULER)[keyof typeof IPC_CHANNELS.SCHEDULER]
  | (typeof IPC_CHANNELS.NOTIFICATION)[keyof typeof IPC_CHANNELS.NOTIFICATION];
