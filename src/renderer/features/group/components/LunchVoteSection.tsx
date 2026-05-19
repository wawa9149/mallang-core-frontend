import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  castLunchVote,
  ensureAutoLunchVote,
  fetchActiveLunchVotes,
} from '../../../shared/api/lunch-votes-api';
import type {
  BackendLunchVote,
  BackendTeamMembers,
} from '../../../shared/api/types';

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionHeader = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const TotalLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const VoteCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const VoteTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.title};
`;

const OptionList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const OptionRow = styled.li<{ $selected?: boolean; $progress: number }>`
  position: relative;
  border-radius: 12px;
  background: ${({ theme }) => theme.brand.background};
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.brand.primary : 'transparent'};
  overflow: hidden;
  cursor: pointer;
  transition: border-color 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.brand.primaryHover};
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) =>
      `color-mix(in srgb, ${theme.brand.primary} 16%, transparent)`};
    width: ${({ $progress }) => `${Math.round($progress * 100)}%`};
    transition: width 220ms ease;
    z-index: 0;
  }
`;

const OptionInner = styled.button<{ $selected?: boolean }>`
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  font: inherit;
  color: ${({ theme }) => theme.brand.title};
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
`;

const OptionLabel = styled.span<{ $selected?: boolean }>`
  font-size: 13px;
  font-weight: ${({ $selected }) => ($selected ? 800 : 600)};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const VoteCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Voters = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.brand.subtitle};
  margin-left: 6px;
`;

const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 2px;
`;

const Empty = styled.div`
  padding: 14px 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Countdown = styled.span<{ $urgent: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $urgent }) =>
    $urgent ? theme.colors.danger : theme.brand.subtitle};
`;

const WinnerBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.brand.primary} 18%, transparent)`};
  color: ${({ theme }) => theme.brand.title};
  font-size: 13px;
  font-weight: 700;
`;

const WinnerLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const ErrorBox = styled.p`
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 12px;
  font-weight: 600;
  text-align: center;
`;

const NotesBox = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
`;

const WaitingCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const WaitingTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const WaitingDescription = styled.p`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
  line-height: 1.5;
`;

interface Props {
  /** GroupPage가 이미 조회해 둔 팀 정보. team=null이면 투표 UI를 노출하지 않는다. */
  team: BackendTeamMembers | undefined;
  isTeamLoading: boolean;
  /** 별창에서 자체 타이틀을 따로 보여줄 때처럼, 섹션 헤더(이름/참여수)를 숨기고 본문만 렌더할 수 있다. */
  hideHeader?: boolean;
  /**
   * true면 마운트 시 백엔드 `POST /lunch-votes/auto`를 한 번 호출해서
   * 오늘 우리 팀의 점심 투표를 멱등하게 보장한다. 점심 별창에서만 true로 사용하고,
   * 그룹 페이지의 인라인 섹션에서는 false로 둬서 사용자가 그룹을 미리 봐도
   * 의도치 않게 투표가 만들어지지 않도록 한다.
   */
  autoEnsure?: boolean;
}

export function LunchVoteSection({
  team,
  isTeamLoading,
  hideHeader,
  autoEnsure,
}: Props) {
  const queryClient = useQueryClient();
  const hasTeam = Boolean(team?.team);

  const activeQuery = useQuery({
    queryKey: ['lunch-votes', 'active'],
    queryFn: fetchActiveLunchVotes,
    enabled: hasTeam,
    // 백엔드가 closesAt 도래 시 lazy auto-close를 해 주므로,
    // 클라이언트는 가벼운 polling으로 마감/결과를 자연스럽게 받아 본다.
    refetchInterval: 5_000,
  });

  // autoEnsure가 켜진 별창에서만 1회 ensure를 호출한다. 백엔드가 멱등이라
  // 다시 열어도 안전하고, 후보가 0개인 케이스의 안내문(notes)도 함께 받는다.
  const ensureMutation = useMutation({
    mutationFn: ensureAutoLunchVote,
    onSuccess: (result) => {
      // 새 LunchVote가 만들어졌든 기존이 그대로든, active 리스트를 다시 가져온다.
      if (result.vote) {
        queryClient.invalidateQueries({ queryKey: ['lunch-votes'] });
      }
    },
  });

  useEffect(() => {
    if (!autoEnsure || !hasTeam) return;
    // 의도적으로 한 번만 발화: 별창이 열린 그 시점이 점심 시작 신호. 멱등 보장은 백엔드 책임.
    ensureMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnsure, hasTeam]);

  const active = activeQuery.data?.[0];
  // 후보 0개로 자동 생성 자체가 안 된 경우의 안내문. ensure가 vote=null로 응답했을 때만 보여준다.
  const ensureNotes =
    ensureMutation.data && !ensureMutation.data.vote
      ? ensureMutation.data.notes
      : [];

  if (isTeamLoading) return null;
  if (!hasTeam) return null;

  return (
    <Section>
      {!hideHeader && (
        <SectionHeader>
          <SectionTitle>점심 투표</SectionTitle>
          {active ? (
            <TotalLabel>
              {active.status === 'closed'
                ? '오늘 투표 마감됨'
                : `${active.totalVotes}명 참여`}
            </TotalLabel>
          ) : (
            <TotalLabel>아직 진행 중인 투표가 없어</TotalLabel>
          )}
        </SectionHeader>
      )}
      {activeQuery.isLoading ? (
        <Empty>투표 정보를 불러오는 중…</Empty>
      ) : active ? (
        <ActiveVoteCard
          vote={active}
          onChanged={() =>
            queryClient.invalidateQueries({ queryKey: ['lunch-votes'] })
          }
        />
      ) : (
        <WaitingPlaceholder
          isEnsuring={ensureMutation.isPending}
          ensureNotes={ensureNotes}
        />
      )}
    </Section>
  );
}

function WaitingPlaceholder({
  isEnsuring,
  ensureNotes,
}: {
  isEnsuring: boolean;
  ensureNotes: string[];
}) {
  if (isEnsuring) {
    return (
      <WaitingCard>
        <WaitingTitle>오늘 점심 후보를 추리는 중…</WaitingTitle>
        <WaitingDescription>
          말랑이가 팀 컨텍스트로 후보 세 곳을 고르고 있어. 잠시만 기다려 줘.
        </WaitingDescription>
      </WaitingCard>
    );
  }

  if (ensureNotes.length > 0) {
    return (
      <WaitingCard>
        <WaitingTitle>오늘은 점심 투표를 시작하지 못했어</WaitingTitle>
        {ensureNotes.map((note) => (
          <NotesBox key={note}>{note}</NotesBox>
        ))}
      </WaitingCard>
    );
  }

  return (
    <WaitingCard>
      <WaitingTitle>점심 시간이 되면 자동으로 시작돼</WaitingTitle>
      <WaitingDescription>
        설정해 둔 점심 시간 10분 전에 말랑이가 추천 후보 세 곳으로 투표를
        자동으로 열어. 팀원은 그냥 마음에 드는 곳을 클릭만 하면 돼.
      </WaitingDescription>
    </WaitingCard>
  );
}

function ActiveVoteCard({
  vote,
  onChanged,
}: {
  vote: BackendLunchVote;
  onChanged: () => void;
}) {
  const max = Math.max(vote.totalVotes, 1);
  const isClosed = vote.status === 'closed';
  const winnerOption = vote.winnerOptionId
    ? (vote.options.find((o) => o.id === vote.winnerOptionId) ?? null)
    : null;
  const remainingMs = useCountdown(vote.closesAt);
  const hasDeadline = Boolean(vote.closesAt);
  const expired = hasDeadline && remainingMs !== null && remainingMs <= 0;

  const castMutation = useMutation({
    mutationFn: (optionId: string) => castLunchVote(vote.id, optionId),
    onSuccess: () => onChanged(),
  });

  const errorMessage = readMutationError(castMutation.error);

  // 투표 마감 후엔 표 변경을 잠그고, 우승 옵션은 시각적으로 강조한다.
  // 마감 트리거는 "팀원 전원 투표 완료" 또는 "lunchTime 정시"로만 일어나며, 수동 마감 액션은 두지 않는다.
  const lockInteractions = isClosed || expired;

  return (
    <VoteCard>
      <Footer style={{ margin: 0 }}>
        <VoteTitle>{vote.title}</VoteTitle>
        {hasDeadline && remainingMs !== null && !isClosed && (
          <Countdown $urgent={remainingMs <= 60_000}>
            남은 시간 {formatRemaining(remainingMs)}
          </Countdown>
        )}
        {isClosed && <WinnerLabel>마감됨</WinnerLabel>}
      </Footer>
      <OptionList>
        {vote.options.map((option) => {
          const selected = option.id === vote.myOptionId;
          const isWinner = option.id === vote.winnerOptionId;
          const progress = option.voteCount / max;
          return (
            <OptionRow
              key={option.id}
              $selected={selected || isWinner}
              $progress={progress}
            >
              <OptionInner
                type="button"
                $selected={selected}
                disabled={castMutation.isPending || lockInteractions}
                onClick={() => castMutation.mutate(option.id)}
              >
                <OptionLabel $selected={selected || isWinner}>
                  {isWinner ? <CrownIcon /> : selected && <CheckIcon />}
                  {option.label}
                  {option.voters.length > 0 && (
                    <Voters>
                      ({option.voters.map((v) => v.name).join(', ')})
                    </Voters>
                  )}
                </OptionLabel>
                <VoteCount>{option.voteCount}</VoteCount>
              </OptionInner>
            </OptionRow>
          );
        })}
      </OptionList>
      {isClosed && winnerOption && (
        <WinnerBanner>
          <CrownIcon />
          오늘 점심은 {winnerOption.label}!
        </WinnerBanner>
      )}
      {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
      <Footer>
        <TotalLabel>
          {isClosed
            ? `${vote.totalVotes}표 집계 완료`
            : vote.myOptionId
              ? '내 표가 반영됐어'
              : '아직 투표하지 않았어'}
        </TotalLabel>
      </Footer>
    </VoteCard>
  );
}

/**
 * closesAt 도래까지의 남은 ms를 1초 간격으로 계산해 돌려준다.
 * closesAt이 없으면 null.
 */
function useCountdown(closesAt: string | null): number | null {
  const deadlineMs = useMemo(
    () => (closesAt ? new Date(closesAt).getTime() : null),
    [closesAt],
  );
  const [remaining, setRemaining] = useState<number | null>(() =>
    deadlineMs === null ? null : Math.max(0, deadlineMs - Date.now()),
  );

  useEffect(() => {
    if (deadlineMs === null) {
      setRemaining(null);
      return;
    }
    setRemaining(Math.max(0, deadlineMs - Date.now()));
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, deadlineMs - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  return remaining;
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${s}초`;
}

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7l4.5 3 4.5-6 4.5 6L21 7l-2 12H5L3 7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7.5L5.5 10.5L11.5 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function readMutationError(error: unknown): string | null {
  if (!error) return null;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data?.message.join(', ');
  }
  if (error instanceof Error) return error.message;
  return '요청 중 오류가 발생했어.';
}
