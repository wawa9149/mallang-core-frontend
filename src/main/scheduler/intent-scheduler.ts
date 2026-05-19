import { powerMonitor } from 'electron';
import {
  IPC_CHANNELS,
  type ScheduledIntent,
  type SchedulerConfigPayload,
  type SchedulerIntentFiredPayload,
} from '../../shared/ipc/channels';
import { createLunchVoteWindow } from '../windows/lunch-vote-window';
import { getMallangWindow } from '../windows/mallang-window';

/**
 * 사용자의 출근/점심/퇴근 스케줄을 매분 점검하면서 정해진 시점에 말랑이가 자동 발화하도록 신호를 보낸다.
 *
 * 정책:
 *  - morning_check : workStartTime 정시
 *  - lunch_alert   : lunchTime - 10분
 *  - lunch_review  : lunchTime + 30분
 *  - evening_check : workEndTime 정시
 *
 * 신호는 렌더러(말랑이 창)로 전달되고, 실제 LLM 호출과 응답 표시는 렌더러가 담당한다.
 * 메인 프로세스는 OS 배너 알림 표시도 별도 IPC(NOTIFICATION.SHOW)를 통해 처리한다.
 */

const TICK_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let config: SchedulerConfigPayload | null = null;
let firedToday = new Map<ScheduledIntent, string>(); // intent → 'YYYY-MM-DD'
let lastResetDate: string | null = null;

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseHM(value: string | null): { h: number; m: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function addMinutes(
  value: { h: number; m: number },
  delta: number,
): { h: number; m: number } {
  const total = value.h * 60 + value.m + delta;
  // 자정을 넘기는 케이스는 보정 없이 클램프(점심/퇴근에 한해 일반적인 시간대 가정).
  const safe = ((total % 1440) + 1440) % 1440;
  return { h: Math.floor(safe / 60), m: safe % 60 };
}

function computeTriggers(): {
  intent: ScheduledIntent;
  at: { h: number; m: number };
}[] {
  if (!config) return [];
  const triggers: { intent: ScheduledIntent; at: { h: number; m: number } }[] =
    [];

  const work = parseHM(config.workStartTime);
  if (work) triggers.push({ intent: 'morning_check', at: work });

  const lunch = parseHM(config.lunchTime);
  if (lunch) {
    triggers.push({ intent: 'lunch_alert', at: addMinutes(lunch, -10) });
    triggers.push({ intent: 'lunch_review', at: addMinutes(lunch, 30) });
  }

  const endWork = parseHM(config.workEndTime);
  if (endWork) triggers.push({ intent: 'evening_check', at: endWork });

  return triggers;
}

function fireIntent(intent: ScheduledIntent): void {
  const mallang = getMallangWindow();
  // 말랑이 창이 닫혀 있으면(=로그아웃/메인 종료 직전) 어떤 후속 액션도 의미가 없다.
  if (!mallang || mallang.isDestroyed()) return;

  const payload: SchedulerIntentFiredPayload = {
    intent,
    firedAt: new Date().toISOString(),
  };
  mallang.webContents.send(IPC_CHANNELS.SCHEDULER.INTENT_FIRED, payload);

  // 점심 10분 전(lunch_alert)에는 별도 점심 투표 창을 자동으로 띄워 준다.
  // 사용자가 따로 창을 안 열어 둬도 투표/결과를 곧장 볼 수 있게 하기 위함.
  if (intent === 'lunch_alert') {
    try {
      createLunchVoteWindow();
    } catch {
      // 창 생성 실패는 대화 신호 송신과 분리해 조용히 무시.
    }
  }
}

function tick(): void {
  if (!config) return;

  const key = todayKey();
  if (lastResetDate !== key) {
    // 자정이 지나면 이전 일의 발사 기록을 초기화.
    firedToday = new Map();
    lastResetDate = key;
  }

  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();

  const triggers = computeTriggers();
  for (const t of triggers) {
    if (firedToday.get(t.intent) === key) continue;
    // 분 단위 일치. 또는 직전 1분 사이에 도래했지만 wake/restart로 놓친 경우 보정.
    const matched = t.at.h === nowH && t.at.m === nowM;
    if (!matched) continue;
    firedToday.set(t.intent, key);
    fireIntent(t.intent);
  }
}

function resumeCatchUp(): void {
  if (!config) return;
  // 슬립 등에서 깨어났을 때, 오늘 도래했지만 아직 발사 안 된 intent를 한 번에 채워준다.
  const key = todayKey();
  if (lastResetDate !== key) {
    firedToday = new Map();
    lastResetDate = key;
  }
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const t of computeTriggers()) {
    if (firedToday.get(t.intent) === key) continue;
    const scheduled = t.at.h * 60 + t.at.m;
    if (scheduled <= nowMinutes) {
      firedToday.set(t.intent, key);
      fireIntent(t.intent);
    }
  }
}

export function startIntentScheduler(): void {
  if (timer) return;
  lastResetDate = todayKey();
  timer = setInterval(tick, TICK_INTERVAL_MS);
  powerMonitor.on('resume', resumeCatchUp);
}

export function stopIntentScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  powerMonitor.removeListener('resume', resumeCatchUp);
  config = null;
  firedToday = new Map();
  lastResetDate = null;
}

export function setSchedulerConfig(next: SchedulerConfigPayload): void {
  // 이전 config의 시간 필드와 비교해, 시간이 바뀐 intent만 "오늘 이미 발사함" 기록에서 제거한다.
  // 사용자가 시간을 명시적으로 변경했다는 건 그 intent의 흐름(예: 점심 알림 → 투표 창)을
  // 다시 한 번 타고 싶다는 의도로 본다. 시간이 그대로면 기록을 유지해 중복 알림을 막는다.
  const prev = config;
  const clearable: ScheduledIntent[] = [];
  if (prev) {
    if (prev.workStartTime !== next.workStartTime)
      clearable.push('morning_check');
    if (prev.lunchTime !== next.lunchTime) {
      clearable.push('lunch_alert', 'lunch_review');
    }
    if (prev.workEndTime !== next.workEndTime) clearable.push('evening_check');
  }
  for (const intent of clearable) firedToday.delete(intent);

  config = next;
  // 시간 설정이 바뀌면 이미 도래한 intent를 즉시 채우고, 미래 시간이면 tick이 자연스럽게 잡는다.
  resumeCatchUp();
}

export function clearSchedulerConfig(): void {
  config = null;
  firedToday = new Map();
}

export function getSchedulerBannerEnabled(): boolean {
  return Boolean(config?.bannerEnabled);
}
