/**
 * 백엔드 NestJS 응답에서 그대로 받는 wire 타입.
 * 추후 OpenAPI 자동 생성 타입으로 교체될 예정이며, 그때까지는 손으로 동기화한다.
 */

export type BackendHobby = 'rest' | 'workout' | 'self_development';

export interface BackendPublicUser {
  id: string;
  email: string;
  name: string;
  hobby: BackendHobby;
  workStartTime: string;
  lunchTime: string;
  workEndTime: string;
  allergies: string | null;
  companyId: string | null;
  teamId: string | null;
  hasOpenAiKey: boolean;
  openaiKeyHint: string | null;
  openaiKeyUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BackendEmotion = 'happy' | 'neutral' | 'tired' | 'sad' | 'angry';
export type BackendChatRole = 'user' | 'assistant';
export type BackendChatIntent =
  | 'free'
  | 'morning_check'
  | 'lunch_alert'
  | 'lunch_review'
  | 'evening_check';

export interface BackendChatMessage {
  id: string;
  role: BackendChatRole;
  intent: BackendChatIntent;
  content: string;
  metadata: unknown;
  createdAt: string;
}

export interface BackendEmotionPublic {
  id: string;
  emotion: BackendEmotion;
  score: number;
  keywords: string[];
  loggedAt: string;
}

export interface BackendChatTurn {
  userMessage: BackendChatMessage;
  assistantMessage: BackendChatMessage;
  emotion: BackendEmotionPublic;
}

export interface BackendTeamLocation {
  address: string | null;
  lat: number | null;
  lng: number | null;
  searchRadiusMeters: number;
}

export interface BackendTeam {
  id: string;
  name: string;
  companyId: string | null;
  location: BackendTeamLocation;
}

export interface BackendTeamMembers {
  team: BackendTeam | null;
  members: BackendPublicUser[];
}

export type BackendVoteStatus = 'open' | 'closed';

/**
 * 옵션이 가리키는 식당의 표시용 메타데이터.
 * 거리(distanceMeters)는 응답 시점의 회사 좌표 기준으로 백엔드가 매번 다시 계산해서 보낸다.
 * 자유 입력 옵션이거나 식당이 삭제된 경우엔 옵션의 `restaurant`가 null이 된다.
 */
export interface BackendLunchVoteOptionRestaurant {
  id: string;
  name: string;
  category: BackendRestaurantCategory;
  priceTier: BackendPriceTier;
  rating: number | null;
  tags: string[];
  address: string | null;
  distanceMeters: number | null;
}

export interface BackendLunchVoteOption {
  id: string;
  label: string;
  /** 추천 시스템이 만든 옵션은 식당 row와 연결된다. 자유 입력은 null. */
  restaurantId: string | null;
  voteCount: number;
  voters: { id: string; name: string }[];
  /** 결정론 추천이 만든 한 줄 사유. 자유 입력 옵션은 null. */
  reason: string | null;
  /** 옵션 연결 식당의 표시용 메타. 자유 입력/식당 삭제 시 null. */
  restaurant: BackendLunchVoteOptionRestaurant | null;
}

export interface BackendLunchVote {
  id: string;
  teamId: string;
  title: string;
  status: BackendVoteStatus;
  date: string;
  closesAt: string | null;
  /** 마감 시점에 백엔드가 확정한 우승 옵션. open이면 null. 동점은 후보 중 랜덤. */
  winnerOptionId: string | null;
  createdAt: string;
  updatedAt: string;
  options: BackendLunchVoteOption[];
  myOptionId: string | null;
  totalVotes: number;
}

export type BackendRestaurantCategory =
  | 'korean'
  | 'japanese'
  | 'chinese'
  | 'western'
  | 'asian'
  | 'snack'
  | 'cafe'
  | 'etc';

export type BackendPriceTier = 'low' | 'mid' | 'high';

/**
 * 백엔드의 결정론 추천 결과 1건.
 * 프론트는 reason 문자열을 그대로 카드에 노출하고, 투표 시작 시 restaurantId를
 * `createLunchVote`의 `restaurantIds`에 함께 실어 보낸다.
 */
export interface BackendLunchSuggestion {
  restaurantId: string;
  name: string;
  category: BackendRestaurantCategory;
  priceTier: BackendPriceTier;
  rating: number | null;
  tags: string[];
  score: number;
  reason: string;
  isExploration: boolean;
  /** 회사 좌표에서 식당까지 직선 거리(미터). 좌표가 없으면 null. */
  distanceMeters: number | null;
}

export interface BackendLunchSuggestionResult {
  items: BackendLunchSuggestion[];
  notes: string[];
}
