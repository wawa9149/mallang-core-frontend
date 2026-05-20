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

/**
 * 도래 시점에서 이만큼 분 이내에 catchup 이 일어났을 때만 즉시 발사한다.
 * 예: 5 분이면 11:55 ~ 12:00 사이 도래한 알림은 12:00 에 catchup 으로 fire 되지만,
 *     11:30 에 도래했던 알림은 "이미 한참 지난 알림" 이라 fire 하지 않는다.
 * 슬립에서 깨어났거나 사용자가 시간 설정을 바꿨을 때 어색한 과거 알림 폭주를 막는다.
 */
const CATCHUP_GRACE_MINUTES = 5;

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
  const teamLunchVote = parseHM(config.teamLunchVoteTime) ?? lunch;
  if (teamLunchVote) {
    // 점심 투표는 "팀 단위" 의사결정이므로 팀원 중 가장 빠른 점심 시간 10분 전에 모두에게 띄운다.
    triggers.push({
      intent: 'lunch_alert',
      at: addMinutes(teamLunchVote, -10),
    });
  }
  if (lunch) {
    // 점심 후 회고/리뷰는 개인이 실제 점심을 먹은 뒤가 자연스러우므로 본인 lunchTime 기준을 유지한다.
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
  // 슬립 등에서 깨어났을 때, 직전 짧은 시간(grace) 안에 도래한 intent만 채워준다.
  // 한참 전에 지나간 알림까지 한 번에 띄우면 사용자에게 어색하므로,
  // grace 를 넘긴 intent 는 "오늘 발사한 것으로 표시" 만 하고 fire 는 생략한다.
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
    const delta = nowMinutes - scheduled;
    if (delta < 0) continue; // 미래 trigger 는 tick 이 정시에 잡는다.
    firedToday.set(t.intent, key);
    if (delta <= CATCHUP_GRACE_MINUTES) {
      fireIntent(t.intent);
    }
  }
}

/**
 * 첫 setSchedulerConfig 호출(=앱 시작 직후) 전용 동작.
 * 오늘 이미 지나간 trigger 들을 모두 "발사 완료" 로 표시만 해서, 이후 tick 이 잡지 않게 한다.
 * 한참 지난 알림이 앱 시작 시 한 번에 쏟아지는 문제를 막는 핵심 처리.
 */
function markPastTriggersAsFired(): void {
  if (!config) return;
  const key = todayKey();
  if (lastResetDate !== key) {
    firedToday = new Map();
    lastResetDate = key;
  }
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const t of computeTriggers()) {
    const scheduled = t.at.h * 60 + t.at.m;
    if (scheduled <= nowMinutes) {
      firedToday.set(t.intent, key);
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
  const prev = config;
  config = next;

  if (!prev) {
    // 첫 적용(=앱 시작 직후 syncSchedulerFromStores 호출). 오늘 이미 지나간 알림은
    // 절대 끌어 올리지 않는다. 미래 trigger 는 tick 이 정시에 잡는다.
    markPastTriggersAsFired();
    return;
  }

  // 이전 config 의 시간 필드와 비교해, 시간이 바뀐 intent 만 "오늘 이미 발사함" 기록에서 제거한다.
  // 사용자가 시간을 변경했다는 건 그 intent 의 흐름(예: 점심 알림 → 투표 창)을 다시 타고 싶다는 의도.
  // 단, 새 시간이 한참 전이면 grace 범위를 벗어나 fire 되지 않고 markPastTriggersAsFired 효과만 받는다.
  const clearable: ScheduledIntent[] = [];
  if (prev.workStartTime !== next.workStartTime)
    clearable.push('morning_check');
  if (prev.lunchTime !== next.lunchTime) {
    clearable.push('lunch_alert', 'lunch_review');
  }
  if (prev.workEndTime !== next.workEndTime) clearable.push('evening_check');
  for (const intent of clearable) firedToday.delete(intent);

  // 직전 grace 안에 도래한 intent 만 즉시 채우고, 미래 시간이면 tick 이 자연스럽게 잡는다.
  resumeCatchUp();
}

export function clearSchedulerConfig(): void {
  config = null;
  firedToday = new Map();
}

export function getSchedulerBannerEnabled(): boolean {
  return Boolean(config?.bannerEnabled);
}
