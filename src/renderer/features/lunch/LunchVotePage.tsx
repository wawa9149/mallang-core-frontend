import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { fetchTeamMembers } from '../../shared/api/teams-api';
import { CloseButton } from '../../shared/components/CloseButton';
import { useEscapeToClose } from '../../shared/hooks/useEscapeToClose';
import { LunchVoteSection } from '../group/components/LunchVoteSection';

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

const Subtitle = styled.p`
  margin: -8px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-app-region: no-drag;
  padding-right: 4px;
`;

const Empty = styled.div`
  padding: 18px 16px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
  text-align: center;
`;

export function LunchVotePage() {
  const handleClose = () => {
    window.mallang?.window.closeLunchVote().catch((error) => {
      console.error('[lunch-vote] close failed', error);
    });
  };

  useEscapeToClose(handleClose);

  const teamQuery = useQuery({
    queryKey: ['team', 'me', 'members'],
    queryFn: fetchTeamMembers,
  });

  const hasTeam = Boolean(teamQuery.data?.team);

  return (
    <Page>
      <CloseButton onClick={handleClose} />
      <Title>점심 투표</Title>
      <Subtitle>팀 사람들이 가장 많이 고른 곳으로 결정해.</Subtitle>
      <Scroll>
        {teamQuery.isLoading ? (
          <Empty>팀 정보를 불러오는 중…</Empty>
        ) : !hasTeam ? (
          <Empty>
            아직 팀이 없어. 마이페이지에서 팀 이름을 먼저 설정해 줘.
          </Empty>
        ) : (
          <LunchVoteSection
            team={teamQuery.data}
            isTeamLoading={teamQuery.isLoading}
            hideHeader
          />
        )}
      </Scroll>
    </Page>
  );
}
