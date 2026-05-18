import { http } from './http';
import type { BackendLunchVote } from './types';

export interface CreateLunchVoteInput {
  title?: string;
  options: string[];
  closesAt?: string;
}

export async function fetchActiveLunchVotes(): Promise<BackendLunchVote[]> {
  const { data } = await http.get<BackendLunchVote[]>('/lunch-votes/active');
  return data;
}

export async function fetchLunchVote(id: string): Promise<BackendLunchVote> {
  const { data } = await http.get<BackendLunchVote>(`/lunch-votes/${id}`);
  return data;
}

export async function createLunchVote(
  input: CreateLunchVoteInput,
): Promise<BackendLunchVote> {
  const { data } = await http.post<BackendLunchVote>('/lunch-votes', input);
  return data;
}

export async function castLunchVote(
  voteId: string,
  optionId: string,
): Promise<BackendLunchVote> {
  const { data } = await http.post<BackendLunchVote>(
    `/lunch-votes/${voteId}/vote`,
    {
      optionId,
    },
  );
  return data;
}

export async function closeLunchVote(
  voteId: string,
): Promise<BackendLunchVote> {
  const { data } = await http.post<BackendLunchVote>(
    `/lunch-votes/${voteId}/close`,
  );
  return data;
}
