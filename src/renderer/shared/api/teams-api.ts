import { http } from './http';
import type { BackendTeamMembers } from './types';

export async function fetchTeamMembers(): Promise<BackendTeamMembers> {
  const { data } = await http.get<BackendTeamMembers>('/teams/me/members');
  return data;
}
