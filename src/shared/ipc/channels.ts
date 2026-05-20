import type { UserProfile } from '../types/domain';

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
  PROFILE: {
    /**
     * 렌더러 → 메인: 사용자 프로필이 갱신됐다. 다른 BrowserWindow 들에게 전파해 달라고 요청.
     * 같은 사용자의 zustand store 가 창마다 독립이라 한쪽에서 setProfile 해도 다른 창은 모른다.
     */
    BROADCAST_UPDATED: 'profile:broadcast-updated',
    /** 메인 → 렌더러: 다른 창에서 프로필이 갱신됐다. 받은 쪽은 자기 store 를 즉시 동기화한다. */
    UPDATED: 'profile:updated',
  },
  SHELL: {
    /**
     * 렌더러 → 메인: 외부 URL 을 시스템 기본 브라우저로 열어 달라고 요청.
     * 보안상 http/https 만 허용한다(메인에서 검증).
     */
    OPEN_EXTERNAL: 'shell:open-external',
  },
  AUTO_LAUNCH: {
    /** 렌더러 → 메인: 현재 자동 실행 등록 상태와 OS 지원 여부를 조회. */
    GET: 'auto-launch:get',
    /** 렌더러 → 메인: 자동 실행 등록 상태를 변경. boolean 인자. */
    SET: 'auto-launch:set',
  },
} as const;

/**
 * 자동 실행(부팅 시 함께 실행) 상태.
 * - enabled: 현재 등록 여부.
 * - supported: 이 환경(OS/배포 형태)에서 토글이 의미가 있는지.
 *   dev 환경에서 실행하거나 Linux 일부 배포판에서는 false 가 된다.
 */
export interface AutoLaunchStatus {
  enabled: boolean;
  supported: boolean;
}

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
  /**
   * 팀 점심 투표 기준 시각. 팀원 lunchTime 중 가장 빠른 시간을 렌더러가 계산해 전달한다.
   * - lunch_alert(점심 투표 시작 알림)는 이 값 기준 10분 전에 발화한다.
   * - lunch_review는 사용자의 실제 lunchTime 기준이어야 하므로 이 값을 쓰지 않는다.
   * null이면 기존처럼 lunchTime으로 폴백한다.
   */
  teamLunchVoteTime: string | null;
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

/**
 * 프로필 전파 payload. 마이페이지에서 저장 직후 보낸 최신 UserProfile 을 그대로 실어 준다.
 * 받는 쪽은 이 값으로 자기 zustand store(useUserProfileStore.profile)를 덮어쓰면 된다.
 */
export type ProfileUpdatedPayload = UserProfile;

export type IpcChannel =
  | (typeof IPC_CHANNELS.WINDOW)[keyof typeof IPC_CHANNELS.WINDOW]
  | (typeof IPC_CHANNELS.APP)[keyof typeof IPC_CHANNELS.APP]
  | (typeof IPC_CHANNELS.SCHEDULER)[keyof typeof IPC_CHANNELS.SCHEDULER]
  | (typeof IPC_CHANNELS.NOTIFICATION)[keyof typeof IPC_CHANNELS.NOTIFICATION]
  | (typeof IPC_CHANNELS.PROFILE)[keyof typeof IPC_CHANNELS.PROFILE]
  | (typeof IPC_CHANNELS.SHELL)[keyof typeof IPC_CHANNELS.SHELL]
  | (typeof IPC_CHANNELS.AUTO_LAUNCH)[keyof typeof IPC_CHANNELS.AUTO_LAUNCH];
