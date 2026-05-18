import { useState } from 'react';
import styled from 'styled-components';
import { CloseButton } from '../../shared/components/CloseButton';
import { useEscapeToClose } from '../../shared/hooks/useEscapeToClose';
import { ProfileSection } from './components/ProfileSection';
import { WeeklyReportSection } from './components/WeeklyReportSection';

type MyPageTab = 'profile' | 'weekly-report';

const TABS: { id: MyPageTab; label: string }[] = [
  { id: 'profile', label: '마이페이지' },
  { id: 'weekly-report', label: '주간 리포트' },
];

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.brand.background};
  display: flex;
  flex-direction: column;
  padding: 24px 20px 20px;
  gap: 16px;
  -webkit-app-region: drag;
`;

const TitleBar = styled.div`
  display: flex;
  align-items: baseline;
  gap: 16px;
  -webkit-app-region: no-drag;
`;

const TitleButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font-size: 18px;
  font-weight: 800;
  font-family: inherit;
  line-height: 1.2;
  color: ${({ theme, $active }) =>
    $active ? theme.brand.title : theme.brand.subtitle};
  /* 비활성 타이틀은 옅게 처리하되, 호버 시 활성색에 가깝게 떠올라 클릭 단서 제공. */
  opacity: ${({ $active }) => ($active ? 1 : 0.55)};
  transition:
    color 160ms ease,
    opacity 160ms ease;

  &:hover {
    opacity: 1;
  }
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-app-region: no-drag;
  padding-right: 4px;
`;

export function MyPagePage() {
  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');

  const handleClose = () => {
    window.mallang?.window.closeMyPage().catch((error) => {
      console.error('[mypage] close failed', error);
    });
  };

  useEscapeToClose(handleClose);

  return (
    <Page>
      <CloseButton onClick={handleClose} />
      <TitleBar>
        {TABS.map((tab) => (
          <TitleButton
            key={tab.id}
            type="button"
            $active={tab.id === activeTab}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={tab.id === activeTab}
          >
            {tab.label}
          </TitleButton>
        ))}
      </TitleBar>
      <Scroll>
        {activeTab === 'profile' ? <ProfileSection /> : <WeeklyReportSection />}
      </Scroll>
    </Page>
  );
}
