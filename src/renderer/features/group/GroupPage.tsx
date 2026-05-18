import styled from 'styled-components';
import { CloseButton } from '../../shared/components/CloseButton';
import { useEscapeToClose } from '../../shared/hooks/useEscapeToClose';

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.brand.background};
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  -webkit-app-region: drag;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  color: ${({ theme }) => theme.brand.subtitle};
`;

export function GroupPage() {
  const handleClose = () => {
    window.mallang?.window.closeGroup().catch((error) => {
      console.error('[group] close failed', error);
    });
  };

  useEscapeToClose(handleClose);

  return (
    <Page>
      <CloseButton onClick={handleClose} />
      <Title>그룹 말랑이</Title>
      <Description>
        팀원들의 말랑이가 모이는 공간을
        <br />
        준비하고 있어. 조금만 기다려 줘.
      </Description>
    </Page>
  );
}
