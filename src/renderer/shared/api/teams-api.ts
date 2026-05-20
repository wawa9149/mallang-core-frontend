import { http } from './http';
import type { BackendTeam, BackendTeamMembers } from './types';

/**
 * 회사 주변 식당 추천에 쓰는 기본 반경. 사용자에게는 노출하지 않고 내부적으로 고정한다.
 * 다른 값을 쓰고 싶으면 이 상수만 바꾸면 된다.
 */
export const DEFAULT_SEARCH_RADIUS_METERS = 500;

export async function fetchTeamMembers(): Promise<BackendTeamMembers> {
  const { data } = await http.get<BackendTeamMembers>('/teams/me/members');
  return data;
}

export interface UpdateTeamLocationInput {
  /** null이면 주소를 비운다(다음 추천 때 시드 데이터로 폴백). */
  address?: string | null;
  /** 100~5000(미터). */
  searchRadiusMeters?: number;
}

export async function updateTeamLocation(
  input: UpdateTeamLocationInput,
): Promise<BackendTeam> {
  const { data } = await http.patch<BackendTeam>('/teams/me/location', input);
  return data;
}
