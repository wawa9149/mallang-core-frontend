import styled from 'styled-components';
import {
  MALLANG_PERSONA_LABEL,
  type MallangPersona,
} from '../../../../shared/types/domain';
import { hobbyToPersona } from '../../../shared/api/mappers';
import type { BackendTeamMembers } from '../../../shared/api/types';
import { MallangCharacter } from '../../mallang/components/MallangCharacter';

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

const TeamLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`;

const Card = styled.article`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const CharSlot = styled.div`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.title};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Sub = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Empty = styled.div`
  padding: 18px 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
  color: ${({ theme }) => theme.brand.subtitle};
`;

interface Props {
  data: BackendTeamMembers | undefined;
  isLoading: boolean;
}

export function TeamMembersSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Section>
        <SectionHeader>
          <SectionTitle>팀 말랑이</SectionTitle>
        </SectionHeader>
        <Empty>팀 정보를 불러오는 중…</Empty>
      </Section>
    );
  }

  if (!data?.team) {
    return (
      <Section>
        <SectionHeader>
          <SectionTitle>팀 말랑이</SectionTitle>
        </SectionHeader>
        <Empty>
          아직 팀이 설정되지 않았어.
          <br />
          마이페이지에서 팀 이름을 정해 주면 같은 팀원들의 말랑이가 보여.
        </Empty>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>팀 말랑이</SectionTitle>
        <TeamLabel>
          {data.team.name} · {data.members.length}명
        </TeamLabel>
      </SectionHeader>
      <Grid>
        {data.members.map((member) => {
          const persona: MallangPersona = hobbyToPersona(member.hobby);
          return (
            <Card key={member.id}>
              <CharSlot>
                <MallangCharacter state="neutral" persona={persona} size={44} />
              </CharSlot>
              <Meta>
                <Name title={member.name}>{member.name}</Name>
                <Sub>
                  {MALLANG_PERSONA_LABEL[persona]} · 점심 {member.lunchTime}
                </Sub>
              </Meta>
            </Card>
          );
        })}
      </Grid>
    </Section>
  );
}
