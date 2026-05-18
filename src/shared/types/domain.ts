/**
 * MVP 기획서 8. 데이터 정의에 맞춘 프론트엔드 도메인 타입.
 * 백엔드 응답과 1:1 매핑되는 경량 인터페이스이며, 폼/스토어/리포트에서 공유한다.
 */

export type ID = string;
export type ISODateString = string;

export type MallangState = 'happy' | 'sad' | 'angry' | 'neutral' | 'tired';

export const MALLANG_STATE_LABEL: Record<MallangState, string> = {
  happy: '기쁨',
  sad: '슬픔',
  angry: '화남',
  neutral: '그냥',
  tired: '지침',
};

export type MallangPersona = 'rest' | 'workout' | 'self-development';

export const MALLANG_PERSONA_LABEL: Record<MallangPersona, string> = {
  rest: '휴식',
  workout: '운동',
  'self-development': '자기개발',
};

/**
 * 사용자가 직접 편집할 수 있는 프로필 정보.
 * 온보딩 완료 시 한 번에 채워지고, 이후 마이페이지에서 수정할 수 있다.
 */
export interface UserProfile {
  name: string;
  team: string;
  workStartTime: string;
  lunchTime: string;
  workEndTime: string;
  hobby: MallangPersona;
  allergies: string;
}

export type EmotionSource =
  | 'morning_check'
  | 'daily_closing'
  | 'chat_text'
  | 'lunch_review'
  | 'overtime_check';

export type RoutineType = 'check_in' | 'lunch' | 'check_out' | 'overtime';

export interface User {
  id: ID;
  name: string;
  email: string;
  companyId: ID | null;
  groupId: ID | null;
  workStartTime: string;
  lunchTime: string;
  workEndTime: string;
  averageOvertimeCount: number;
  /** 사용자가 OpenAI API 키를 등록했는지. 등록된 경우에만 채팅/리포트가 동작한다. */
  hasOpenAiKey: boolean;
  /** "sk-...{last4}" 같은 마스킹 힌트. 없으면 null. */
  openaiKeyHint: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserPreference {
  userId: ID;
  favoriteFoods: string[];
  dislikedFoods: string[];
  restrictedFoods: string[];
  spicyLevel: 0 | 1 | 2 | 3 | 4;
  preferredMallangPersona: string;
  notificationEnabled: boolean;
}

export interface Mallang {
  id: ID;
  userId: ID;
  currentState: MallangState;
  personaType: string;
  colorTheme: string;
  glowLevel: number;
  pulseLevel: number;
  lastInteractionAt: ISODateString;
}

export interface EmotionLog {
  id: ID;
  userId: ID;
  emotionType: MallangState;
  memo: string | null;
  source: EmotionSource;
  createdAt: ISODateString;
}

export interface RoutineLog {
  id: ID;
  userId: ID;
  type: RoutineType;
  value: string | null;
  createdAt: ISODateString;
}

export type LunchVoteStatus = 'pending' | 'in_progress' | 'closed';

export interface LunchVote {
  id: ID;
  groupId: ID;
  status: LunchVoteStatus;
  startedAt: ISODateString;
  endedAt: ISODateString | null;
  selectedMenu: string | null;
  selectedRestaurant: string | null;
}

export interface LunchVoteOption {
  id: ID;
  voteId: ID;
  menuName: string;
  restaurantName: string;
  restaurantAddress: string;
  score: number;
}

export interface LunchVoteResponse {
  id: ID;
  voteId: ID;
  userId: ID;
  optionId: ID;
  createdAt: ISODateString;
}

export interface LunchReview {
  id: ID;
  userId: ID;
  groupId: ID;
  menuName: string;
  restaurantName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reviewText: string | null;
  wantsAgain: boolean;
  createdAt: ISODateString;
}

export interface WeeklyEmotionReport {
  weekOf: ISODateString;
  emotionDistribution: Record<MallangState, number>;
  topState: MallangState;
  overtimeCount: number;
  averageLunchRating: number;
  mallangComment: string;
}
