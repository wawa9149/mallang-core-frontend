import { motion } from 'framer-motion';
import styled from 'styled-components';
import type {
  BackendLunchVote,
  BackendLunchVoteOption,
  BackendPublicUser,
  BackendRestaurantCategory,
} from '../../../shared/api/types';
import { MallangPlayground, type KeepOutRect } from './MallangPlayground';

/**
 * 점심 투표가 마감(closed)된 뒤 그룹 페이지 무대에 띄우는 결과 화면.
 * - 상단에 "오늘 점심은 X 야!!" 안내 말풍선 (자동 사라지지 않음, 그날 종일 노출).
 * - 가운데에 우승 식당의 큰 원형 카드.
 *   * 원 안에는 식당 카테고리에 어울리는 큰 이모지 + 식당 이름이 같이 들어간다.
 *   * 카카오 식당이면 원을 클릭해 카카오맵 상세 페이지를 외부 브라우저로 띄울 수 있고,
 *     외부 ID 가 없는 식당은 이름 + 주소로 카카오맵 검색 URL 폴백을 만들어 연다.
 * - 그 주변(중앙 카드 영역은 비워 둔 채)에서 팀원 말랑이들이 통통 뛰며 돌아다닌다.
 *
 * 가운데 회피 영역은 무대 너비 100, 높이 100 비율 기준이며,
 * MallangPlayground 의 좌표가 모두 percent 라서 KeepOutRect 도 percent 단위로 맞춰 둔다.
 */

const Wrapper = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopBubble = styled(motion.div)`
  align-self: center;
  max-width: 320px;
  padding: 12px 18px;
  background: ${({ theme }) => theme.brand.bubble};
  color: ${({ theme }) => theme.brand.bubbleText};
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
  text-align: center;
  border-radius: 22px;
  white-space: pre-wrap;
  position: relative;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 9px;
    background: inherit;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }
`;

/**
 * 가운데 식당 카드 위치 슬롯. 무대 내부에 절대 위치로 띄워서, 그 영역만큼 말랑이들이 비켜간다.
 * 자체 pointer-events 는 none 으로 두지만, 안쪽의 클릭 가능한 원(CircleButton) 은
 * 명시적으로 auto 로 켜서 카드만 클릭 영역으로 잡힌다.
 */
const CenterCardSlot = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
`;

/**
 * 우승 식당을 표시하는 원형 버튼.
 * - 클릭 시 외부 브라우저로 카카오맵 상세/검색 페이지를 띄운다.
 * - hover/focus 시 살짝 떠오르며 클릭 가능함을 시각적으로 전달.
 * - 안쪽 콘텐츠(아이콘 + 이름)는 부모의 pointer-events: none 을 뚫어야 하므로
 *   여기서 명시적으로 pointer-events: auto 를 부여한다.
 */
const CircleButton = styled.button`
  width: 124px;
  height: 124px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.brand.background};
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.1),
    inset 0 0 0 3px ${({ theme }) => theme.brand.inputBg};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  cursor: pointer;
  pointer-events: auto;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
    box-shadow:
      0 12px 22px rgba(0, 0, 0, 0.14),
      inset 0 0 0 3px ${({ theme }) => theme.brand.inputBg};
    outline: none;
  }

  &:active {
    transform: translateY(0);
  }
`;

/** 카테고리에 대응되는 큰 이모지. 원 전체 면적의 중심에서 가장 시선을 끄는 요소. */
const CategoryIcon = styled.span`
  font-size: 44px;
  line-height: 1;
  /* 이모지의 미세한 베이스라인 차이를 보정해 아래의 식당 이름과 시각적으로 정렬되게 한다. */
  display: block;
  user-select: none;
`;

const CircleRestaurantName = styled.span`
  max-width: 100px;
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
  text-align: center;
  line-height: 1.2;
  /* 식당 이름은 최대 2줄까지 보여주고, 더 길면 말줄임. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: keep-all;
`;

/** 무대 가운데에서 비워둘 타원 영역(%). 캐릭터 폭/이름 태그까지 고려해 약간 넉넉히 잡는다. */
const CENTER_KEEP_OUT: KeepOutRect = {
  x: 50,
  y: 50,
  rx: 26,
  ry: 28,
};

interface Props {
  vote: BackendLunchVote;
  members: BackendPublicUser[];
  selfUserId?: string | null;
}

export function LunchWinnerStage({ vote, members, selfUserId }: Props) {
  const winner = pickWinner(vote);
  const winnerLabel = winner?.label ?? vote.options[0]?.label ?? '오늘의 점심';
  const winnerCategory = winner?.restaurant?.category ?? null;
  const categoryIcon = pickCategoryIcon(winnerCategory);
  const externalUrl = winner ? buildRestaurantMapUrl(winner) : null;

  const handleOpen = () => {
    if (externalUrl) openExternalLink(externalUrl);
  };

  return (
    <Wrapper>
      <TopBubble
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        {`오늘 점심은 ${winnerLabel}야!! 맛있게 먹고 와!`}
      </TopBubble>
      <MallangPlayground
        members={members}
        selfUserId={selfUserId}
        keepOut={CENTER_KEEP_OUT}
      >
        <CenterCardSlot>
          <CircleButton
            type="button"
            onClick={handleOpen}
            disabled={!externalUrl}
            title={
              externalUrl
                ? `카카오맵에서 ${winnerLabel} 정보 보기`
                : winnerLabel
            }
            aria-label={
              externalUrl
                ? `카카오맵에서 ${winnerLabel} 정보 보기`
                : winnerLabel
            }
          >
            <CategoryIcon aria-hidden>{categoryIcon}</CategoryIcon>
            <CircleRestaurantName title={winnerLabel}>
              {winnerLabel}
            </CircleRestaurantName>
          </CircleButton>
        </CenterCardSlot>
      </MallangPlayground>
    </Wrapper>
  );
}

/**
 * 마감된 투표의 우승 옵션을 골라 돌려준다.
 *  - winnerOptionId 가 있으면 그걸 우선.
 *  - 없으면 안전 폴백으로 첫 옵션을 사용한다(스키마상 vote 가 closed 면 winnerOptionId 가 있어야 한다).
 */
function pickWinner(vote: BackendLunchVote): BackendLunchVoteOption | null {
  if (vote.winnerOptionId) {
    const found = vote.options.find(
      (option) => option.id === vote.winnerOptionId,
    );
    if (found) return found;
  }
  return vote.options[0] ?? null;
}

/**
 * 식당 카테고리별로 어울리는 큰 이모지 1개를 돌려준다.
 * 식당 이미지가 없는 상황에서 카테고리 분위기를 한눈에 전달하는 역할.
 * 백엔드 enum 에 없는 값이 들어와도 안전하게 etc 폴백을 탄다.
 */
function pickCategoryIcon(
  category: BackendRestaurantCategory | null | undefined,
): string {
  switch (category) {
    case 'korean':
      return '🍚';
    case 'japanese':
      return '🍣';
    case 'chinese':
      return '🥟';
    case 'western':
      return '🍝';
    case 'asian':
      return '🍜';
    case 'snack':
      return '🍢';
    case 'cafe':
      return '☕';
    case 'dessert':
      // 추천 hard filter 에서 차단되지만 직접 조회 등 안전 경로용 fallback.
      return '🍰';
    case 'etc':
    default:
      return '🍽️';
  }
}

/**
 * 우승 식당을 열어 볼 외부 URL 을 만든다.
 * - 카카오 소스 식당은 백엔드가 이미 placeUrl(상세 페이지) 을 채워 주므로 그대로 사용.
 * - 외부 ID 가 없는 식당(시드/자유 입력)은 이름 + 주소로 카카오맵 검색 URL 폴백.
 *
 * LunchVoteSection 에도 동일한 헬퍼가 있지만, 두 페이지가 서로 독립적으로 살아남도록
 * 의존성을 만들지 않기 위해 인라인으로 같은 규칙을 다시 적는다.
 */
function buildRestaurantMapUrl(option: BackendLunchVoteOption): string {
  const restaurant = option.restaurant;
  if (restaurant?.placeUrl) {
    return restaurant.placeUrl;
  }
  const tokens = [option.label];
  if (restaurant?.address) tokens.push(restaurant.address);
  const query = tokens
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .join(' ');
  return `https://map.kakao.com/?q=${encodeURIComponent(query)}`;
}

/**
 * Electron 환경이면 preload 브리지로 시스템 기본 브라우저를 띄우고,
 * 브리지가 없는 환경(스토리북 등)에서는 새 탭 이동으로 폴백한다.
 */
function openExternalLink(url: string) {
  if (typeof window === 'undefined') return;
  const bridge = window.mallang;
  if (bridge?.shell?.openExternal) {
    void bridge.shell.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
