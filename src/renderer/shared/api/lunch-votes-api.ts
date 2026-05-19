import { http } from './http';
import type { BackendLunchSuggestionResult, BackendLunchVote } from './types';

export interface CreateLunchVoteInput {
  title?: string;
  options: string[];
  /**
   * options 인덱스와 1:1 매칭. 추천 옵션에는 식당 ID를, 자유 입력 자리는 빈 문자열을 둔다.
   * 전체가 자유 입력이면 생략한다.
   */
  restaurantIds?: string[];
  closesAt?: string;
}

export async function fetchActiveLunchVotes(): Promise<BackendLunchVote[]> {
  const { data } = await http.get<BackendLunchVote[]>('/lunch-votes/active');
  return data;
}

export async function fetchLunchSuggestions(): Promise<BackendLunchSuggestionResult> {
  const { data } = await http.get<BackendLunchSuggestionResult>(
    '/lunch-votes/suggestions',
  );
  return data;
}

export interface EnsureAutoLunchVoteResult {
  vote: BackendLunchVote | null;
  notes: string[];
}

/**
 * 오늘(KST) 우리 팀의 점심 투표를 멱등하게 보장한다.
 * - 이미 있으면 그대로 반환, 없으면 추천 Top-3로 자동 생성.
 * - 후보가 0개면 vote는 null이고 notes에 사유가 담긴다.
 */
export async function ensureAutoLunchVote(): Promise<EnsureAutoLunchVoteResult> {
  const { data } =
    await http.post<EnsureAutoLunchVoteResult>('/lunch-votes/auto');
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
