import { http } from './http';
import type {
  BackendRestaurantSyncResult,
  BackendTeam,
  BackendTeamMembers,
} from './types';

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

export async function syncTeamRestaurants(): Promise<BackendRestaurantSyncResult> {
  const { data } = await http.post<BackendRestaurantSyncResult>(
    '/teams/me/restaurants/sync',
  );
  return data;
}
