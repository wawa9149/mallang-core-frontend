import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { AutoLaunchStatus } from '../../../../shared/ipc/channels';

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

const ErrorHint = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.danger};
`;

const Switch = styled.button<{ $on: boolean; $busy: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 999px;
  background: ${({ theme, $on }) =>
    $on ? theme.brand.primary : 'rgba(0, 0, 0, 0.18)'};
  transition: background 160ms ease;
  cursor: ${({ $busy }) => ($busy ? 'progress' : 'pointer')};
  border: none;
  padding: 0;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

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

/**
 * 컴퓨터 부팅 시 말랑이 앱을 자동으로 띄울지 토글한다.
 *
 * - 진실의 출처: OS 의 로그인 항목(`app.getLoginItemSettings()`). 매 마운트마다 메인에서 읽는다.
 * - dev 환경(packaged 아님) 또는 비지원 OS(Linux 등) 에서는 supported=false 로 와 토글이 비활성화된다.
 * - macOS 는 `openAsHidden: true` 로 등록되어 부팅 직후 사용자가 인지하지 못한 채 백그라운드로 시작한다.
 */
export function AutoLaunchToggle() {
  const [status, setStatus] = useState<AutoLaunchStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const bridge = window.mallang?.autoLaunch;
    if (!bridge) {
      // preload 가 안 붙은 환경(예: 웹 미리보기) 에서는 토글 자체를 의미 없게 둔다.
      setStatus({ enabled: false, supported: false });
      return;
    }
    bridge
      .get()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((error) => {
        console.error('[autolaunch] get failed', error);
        if (!cancelled) setStatus({ enabled: false, supported: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async () => {
    if (busy) return;
    const bridge = window.mallang?.autoLaunch;
    if (!bridge || !status?.supported) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const next = await bridge.set(!status.enabled);
      setStatus(next);
    } catch (error) {
      console.error('[autolaunch] set failed', error);
      setErrorMessage(
        '자동 실행 설정을 바꾸지 못했어. 잠시 후 다시 시도해 줘.',
      );
    } finally {
      setBusy(false);
    }
  };

  const enabled = status?.enabled ?? false;
  const supported = status?.supported ?? false;

  return (
    <Card>
      <TextWrap>
        <Title>컴퓨터 켤 때 자동 실행</Title>
        {errorMessage ? (
          <ErrorHint>{errorMessage}</ErrorHint>
        ) : supported ? (
          <Hint>
            켜 두면 컴퓨터를 다시 켰을 때 말랑이가 백그라운드로 함께 시작해.
          </Hint>
        ) : (
          <Hint>
            지금 환경에서는 자동 실행 설정을 변경할 수 없어. (개발 모드 또는
            지원되지 않는 OS)
          </Hint>
        )}
      </TextWrap>
      <Switch
        type="button"
        role="switch"
        aria-checked={enabled}
        $on={enabled}
        $busy={busy}
        disabled={busy || !supported || !status}
        onClick={handleToggle}
      />
    </Card>
  );
}
