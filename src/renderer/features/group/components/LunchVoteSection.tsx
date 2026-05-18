import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  castLunchVote,
  closeLunchVote,
  createLunchVote,
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

const SmallButton = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 11px;
  font-weight: 700;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.brand.title};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CreateForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const FormTitle = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.subtitle};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Input = styled.input`
  height: 36px;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0 12px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.inputText};
  font-size: 13px;
  font-family: inherit;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.brand.inputPlaceholder};
  }

  &:focus {
    border-color: ${({ theme }) => theme.brand.primary};
  }
`;

const OptionInputs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const OptionInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RemoveBtn = styled.button`
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 14px;
  font-weight: 700;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.danger};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const AddOptionButton = styled.button`
  height: 32px;
  border-radius: 10px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 12px;
  font-weight: 700;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.brand.title};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.brand.primary};
  color: ${({ theme }) => theme.brand.promptText};
  font-size: 13px;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.brand.primaryHover};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  height: 34px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.brand.title};
  }
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

const RestartRow = styled.div`
  display: flex;
  justify-content: center;
`;

const RestartButton = styled.button`
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.brand.primary};
  color: ${({ theme }) => theme.brand.title};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    transform 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.brand.primaryHover};
    transform: translateY(-1px);
  }
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

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

interface Props {
  /** GroupPage가 이미 조회해 둔 팀 정보. team=null이면 투표 UI를 노출하지 않는다. */
  team: BackendTeamMembers | undefined;
  isTeamLoading: boolean;
  /** 별창에서 자체 타이틀을 따로 보여줄 때처럼, 섹션 헤더(이름/참여수)를 숨기고 본문만 렌더할 수 있다. */
  hideHeader?: boolean;
}

export function LunchVoteSection({ team, isTeamLoading, hideHeader }: Props) {
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

  const active = activeQuery.data?.[0];
  // 마감된 투표를 보고 있을 때 사용자가 직접 "새 투표 시작"을 누르면 CreateForm으로 전환.
  const [restartMode, setRestartMode] = useState(false);

  if (isTeamLoading) return null;
  if (!hasTeam) return null;

  const showCreateForm = !active || (active.status === 'closed' && restartMode);

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
      ) : showCreateForm ? (
        <CreateLunchVoteForm
          onCreated={() => {
            setRestartMode(false);
            queryClient.invalidateQueries({ queryKey: ['lunch-votes'] });
          }}
          onCancel={
            active && active.status === 'closed'
              ? () => setRestartMode(false)
              : undefined
          }
        />
      ) : active ? (
        <>
          <ActiveVoteCard
            vote={active}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ['lunch-votes'] })
            }
          />
          {active.status === 'closed' && (
            <RestartRow>
              <RestartButton type="button" onClick={() => setRestartMode(true)}>
                새 투표 시작하기
              </RestartButton>
            </RestartRow>
          )}
        </>
      ) : null}
    </Section>
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
  const closeMutation = useMutation({
    mutationFn: () => closeLunchVote(vote.id),
    onSuccess: () => onChanged(),
  });

  const errorMessage = readMutationError(
    castMutation.error ?? closeMutation.error,
  );

  // 투표 마감 후엔 표 변경/마감 버튼을 잠그고, 우승 옵션은 시각적으로 강조한다.
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
        {!lockInteractions && (
          <SmallButton
            type="button"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          >
            {closeMutation.isPending ? '마감 중…' : '지금 마감'}
          </SmallButton>
        )}
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

function CreateLunchVoteForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  /** 마감된 투표에서 "새 투표 시작" 클릭 후 다시 결과 화면으로 돌아갈 때 쓰는 핸들러. */
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const mutation = useMutation({
    mutationFn: () => {
      const cleaned = options.map((o) => o.trim()).filter(Boolean);
      return createLunchVote({
        title: title.trim() || undefined,
        options: cleaned,
      });
    },
    onSuccess: () => {
      setTitle('');
      setOptions(['', '']);
      onCreated();
    },
  });

  const cleanedCount = useMemo(
    () => options.map((o) => o.trim()).filter(Boolean).length,
    [options],
  );
  const canSubmit = cleanedCount >= MIN_OPTIONS && !mutation.isPending;

  const updateOption = (idx: number, value: string) => {
    setOptions((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };
  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, '']);
  };
  const removeOption = (idx: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const errorMessage = readMutationError(mutation.error);

  return (
    <CreateForm
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) mutation.mutate();
      }}
    >
      <FormTitle>
        주제 (선택)
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="오늘 점심 뭐 먹지?"
          maxLength={50}
        />
      </FormTitle>
      <FormTitle>
        옵션 ({MIN_OPTIONS}~{MAX_OPTIONS}개)
        <OptionInputs>
          {options.map((value, idx) => (
            <OptionInputRow key={idx}>
              <Input
                value={value}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`옵션 ${idx + 1}`}
                maxLength={40}
              />
              <RemoveBtn
                type="button"
                onClick={() => removeOption(idx)}
                disabled={options.length <= MIN_OPTIONS}
                aria-label="옵션 삭제"
                title="옵션 삭제"
              >
                ×
              </RemoveBtn>
            </OptionInputRow>
          ))}
        </OptionInputs>
      </FormTitle>
      <AddOptionButton
        type="button"
        onClick={addOption}
        disabled={options.length >= MAX_OPTIONS}
      >
        + 옵션 추가
      </AddOptionButton>
      {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
      <SubmitButton type="submit" disabled={!canSubmit}>
        {mutation.isPending ? '시작 중…' : '점심 투표 시작'}
      </SubmitButton>
      {onCancel && (
        <CancelButton type="button" onClick={onCancel}>
          이전 결과로 돌아가기
        </CancelButton>
      )}
    </CreateForm>
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
