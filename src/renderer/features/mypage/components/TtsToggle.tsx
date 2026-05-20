import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import styled from 'styled-components';
import { updateMe } from '../../../shared/api/users-api';
import { mallangTtsPlayer } from '../../../shared/audio/tts-player';
import { useAuthStore } from '../../../shared/stores/auth-store';

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
 * 말랑이 발화에 Clova Voice TTS 를 붙일지 여부를 토글한다.
 * - 진실의 출처: 백엔드 User.ttsEnabled. 토글하면 즉시 PATCH /users/me 로 전송한다.
 * - 끄는 순간 현재 재생 중인 발화도 stop 시켜 자막과 음성이 어긋나지 않게 한다.
 */
export function TtsToggle() {
  const ttsEnabled = useAuthStore((s) => s.user?.ttsEnabled ?? false);
  const setUser = useAuthStore((s) => s.setUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) => updateMe({ ttsEnabled: next }),
    onSuccess: ({ user }, next) => {
      setUser(user);
      if (!next) {
        // 토글을 끈 직후 진행 중이던 음성은 즉시 중단해서 자막보다 늦게 끝나는 어색함을 막는다.
        mallangTtsPlayer.stop();
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'TTS 설정을 저장하지 못했어. 잠시 후 다시 시도해 줘.';
      setErrorMessage(message);
    },
  });

  const handleToggle = () => {
    if (toggleMutation.isPending) return;
    setErrorMessage(null);
    toggleMutation.mutate(!ttsEnabled);
  };

  return (
    <Card>
      <TextWrap>
        <Title>말랑이 음성</Title>
        {errorMessage ? (
          <ErrorHint>{errorMessage}</ErrorHint>
        ) : (
          <Hint>
            켜면 말랑이가 말하는 내용을 Clova Voice 로 함께 들려줘. 끄면 자막만
            보여줘.
          </Hint>
        )}
      </TextWrap>
      <Switch
        type="button"
        role="switch"
        aria-checked={ttsEnabled}
        $on={ttsEnabled}
        $busy={toggleMutation.isPending}
        disabled={toggleMutation.isPending}
        onClick={handleToggle}
      />
    </Card>
  );
}
