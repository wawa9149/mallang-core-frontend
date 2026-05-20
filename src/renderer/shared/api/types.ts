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
  /**
   * 온보딩(필수 정보 입력) 완료 시점(ISO).
   * 백엔드에서 한 번 채워지면 다시 null 로 돌아가지 않는다.
   * 프론트는 이 값의 존재 여부만 보고 OnboardingFlow 노출 여부를 결정한다.
   */
  onboardedAt: string | null;
  /** 말랑이 발화를 Clova Voice TTS 로 들을지 여부. 마이페이지 토글로 변경. */
  ttsEnabled: boolean;
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
  /**
   * 식당 상세 페이지(공유 링크) URL.
   * 카카오에서 가져온 식당만 채워지고, 시드 등 외부 ID 없는 식당은 null.
   * null 이면 프론트는 이름/주소 검색 URL 로 폴백한다.
   */
  placeUrl: string | null;
  /**
   * 식당 대표 이미지 URL. 현재 백엔드 응답에는 포함되지 않을 수 있고(opt-in),
   * 향후 카카오 외부 이미지 등을 채워 보낼 경우를 대비해 옵셔널로 둔다.
   * 그룹 페이지 우승 카드에서 이미지로 렌더하고, 없으면 식당 이름 텍스트로 폴백한다.
   * 외부 도메인 이미지를 띄우려면 index.html 의 CSP img-src 에 해당 도메인 추가 필요.
   */
  imageUrl?: string | null;
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
  // 디저트·베이커리·한과류. 백엔드 추천에서는 hard filter 로 제외되지만,
  // 직접 조회 등 다른 경로로 내려올 수 있어 타입에는 정의해 둔다.
  | 'dessert'
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
