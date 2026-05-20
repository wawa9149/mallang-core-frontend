import type { MallangPersona, User } from '../../../shared/types/domain';
import { http } from './http';
import { personaToHobby, toFrontendUser } from './mappers';
import type { BackendPublicUser } from './types';

export interface UpdateMeInput {
  name?: string;
  hobby?: MallangPersona;
  workStartTime?: string;
  lunchTime?: string;
  workEndTime?: string;
  allergies?: string;
  companyName?: string;
  teamName?: string;
  /** 말랑이 발화 TTS 사용 여부. 마이페이지 토글에서 즉시 PATCH 한다. */
  ttsEnabled?: boolean;
}

export async function setOpenAiKey(
  apiKey: string,
): Promise<{ user: User; raw: BackendPublicUser }> {
  const { data } = await http.put<BackendPublicUser>('/users/me/openai-key', {
    apiKey,
  });
  return { user: toFrontendUser(data), raw: data };
}

export async function clearOpenAiKey(): Promise<{
  user: User;
  raw: BackendPublicUser;
}> {
  const { data } = await http.delete<BackendPublicUser>('/users/me/openai-key');
  return { user: toFrontendUser(data), raw: data };
}

export async function updateMe(
  input: UpdateMeInput,
): Promise<{ user: User; raw: BackendPublicUser }> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.hobby !== undefined) payload.hobby = personaToHobby(input.hobby);
  if (input.workStartTime !== undefined)
    payload.workStartTime = input.workStartTime;
  if (input.lunchTime !== undefined) payload.lunchTime = input.lunchTime;
  if (input.workEndTime !== undefined) payload.workEndTime = input.workEndTime;
  if (input.allergies !== undefined) payload.allergies = input.allergies;
  if (input.companyName !== undefined) payload.companyName = input.companyName;
  if (input.teamName !== undefined) payload.teamName = input.teamName;
  if (input.ttsEnabled !== undefined) payload.ttsEnabled = input.ttsEnabled;

  const { data } = await http.patch<BackendPublicUser>('/users/me', payload);
  return { user: toFrontendUser(data), raw: data };
}
