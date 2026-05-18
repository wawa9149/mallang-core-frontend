import styled from 'styled-components';
import { syncSchedulerFromStores } from '../../../shared/scheduler/sync';
import { useNotificationStore } from '../../../shared/stores/notification-store';

const Card = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const TextWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Title = styled.span`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const Hint = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Switch = styled.button<{ $on: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 999px;
  background: ${({ theme, $on }) =>
    $on ? theme.brand.primary : 'rgba(0, 0, 0, 0.18)'};
  transition: background 160ms ease;
  cursor: pointer;
  border: none;
  padding: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? '22px' : '2px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: left 160ms ease;
  }
`;

export function NotificationToggle() {
  const bannerEnabled = useNotificationStore((s) => s.bannerEnabled);
  const setBannerEnabled = useNotificationStore((s) => s.setBannerEnabled);

  const toggle = () => {
    const next = !bannerEnabled;
    setBannerEnabled(next);
    void syncSchedulerFromStores();
  };

  return (
    <Card>
      <TextWrap>
        <Title>데스크탑 알림</Title>
        <Hint>
          출근/점심/퇴근 시각에 말랑이가 OS 배너로 알려줘. 끄면 말풍선으로만
          보여줘.
        </Hint>
      </TextWrap>
      <Switch
        type="button"
        role="switch"
        aria-checked={bannerEnabled}
        $on={bannerEnabled}
        onClick={toggle}
      />
    </Card>
  );
}
