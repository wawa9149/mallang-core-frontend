import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { fetchActiveLunchVotes } from '../../shared/api/lunch-votes-api';
import { fetchTeamMembers } from '../../shared/api/teams-api';
import { CloseButton } from '../../shared/components/CloseButton';
import { useEscapeToClose } from '../../shared/hooks/useEscapeToClose';
import { TeamMembersSection } from './components/TeamMembersSection';

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.brand.background};
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  -webkit-app-region: drag;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  -webkit-app-region: no-drag;
`;

const VoteCallout = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const VoteHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const VoteTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const VoteMeta = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const VoteBody = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const OpenVoteButton = styled.button`
  min-height: 40px;
  margin-top: 6px;
  border-radius: 12px;
  background: ${({ theme }) => theme.brand.primary};
  color: ${({ theme }) => theme.brand.promptText};
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.brand.primaryHover};
  }
  &:active {
    transform: scale(0.99);
  }
`;

export function GroupPage() {
  const handleClose = () => {
    window.mallang?.window.closeGroup().catch((error) => {
      console.error('[group] close failed', error);
    });
  };

  useEscapeToClose(handleClose);

  const teamQuery = useQuery({
    queryKey: ['team', 'me', 'members'],
    queryFn: fetchTeamMembers,
  });
  const hasTeam = Boolean(teamQuery.data?.team);

  const activeVoteQuery = useQuery({
    queryKey: ['lunch-votes', 'active'],
    queryFn: fetchActiveLunchVotes,
    enabled: hasTeam,
  });

  const activeVote = activeVoteQuery.data?.[0];

  const handleOpenLunchVote = () => {
    window.mallang?.window.openLunchVote().catch((error) => {
      console.error('[group] open lunch-vote failed', error);
    });
  };

  return (
    <Page>
      <CloseButton onClick={handleClose} />
      <Title>그룹 말랑이</Title>
      <Scroll>
        <TeamMembersSection
          data={teamQuery.data}
          isLoading={teamQuery.isLoading}
        />
        {hasTeam && (
          <VoteCallout>
            <VoteHeader>
              <VoteTitle>점심 투표</VoteTitle>
              {activeVote ? (
                activeVote.status === 'closed' ? (
                  <VoteMeta>오늘 투표 마감됨</VoteMeta>
                ) : (
                  <VoteMeta>{activeVote.totalVotes}명 참여 중</VoteMeta>
                )
              ) : (
                <VoteMeta>진행 중인 투표 없음</VoteMeta>
              )}
            </VoteHeader>
            <VoteBody>
              {activeVote
                ? activeVote.status === 'closed'
                  ? `"${activeVote.title}" 투표가 마감됐어. 결과는 별창에서 확인할 수 있어.`
                  : `"${activeVote.title}" 투표가 열려 있어. 별창에서 추천 식당 중에 하나를 골라 투표해 줘.`
                : '점심 시간 10분 전이 되면 말랑이가 추천 식당으로 투표를 자동으로 열어. 미리 보고 싶으면 창을 열어 봐.'}
            </VoteBody>
            <OpenVoteButton type="button" onClick={handleOpenLunchVote}>
              {activeVote
                ? activeVote.status === 'closed'
                  ? '결과 보기'
                  : '투표 창 열기'
                : '점심 투표 창 열기'}
            </OpenVoteButton>
          </VoteCallout>
        )}
      </Scroll>
    </Page>
  );
}
