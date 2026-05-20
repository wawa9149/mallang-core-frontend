import { http } from './http';

export interface TodayWinner {
  lunchVoteId: string;
  restaurantId: string;
  restaurantName: string;
  category: string;
  address: string | null;
  placeUrl: string | null;
}

export interface ReviewResult {
  id: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  note: string | null;
  wantsAgain: boolean | null;
  visitedAt: string;
}

export interface SubmitReviewInput {
  lunchVoteId: string;
  rating: number;
  note?: string;
  wantsAgain?: boolean;
}

export async function fetchTodayWinner(): Promise<TodayWinner | null> {
  const { data } = await http.get<TodayWinner | null>(
    '/visit-records/today-winner',
  );
  return data;
}

export async function checkAlreadyReviewed(
  lunchVoteId: string,
): Promise<boolean> {
  const { data } = await http.get<{ reviewed: boolean }>(
    '/visit-records/reviewed',
    { params: { lunchVoteId } },
  );
  return data.reviewed;
}

export async function submitReview(
  input: SubmitReviewInput,
): Promise<ReviewResult> {
  const { data } = await http.post<ReviewResult>('/visit-records', input);
  return data;
}
