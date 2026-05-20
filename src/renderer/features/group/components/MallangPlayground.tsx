import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import type { MallangPersona } from '../../../../shared/types/domain';
import { hobbyToPersona } from '../../../shared/api/mappers';
import type { BackendPublicUser } from '../../../shared/api/types';
import { MallangCharacter } from '../../mallang/components/MallangCharacter';
import playgroundBg from '../../../assets/backgrounds/playground.png';

/**
 * GroupPage의 메인 무대. 팀원 말랑이들이 살짝 통통 뛰면서 무대 안을 랜덤하게 돌아다닌다.
 * 각자 비주기적으로 이모티콘 한 개짜리 말풍선을 띄워서 "뭔가 살아 있다"는 느낌을 준다.
 *
 * 동작 요약:
 *  - 멤버마다 (x%, y%) 좌표를 들고 있다가 일정 시간마다 새 좌표로 부드럽게 이동.
 *  - 이동과는 별도로, 안쪽 div가 y축 ±n px 를 무한 반복하면서 통통 뛰는 효과를 만든다.
 *  - 말풍선은 멤버별로 무작위 간격(4~12초)으로 등장 → 2.4초 노출 후 사라진다.
 *
 * 좌표/타이밍은 모두 멤버 id 를 시드로 흩어서 모든 말랑이가 동시에 같은 동작을 하지 않도록 한다.
 */

/**
 * 무대 본체. 놀이터 일러스트를 배경으로 깔아 캐릭터들이 그 위에서 노는 그림을 만든다.
 * - background-size: cover 로 비율 유지하며 채워서, 무대가 좁아져도 빈 공간이 생기지 않게.
 * - background-position: center bottom 으로 두면 캐릭터들이 가장 많이 머무는 무대 하단이
 *   놀이터 지면 위에 자연스럽게 놓인다.
 * - 배경 위에 얇은 흰색 오버레이(0.18) 를 깔아 캐릭터/닉네임 가독성을 살짝 끌어올린다.
 *   너무 진하게 깔면 일러스트 분위기가 죽으니 절제된 값으로 유지.
 */
const Stage = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 22px;
  background-color: ${({ theme }) => theme.brand.background};
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.18)),
    url(${playgroundBg});
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
`;

/**
 * 캐릭터 한 명을 무대 위 절대 좌표로 띄우는 슬롯. 위치는 percent 기반이라
 * 무대 크기가 바뀌어도 같은 비율로 따라간다. 통통 뛰는 효과는 안쪽 div 가 담당.
 *
 * z-index 는 무대 children(예: LunchWinnerStage 의 식당 카드, z-index 2)보다 위에 오도록
 * 명시적으로 끌어올린다. 그렇지 않으면 같은 stacking context 안에서 children 이 DOM 상
 * 뒤에 그려져 캐릭터를 가려 버린다.
 */
const Slot = styled(motion.div)`
  position: absolute;
  width: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 3;
`;

/**
 * 캐릭터 + 닉네임을 묶어 함께 통통 뛰는 단위.
 * NameTag 가 Hop 바깥에 있으면 캐릭터가 위로 튈 때 간격이 벌어져 "캐릭터 바로 밑" 느낌이 깨지므로
 * 같은 묶음으로 둔다.
 */
const Hop = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

/**
 * Lottie 캐릭터(default/joy/sad/...) 는 SVG 캔버스 안에 캐릭터 외의 투명 여백을 꽤 포함한다.
 * 컨테이너 height 만큼 자리를 차지하지만 시각적인 캐릭터의 하단 끝은 컨테이너 중심보다 약간 아래에서 멈춘다.
 * 그래서 NameTag 를 그대로 두면 캐릭터와 닉네임 사이가 떠 보이므로,
 * 캐릭터 박스 높이에 비례한 음수 마진으로 닉네임을 위로 당겨 시각적 끝에 붙인다.
 *
 * 비율은 Lottie 의 viewBox(512x512) 와 head 레이어 좌표에서 직접 계산했다.
 *  - head pos = (247.5, 268.53), anchor = (100.5, 95.53), path 정수리 = (100.5, 0), 발끝 = (100.5, 191)
 *  - 정수리 viewBox y = 268.53 - 95.53 = 173  (33.8% from top)
 *  - 발끝 viewBox y  = 268.53 + 95.47 = 364  (71.1% from top → 하단 여백 28.9%)
 *
 * 즉 컨테이너 height 의 약 29% 가 캐릭터 발 아래 투명 여백이다.
 */
const CHARACTER_BOTTOM_PADDING_RATIO = 0.22;

/**
 * Lottie 캔버스 안에서 캐릭터 정수리가 위치하는 컨테이너 상단 기준 비율(0~1).
 * 액세서리(모자/꽃 등) 를 머리에 얹을 때 기준점으로 쓴다.
 */
const CHARACTER_HEAD_TOP_RATIO = 0.48;

const NameTag = styled.span<{ $offsetPx: number }>`
  margin-top: ${({ $offsetPx }) => `-${$offsetPx}px`};
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
  background: ${({ theme }) => theme.brand.background};
  padding: 2px 10px;
  border-radius: 999px;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  /* 음수 마진으로 캐릭터 영역과 겹치되, 항상 캐릭터 위로 보이도록 z-index 를 끌어올린다. */
  position: relative;
  z-index: 1;
`;

/**
 * 캐릭터 박스를 감싸는 컨테이너. 액세서리(absolute)를 캐릭터 위에 자유롭게 띄우기 위함.
 * position: relative 만 필요하고, 크기는 자식(MallangCharacter)에 의해 자동 결정된다.
 */
const CharacterFrame = styled.div`
  position: relative;
  display: grid;
  place-items: center;
`;

/**
 * 머리 위 액세서리. 캐릭터의 시각적 정수리에 살짝 걸쳐 얹히도록 절대 좌표로 배치한다.
 *
 * 위치 계산:
 *  - 정수리 = 컨테이너 상단에서 약 33.8% 지점 (CHARACTER_HEAD_TOP_RATIO).
 *  - 액세서리(이모지) 글리프 박스의 시각적 무게중심은 박스 중심 근처라,
 *    glyph 박스 하단이 정수리 위쪽 픽셀에 살짝 닿도록 ($topPx) 에서 계산해 내려준다.
 *  - left: 50%, translate(-50%, -50%) 로 가로 중앙 정렬.
 *  - 살짝 기울여(rotate) 정형화된 느낌을 빼고 캐릭터마다 분위기 변화를 준다.
 */
const Accessory = styled.span<{
  $tiltDeg: number;
  $sizePx: number;
  $topPx: number;
}>`
  position: absolute;
  top: ${({ $topPx }) => $topPx}px;
  left: 50%;
  transform: translate(-50%, -50%) rotate(${({ $tiltDeg }) => $tiltDeg}deg);
  font-size: ${({ $sizePx }) => $sizePx}px;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  z-index: 2;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18));
`;

/**
 * 캐릭터 머리 위 이모지 말풍선의 "위치"만 담당하는 슬롯.
 *
 * 정렬을 motion.div 자체에 transform: translateX(-50%) 로 주면 framer-motion 의
 * initial/animate/exit 가 transform 을 통째로 갱신하면서 좌측 보정이 사라지고
 * 말풍선이 우측으로 치우쳐 보인다. 그래서 위치는 평범한 div 가 잡고,
 * 그 안의 motion.div 는 진입/퇴장 애니메이션만 담당하도록 분리한다.
 */
const EmojiBubbleSlot = styled.div`
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
`;

/**
 * 실제 말풍선 본체. 배경을 무대 배경과 확실히 분리되는 순백으로 두고,
 * 가벼운 보더 + 두 단계 그림자로 무대 위에 살짝 떠 있는 느낌을 준다.
 * 꼬리(::after)도 같은 흰색을 상속받아 자연스럽게 이어진다.
 */
const EmojiBubble = styled(motion.div)`
  min-width: 36px;
  padding: 5px 10px;
  background: #ffffff;
  color: ${({ theme }) => theme.brand.bubbleText};
  font-size: 18px;
  line-height: 1;
  border-radius: 14px;
  white-space: nowrap;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow:
    0 4px 10px rgba(40, 28, 22, 0.12),
    0 1px 3px rgba(40, 28, 22, 0.06);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 7px;
    background: inherit;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
  color: ${({ theme }) => theme.brand.subtitle};
`;

/**
 * 멤버별로 머리 위에 달아 줄 액세서리 이모지 풀.
 * 모자/꽃/리본/별 같은 "머리에 얹기 좋은" 작은 장식만 골랐다.
 * 멤버 id 를 시드로 결정론적으로 뽑기 때문에 같은 사람은 항상 같은 액세서리를 단다.
 */
const ACCESSORY_POOL = [
  '🎀', // 리본
  '🌸', // 벚꽃
  '🌺', // 히비스커스
  '🌷', // 튤립
  '🌹', // 장미
  '🌻', // 해바라기
  '🌼', // 데이지
  '🎩', // 실크햇
  '👑', // 왕관
  '🎓', // 학사모
  '🧢', // 야구모자
  '⭐', // 별
  '✨', // 반짝
  '🌟', // 빛나는 별
  '🍀', // 네잎클로버
  '🦋', // 나비
  '🎈', // 풍선
  '🍓', // 딸기
  '🍒', // 체리
];

/**
 * 텍스트 대신 띄우는 이모티콘 풀. 한 글자(이모지 한 개)만 사용한다.
 * 음식·기분 위주로 골랐고, 너무 부정적이거나 의미가 강한 이모지는 피했다.
 */
const EMOJI_POOL = [
  '😋',
  '🤤',
  '😊',
  '😆',
  '🥰',
  '😴',
  '🤩',
  '🥺',
  '☺️',
  '🥳',
  '😎',
  '🤔',
  '✨',
  '💖',
  '🎉',
  '🍔',
  '🍕',
  '🍜',
  '🍣',
  '🍙',
  '🍱',
  '☕️',
  '🍰',
  '🥟',
  '🍛',
  '🍝',
  '🍳',
  '🌮',
  '🍇',
  '🍎',
  '🍌',
  '🍓',
  '🍒',
  '🍑',
  '🍍',
  '🍐',
  '🍏',
  '🍊',
];

const POSITION_REFRESH_MS = 9000;
const BUBBLE_VISIBLE_MS = 2400;
const BUBBLE_MIN_INTERVAL_MS = 4500;
const BUBBLE_MAX_INTERVAL_MS = 12_000;

/**
 * 두 말랑이가 "겹쳤다" 고 판단할 좌표 거리 임계값(%).
 * 캐릭터 박스 크기 ≈ 100px, 무대 너비 ≈ 340~360px 기준으로 박스가 살짝 안 닿는 정도가 25~28%다.
 * 박스 거리(max(|dx|, |dy|)) 가 임계값보다 작으면 겹친 것으로 보고 다른 위치를 시도한다.
 */
const COLLISION_THRESHOLD_X = 22;
const COLLISION_THRESHOLD_Y = 24;
/** 충돌이 안 나는 좌표를 찾기 위한 최대 재추첨 횟수. 넘어도 안 되면 마지막 후보를 그대로 둔다. */
const MAX_COLLISION_RETRIES = 10;

/**
 * 무대 중앙에 배치하지 말아야 할 영역. 예) 점심 마감 후 식당 카드.
 * 좌표 생성/이동 시 이 영역에 들어가면 가까운 가장자리로 밀어낸다.
 */
export interface KeepOutRect {
  /** 무대 너비 대비 중심 x (%). */
  x: number;
  /** 무대 높이 대비 중심 y (%). */
  y: number;
  /** 가로 반경 (%). 캐릭터 폭 절반 정도까지 더해서 잡는 게 좋다. */
  rx: number;
  /** 세로 반경 (%). */
  ry: number;
}

interface Props {
  members: BackendPublicUser[];
  /** 본인 캐릭터에 살짝 강조를 주고 싶을 때 전달. 없으면 강조 안 함. */
  selfUserId?: string | null;
  /** 가운데 비워둘 영역. 식당 카드처럼 위에 절대 위치로 떠 있는 콘텐츠가 있을 때 사용. */
  keepOut?: KeepOutRect;
  /** 무대 배경/오버레이를 추가로 그릴 수 있게 children 슬롯을 둔다(예: 식당 카드). */
  children?: React.ReactNode;
}

interface SlotState {
  x: number; // percent within stage
  y: number;
}

export function MallangPlayground({
  members,
  selfUserId,
  keepOut,
  children,
}: Props) {
  /**
   * 살아 있는 모든 멤버의 현재 좌표를 한 Map 에 모아 둔다.
   * 자식들이 새 위치를 추첨할 때 이 Map 을 참조해 다른 멤버와 겹치지 않는 좌표를 고른다.
   * Map 의 키는 멤버 id. 자식이 unmount 되거나 멤버 리스트에서 빠지면 해당 키를 정리한다.
   */
  const positionsRef = useRef<Map<string, SlotState>>(new Map());

  // 멤버가 빠진 경우(팀에서 나갔거나 데이터가 갱신된 경우) 살아 있는 id 집합과 동기화해서
  // 오래된 좌표가 충돌 회피에 영향을 주지 않게 정리한다.
  useEffect(() => {
    const liveIds = new Set(members.map((member) => member.id));
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!liveIds.has(id)) positionsRef.current.delete(id);
    }
  }, [members]);

  const registerPosition = useCallback((id: string, position: SlotState) => {
    positionsRef.current.set(id, position);
  }, []);

  const unregisterPosition = useCallback((id: string) => {
    positionsRef.current.delete(id);
  }, []);

  /**
   * 한 멤버가 자기 다음 좌표를 정할 때, 다른 멤버 좌표 목록을 받기 위한 콜백.
   * Map 을 그대로 노출하지 않고 배열로 복사해 넘겨, 자식 코드에서 Map 변형이 일어나지 않도록 한다.
   */
  const getOtherPositions = useCallback((excludeId: string): SlotState[] => {
    const result: SlotState[] = [];
    positionsRef.current.forEach((pos, id) => {
      if (id !== excludeId) result.push(pos);
    });
    return result;
  }, []);

  if (members.length === 0) {
    return (
      <Stage>
        {children}
        <Empty>
          아직 같은 팀원이 없어.
          <br />
          마이페이지에서 팀 이름을 정하면 팀 말랑이들이 여기서 같이 놀아.
        </Empty>
      </Stage>
    );
  }

  return (
    <Stage>
      {members.map((member, index) => (
        <PlaygroundMember
          key={member.id}
          member={member}
          index={index}
          total={members.length}
          isSelf={selfUserId === member.id}
          keepOut={keepOut}
          registerPosition={registerPosition}
          unregisterPosition={unregisterPosition}
          getOtherPositions={getOtherPositions}
        />
      ))}
      {children}
    </Stage>
  );
}

/**
 * 한 명의 말랑이가 무대 위에서 살아 움직이는 단위.
 * 위치 시드는 멤버 id 해시 + index 로 흩어서 첫 화면이 매번 비슷해 보이지 않게 했다.
 */
function PlaygroundMember({
  member,
  index,
  total,
  isSelf,
  keepOut,
  registerPosition,
  unregisterPosition,
  getOtherPositions,
}: {
  member: BackendPublicUser;
  index: number;
  total: number;
  isSelf: boolean;
  keepOut?: KeepOutRect;
  registerPosition: (id: string, position: SlotState) => void;
  unregisterPosition: (id: string) => void;
  getOtherPositions: (excludeId: string) => SlotState[];
}) {
  const persona: MallangPersona = hobbyToPersona(member.hobby);
  const seed = useMemo(() => hashSeed(member.id) + index, [member.id, index]);

  // 첫 위치는 결정론적 그리드 분산을 따른다(그 자체로 충돌이 거의 없음). keepOut 만 적용.
  const [pos, setPos] = useState<SlotState>(() =>
    avoidKeepOut(initialPosition(seed, index, total), keepOut, seed),
  );
  const [emoji, setEmoji] = useState<string | null>(null);
  // 다음 위치/말풍선 타이머 핸들을 ref 로 들고 있다가 unmount/멤버 교체 시 정리한다.
  const positionTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);

  // 좌표가 바뀔 때마다 부모 ref 에 동기화. 다른 멤버가 다음 좌표를 정할 때
  // 우리 최신 좌표를 충돌 후보로 보고 회피한다. unmount 시 정리.
  useEffect(() => {
    registerPosition(member.id, pos);
  }, [member.id, pos, registerPosition]);

  useEffect(() => {
    return () => {
      unregisterPosition(member.id);
    };
  }, [member.id, unregisterPosition]);

  // 위치 드리프트: 일정 시간마다 무대 안의 새 좌표로 이동한다.
  // setInterval 대신 setTimeout 재귀로 묶어 다음 호출 전에 ref 를 갱신해 두는 패턴.
  useEffect(() => {
    const tick = () => {
      const next = pickNonCollidingPosition(seed, keepOut, () =>
        getOtherPositions(member.id),
      );
      setPos(next);
      positionTimerRef.current = window.setTimeout(
        tick,
        POSITION_REFRESH_MS + jitter(seed, 2200),
      );
    };
    positionTimerRef.current = window.setTimeout(
      tick,
      1200 + jitter(seed, 1800),
    );
    return () => {
      if (positionTimerRef.current !== null) {
        window.clearTimeout(positionTimerRef.current);
        positionTimerRef.current = null;
      }
    };
  }, [seed, keepOut, member.id, getOtherPositions]);

  // 이모티콘 말풍선: 무작위 간격으로 등장 → 2.4초 후 자동 소멸.
  useEffect(() => {
    const showOnce = () => {
      setEmoji(pickEmoji(seed + Date.now()));
      bubbleTimerRef.current = window.setTimeout(() => {
        setEmoji(null);
        const wait = randomBetween(
          BUBBLE_MIN_INTERVAL_MS,
          BUBBLE_MAX_INTERVAL_MS,
          seed + Date.now(),
        );
        bubbleTimerRef.current = window.setTimeout(showOnce, wait);
      }, BUBBLE_VISIBLE_MS);
    };
    // 멤버마다 시작 시점을 흩어 첫 화면에서 동시에 뜨는 걸 막는다.
    const startDelay = randomBetween(
      BUBBLE_MIN_INTERVAL_MS / 3,
      BUBBLE_MAX_INTERVAL_MS / 2,
      seed,
    );
    bubbleTimerRef.current = window.setTimeout(showOnce, startDelay);
    return () => {
      if (bubbleTimerRef.current !== null) {
        window.clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = null;
      }
    };
  }, [seed]);

  const hopDuration = 0.9 + (seed % 7) * 0.07;
  const hopAmplitude = 6 + (seed % 4);
  // 본인은 살짝 크게, 다른 멤버는 기본 크기. Lottie 캐릭터의 가시 영역이 컨테이너의 약 60% 정도라
  // "보이는 말랑이" 가 충분히 크게 인식되도록 88/96 정도가 자연스럽다.
  const characterSize = isSelf ? 96 : 88;
  const nameOffsetPx = Math.round(
    characterSize * CHARACTER_BOTTOM_PADDING_RATIO,
  );
  // 멤버별 액세서리: 시드 기반으로 한 번만 결정. 새로고침해도 같은 사람은 같은 액세서리를 단다.
  // 회전 각도와 사이즈는 살짝씩 변주를 줘서 모두 똑같은 모양이 되지 않게 한다.
  const accessory = useMemo(() => pickAccessory(seed), [seed]);
  const accessoryTilt = ((seed % 11) - 5) * 3; // -15° ~ +15°
  const accessorySize = Math.round(characterSize * 0.28);
  // 액세서리 박스 중심을 두는 픽셀 위치(컨테이너 상단 기준).
  // 정수리 픽셀 - (액세서리 글리프 절반) 으로 두면 액세서리 글리프 하단이 정수리에 닿아,
  // 모자/꽃 등이 정수리 바로 위에 자연스럽게 얹어진 모양이 된다.
  const accessoryTopPx = Math.round(
    characterSize * CHARACTER_HEAD_TOP_RATIO - accessorySize / 2,
  );

  return (
    <Slot
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ duration: 2.4, ease: 'easeInOut' }}
    >
      {emoji !== null && (
        <EmojiBubbleSlot>
          <EmojiBubble
            initial={{ opacity: 0, y: 4, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            transition={{ duration: 0.22 }}
            aria-hidden
          >
            {emoji}
          </EmojiBubble>
        </EmojiBubbleSlot>
      )}
      <Hop
        animate={{ y: [0, -hopAmplitude, 0] }}
        transition={{
          duration: hopDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <CharacterFrame>
          <MallangCharacter
            state="neutral"
            persona={persona}
            size={characterSize}
          />
          <Accessory
            $tiltDeg={accessoryTilt}
            $sizePx={accessorySize}
            $topPx={accessoryTopPx}
            aria-hidden
          >
            {accessory}
          </Accessory>
        </CharacterFrame>
        <NameTag $offsetPx={nameOffsetPx} title={member.name}>
          {member.name || '말랑이'}
        </NameTag>
      </Hop>
    </Slot>
  );
}

/* ===== Position / random helpers ===== */

/**
 * 무대 가장자리에 캐릭터 박스가 잘리지 않도록 두는 안전 마진(%) 범위.
 * 캐릭터 박스 가로/세로가 100px 가까이로 커졌기 때문에, 좁은 무대(약 340~360px) 기준에서
 * 약간 더 안쪽으로 좁혀야 머리/이름이 잘리지 않는다.
 */
const MIN_X = 16;
const MAX_X = 84;
const MIN_Y = 20;
const MAX_Y = 80;

function initialPosition(
  seed: number,
  index: number,
  total: number,
): SlotState {
  // 첫 배치는 결정론적으로 분산시켜서 모두 한 점에 겹치는 일을 방지한다.
  // 총 인원이 적으면 폭을 더 넓게, 많으면 그리드처럼 흩어준다.
  const cols = Math.max(2, Math.ceil(Math.sqrt(total)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rows = Math.max(1, Math.ceil(total / cols));
  const xStep = (MAX_X - MIN_X) / Math.max(1, cols);
  const yStep = (MAX_Y - MIN_Y) / Math.max(1, rows);
  const x = MIN_X + xStep * (col + 0.5) + ((seed % 7) - 3);
  const y = MIN_Y + yStep * (row + 0.5) + ((seed % 5) - 2);
  return clampPosition({ x, y });
}

function randomPosition(seed: number): SlotState {
  return clampPosition({
    x: randomBetween(MIN_X, MAX_X, seed),
    y: randomBetween(MIN_Y, MAX_Y, seed * 13 + 1),
  });
}

function clampPosition({ x, y }: SlotState): SlotState {
  return {
    x: Math.min(MAX_X, Math.max(MIN_X, x)),
    y: Math.min(MAX_Y, Math.max(MIN_Y, y)),
  };
}

/**
 * 다른 멤버 좌표 중 임계값 이내인 것이 하나라도 있는지 검사한다.
 * 박스 거리(max(|dx|, |dy|)) 기준이라 직관적으로 "캐릭터 박스가 닿았다" 가 곧 충돌이다.
 */
function collidesWithAny(point: SlotState, others: SlotState[]): boolean {
  return others.some(
    (other) =>
      Math.abs(other.x - point.x) < COLLISION_THRESHOLD_X &&
      Math.abs(other.y - point.y) < COLLISION_THRESHOLD_Y,
  );
}

/**
 * 다른 멤버와 겹치지 않는 새 좌표를 고른다.
 *  - 최대 MAX_COLLISION_RETRIES 번까지 재추첨하면서 충돌이 없는 좌표를 찾는다.
 *  - 모두 실패하면 마지막에 시도한 좌표를 그대로 돌려준다(겹치더라도 화면이 정지하지 않게).
 *  - 매 시도마다 시드를 바꾸기 위해 Date.now() + attempt 를 더해 PRNG 입력을 흩는다.
 *  - 동시에 keepOut(중앙 차폐) 회피도 적용한다.
 *
 * getOthers 는 호출 시점에 평가되도록 콜백으로 받는다.
 * 멤버 여러 명이 같은 tick 에 좌표를 갱신해도, 직전에 결정된 좌표가 ref 에 즉시 반영돼 있어
 * 다음 멤버가 그 위치를 회피 후보로 본다.
 */
function pickNonCollidingPosition(
  seed: number,
  keepOut: KeepOutRect | undefined,
  getOthers: () => SlotState[],
): SlotState {
  let candidate: SlotState = avoidKeepOut(
    randomPosition(seed + Date.now()),
    keepOut,
    seed,
  );
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
    const others = getOthers();
    if (!collidesWithAny(candidate, others)) return candidate;
    candidate = avoidKeepOut(
      randomPosition(seed + Date.now() + attempt * 9973),
      keepOut,
      seed + attempt,
    );
  }
  return candidate;
}

/**
 * 좌표가 keepOut(중앙 차폐 영역) 안에 있으면 가장 가까운 가장자리 방향으로 밀어낸다.
 * 차폐 영역의 가장자리 바로 바깥에 놓이도록 라디안 비례로 위치를 조정한다.
 * keepOut 이 없으면 입력 그대로 돌려준다.
 */
function avoidKeepOut(
  point: SlotState,
  keepOut: KeepOutRect | undefined,
  seed: number,
): SlotState {
  if (!keepOut) return point;
  const dx = point.x - keepOut.x;
  const dy = point.y - keepOut.y;
  // 타원 내부 판정: (dx/rx)^2 + (dy/ry)^2 <= 1 이면 영역 안.
  const normalized = (dx / keepOut.rx) ** 2 + (dy / keepOut.ry) ** 2;
  if (normalized >= 1) return point;
  // 영역 안이면 중심에서의 각도를 그대로 살린 채, 반지름을 1.05 만큼 키워 바깥으로 보낸다.
  // dx/dy 가 둘 다 0 인 운 나쁜 케이스만 시드로 각도를 만들어 회피한다.
  const angle =
    dx === 0 && dy === 0
      ? randomBetween(0, Math.PI * 2, seed)
      : Math.atan2(dy, dx);
  const margin = 1.08;
  return clampPosition({
    x: keepOut.x + Math.cos(angle) * keepOut.rx * margin,
    y: keepOut.y + Math.sin(angle) * keepOut.ry * margin,
  });
}

function pickEmoji(seed: number): string {
  const index = Math.abs(Math.floor(mulberry32(seed)() * EMOJI_POOL.length));
  return EMOJI_POOL[index % EMOJI_POOL.length];
}

/**
 * 멤버 시드 기반으로 액세서리를 1개 고른다.
 * 시드가 같으면 항상 같은 액세서리가 나오므로, 같은 사용자는 매번 같은 모자/꽃을 단다.
 */
function pickAccessory(seed: number): string {
  // emoji 풀과 다른 PRNG 입력을 만들기 위해 시드에 상수를 더해 분포를 분리한다.
  const index = Math.abs(
    Math.floor(mulberry32(seed + 0x9e3779b9)() * ACCESSORY_POOL.length),
  );
  return ACCESSORY_POOL[index % ACCESSORY_POOL.length];
}

function randomBetween(min: number, max: number, seed: number): number {
  return min + mulberry32(seed)() * (max - min);
}

function jitter(seed: number, range: number): number {
  return Math.floor(mulberry32(seed)() * range);
}

/** 문자열 id 를 32-bit 정수 시드로. crypto 없이 충분히 균일하게 흩어준다. */
function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Math.random 보다 시드 의존적으로 같은 분포를 재현하기 좋다. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
