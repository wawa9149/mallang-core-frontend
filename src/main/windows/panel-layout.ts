import { screen } from 'electron';
import { getMallangWindow } from './mallang-window';

/**
 * 말랑이 창 양옆에 붙는 사이드 패널(마이페이지/그룹/점심 투표 등)의 자리잡기 매니저.
 *
 * 규칙:
 *  - 각 패널은 자기 side와 rank를 들고 등록한다. 같은 side에서 rank가 작을수록 말랑이 창에 가깝다.
 *  - 등록/해제가 일어날 때마다 등록된 모든 패널의 위치를 재계산해 같은 줄에 정렬한다.
 *  - 좌/우 합쳐 화면을 벗어나면 말랑이 창 자체를 가능한 범위에서 평행 이동시켜 자리를 만든다.
 *  - 마지막 패널이 빠지면 말랑이 창은 등록 직전 위치로 복귀한다.
 */
export interface PanelSlotConfig {
  /** 고유 식별자. 보통 패널 종류 ('mypage' | 'group' | 'lunch-vote'). */
  id: string;
  /** 말랑이 창 기준 어느 쪽에 붙는 패널인지. */
  side: 'left' | 'right';
  /** 패널 창의 폭. */
  width: number;
  /** 패널 창의 높이. y 좌표 계산에 쓰인다. */
  height: number;
  /** 옆 패널과의 간격. */
  gap: number;
  /** 같은 side에서 말랑이 창에 가까운 정도. 낮을수록 가깝다. */
  rank: number;
  /**
   * 자기 위치를 다시 잡아야 할 때 호출된다.
   * 패널 모듈이 BrowserWindow.setBounds를 호출해 반영한다.
   */
  onReposition(origin: { x: number; y: number }): void;
}

const slots = new Map<string, PanelSlotConfig>();
let savedMallangBounds: Electron.Rectangle | null = null;

function sortedBySide(side: 'left' | 'right'): PanelSlotConfig[] {
  return Array.from(slots.values())
    .filter((s) => s.side === side)
    .sort((a, b) => a.rank - b.rank);
}

function sumSide(side: 'left' | 'right'): number {
  return sortedBySide(side).reduce((sum, s) => sum + s.width + s.gap, 0);
}

function applyLayout(): void {
  const mallang = getMallangWindow();
  if (!mallang || mallang.isDestroyed()) return;

  if (slots.size === 0) {
    if (savedMallangBounds) {
      mallang.setBounds(savedMallangBounds);
      savedMallangBounds = null;
    }
    return;
  }

  // 첫 패널이 등록되는 순간의 말랑이 위치를 기준점으로 보관.
  // 이후 추가/제거가 일어나더라도 이 기준 위치를 토대로 다시 계산한다.
  if (!savedMallangBounds) {
    savedMallangBounds = { ...mallang.getBounds() };
  }
  const base = savedMallangBounds;
  const { workArea } = screen.getPrimaryDisplay();

  const leftNeed = sumSide('left');
  const rightNeed = sumSide('right');

  let x = base.x;
  // 좌측이 화면 밖을 벗어나면 말랑이를 우측으로 가능한 만큼 이동시켜 좌측 공간을 확보한다.
  const leftMost = base.x - leftNeed;
  if (leftMost < workArea.x) {
    const shift = workArea.x - leftMost;
    const maxX = workArea.x + workArea.width - base.width;
    x = Math.min(base.x + shift, maxX);
  }
  // 우측이 화면 밖이면 좌측으로 다시 당긴다(우선순위 더 높게, 좌측이 다시 잘릴 수 있어도 어쩔 수 없다).
  const rightMost = x + base.width + rightNeed;
  if (rightMost > workArea.x + workArea.width) {
    const shift = rightMost - (workArea.x + workArea.width);
    x = Math.max(x - shift, workArea.x);
  }

  mallang.setBounds({ ...base, x });
  const mallangBounds = mallang.getBounds();

  for (const side of ['left', 'right'] as const) {
    const lined = sortedBySide(side);
    let cursor = 0; // 누적된 같은 side 패널들의 width + gap 합.
    for (const slot of lined) {
      const y = mallangBounds.y + mallangBounds.height - slot.height;
      if (side === 'left') {
        const slotX = mallangBounds.x - cursor - slot.gap - slot.width;
        slot.onReposition({ x: slotX, y });
      } else {
        const slotX = mallangBounds.x + mallangBounds.width + cursor + slot.gap;
        slot.onReposition({ x: slotX, y });
      }
      cursor += slot.width + slot.gap;
    }
  }
}

/**
 * 패널을 등록(또는 갱신)한다. 같은 id가 이미 있으면 덮어쓴 뒤 레이아웃을 다시 계산한다.
 */
export function registerPanel(slot: PanelSlotConfig): void {
  slots.set(slot.id, slot);
  applyLayout();
}

/**
 * 패널 등록을 해제한다. 마지막 패널이 빠지면 말랑이 창은 원위치로 복귀한다.
 */
export function unregisterPanel(id: string): void {
  if (!slots.delete(id)) return;
  applyLayout();
}

/**
 * 외부에서 강제로 재계산을 트리거하고 싶을 때 사용한다 (말랑이 창이 사용자에 의해 옮겨졌을 때 등).
 */
export function reapplyPanelLayout(): void {
  applyLayout();
}

/**
 * 말랑이 창이 닫히는 등 상태가 완전히 리셋되는 시점에 호출한다.
 */
export function resetPanelLayout(): void {
  slots.clear();
  savedMallangBounds = null;
}
