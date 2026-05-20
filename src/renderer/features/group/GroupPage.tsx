import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { fetchActiveLunchVotes } from '../../shared/api/lunch-votes-api';
import { fetchTeamMembers } from '../../shared/api/teams-api';
import { CloseButton } from '../../shared/components/CloseButton';
import { useEscapeToClose } from '../../shared/hooks/useEscapeToClose';
import { useAuthStore } from '../../shared/stores/auth-store';
import { LunchWinnerStage } from './components/LunchWinnerStage';
import { MallangPlayground } from './components/MallangPlayground';

/**
 * 그룹 말랑이 페이지.
 *
 * 새 동작 요약 (점심 투표 callout 은 더 이상 표시하지 않는다):
 *  - 기본 모드: 팀 말랑이들이 무대 위에서 통통 뛰면서 랜덤하게 돌아다닌다.
 *    각자 비주기적으로 이모티콘 한 개짜리 말풍선을 띄운다.
 *  - 점심 투표가 마감(closed)된 직후: 가운데에 우승 식당 카드가 뜨고,
 *    상단에 "오늘 점심은 X 야!!" 안내 말풍선이 떠 있다.
 *    말랑이들은 가운데 카드 영역을 피해 가장자리로 분산되어 계속 돌아다닌다.
 *
 * 점심 투표 자체에는 더 이상 진입 동선이 없으므로, 별창에 표시되는 점심 투표 흐름은
 * scheduler 가 lunch_alert 인텐트로 자동으로 띄워주는 경로를 그대로 사용한다.
 */

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.brand.background};
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-app-region: drag;
`;

/**
 * 좌측에 타이틀 + 인원수 라벨을 한 줄로 묶고, 우측의 CloseButton(절대 위치) 과 겹치지 않도록
 * padding-right 로 공간을 확보한다. CloseButton 이 약 28~32px 크기라 40px 정도 비워두면 안전.
 */
const Header = styled.header`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-right: 40px;
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
  flex-shrink: 0;
`;

const TeamLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

/**
 * 무대 본체. 드래그 영역을 해제해서 무대 내부 클릭/호버는 드래그 이동으로 잡히지 않게 한다.
 */
const StageHolder = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
`;

const Loading = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

export function GroupPage() {
  const handleClose = () => {
    window.mallang?.window.closeGroup().catch((error) => {
      console.error('[group] close failed', error);
    });
  };
  useEscapeToClose(handleClose);

  const selfUserId = useAuthStore((state) => state.user?.id ?? null);

  const teamQuery = useQuery({
    queryKey: ['team', 'me', 'members'],
    queryFn: fetchTeamMembers,
  });
  const team = teamQuery.data;
  const hasTeam = Boolean(team?.team);

  // 마감된 우승 식당이 있으면 LunchWinnerStage 로 분기한다.
  // open 상태이거나 투표가 없으면 일반 Playground 만 띄운다.
  // 5초 폴링으로 마감 직후 자연스럽게 winner 화면으로 전환된다.
  const activeVoteQuery = useQuery({
    queryKey: ['lunch-votes', 'active'],
    queryFn: fetchActiveLunchVotes,
    enabled: hasTeam,
    refetchInterval: 5_000,
  });
  const activeVote = activeVoteQuery.data?.[0];
  const closedWinnerVote =
    activeVote && activeVote.status === 'closed' ? activeVote : null;

  return (
    <Page>
      <CloseButton onClick={handleClose} />
      <Header>
        <Title>그룹 말랑이</Title>
        {team?.team && (
          <TeamLabel>
            {team.team.name} · {team.members.length}명
          </TeamLabel>
        )}
      </Header>
      <StageHolder>
        {teamQuery.isLoading ? (
          <Loading>팀 정보를 불러오는 중…</Loading>
        ) : closedWinnerVote && team ? (
          <LunchWinnerStage
            vote={closedWinnerVote}
            members={team.members}
            selfUserId={selfUserId}
          />
        ) : (
          <MallangPlayground
            members={team?.members ?? []}
            selfUserId={selfUserId}
          />
        )}
      </StageHolder>
    </Page>
  );
}
