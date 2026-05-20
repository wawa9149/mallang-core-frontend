import type { MallangPersona, User } from '../../../shared/types/domain';
import type { BackendHobby, BackendPublicUser } from './types';

/**
 * 프론트 도메인은 하이픈(`self-development`), 백엔드 Prisma enum은 underscore(`self_development`)를 쓴다.
 * URL 슬러그 / GraphQL enum 규칙을 따로 따라가다 보니 발생한 차이 — 이곳에서 한 번에 흡수한다.
 */
export function hobbyToPersona(hobby: BackendHobby): MallangPersona {
  if (hobby === 'self_development') return 'self-development';
  return hobby;
}

export function personaToHobby(persona: MallangPersona): BackendHobby {
  if (persona === 'self-development') return 'self_development';
  return persona;
}

export function toFrontendUser(user: BackendPublicUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    groupId: user.teamId,
    workStartTime: user.workStartTime,
    lunchTime: user.lunchTime,
    workEndTime: user.workEndTime,
    averageOvertimeCount: 0,
    hasOpenAiKey: user.hasOpenAiKey,
    openaiKeyHint: user.openaiKeyHint,
    onboardedAt: user.onboardedAt,
    ttsEnabled: user.ttsEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
