import type { KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useMallangStore } from '../../shared/stores/mallang-store';
import type { MallangState } from '../../../shared/types/domain';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { MallangCharacter } from './components/MallangCharacter';
import { pickClickMessage } from './data/click-messages';

const MAX_PROMPT_LENGTH = 30;

const PROMPT_REPLIES = [
  '그래.',
  '들었어.',
  '오케이.',
  '음, 알겠어.',
  '그렇구나.',
  '네 마음 알지.',
  '나도 그래.',
  '괜찮아.',
  '버텨.',
  '응. 더 말해.',
];

function pickReply() {
  return PROMPT_REPLIES[Math.floor(Math.random() * PROMPT_REPLIES.length)];
}

const STATE_CYCLE: MallangState[] = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'tired',
];

const Overlay = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 20px 20px;
  gap: 16px;
  background: ${({ theme }) => theme.brand.background};
  position: relative;
  overflow: hidden;
  -webkit-app-region: drag;

  & button,
  & input,
  & [data-no-drag] {
    -webkit-app-region: no-drag;
  }
`;

const CharacterArea = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Bubble = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  max-width: calc(100% - 24px);
  padding: 14px 20px;
  background: ${({ theme }) => theme.brand.bubble};
  color: ${({ theme }) => theme.brand.bubbleText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  border-radius: 18px;
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
  pointer-events: none;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 22px;
    width: 18px;
    height: 14px;
    background: inherit;
    clip-path: polygon(0 0, 100% 0, 30% 100%);
  }
`;

const Controls = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 160ms ease;
  z-index: 3;

  ${Overlay}:hover & {
    opacity: 1;
  }
`;

const IconButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  color: ${({ theme }) => theme.brand.primary};
  box-shadow: 0 1px 4px rgba(20, 20, 40, 0.08);

  &:hover {
    background: #ffffff;
  }
`;

const PromptRow = styled.form`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
`;

const PromptInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 18px;
  border: none;
  outline: none;
  background: ${({ theme }) => theme.brand.promptBg};
  color: ${({ theme }) => theme.brand.promptText};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 14px;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.brand.promptPlaceholder};
  }
`;

const MicButton = styled.button`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.brand.promptBg};
  color: ${({ theme }) => theme.brand.promptText};
  display: grid;
  place-items: center;
  transition:
    background-color 160ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.brand.primaryHover};
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

export function MallangOverlayPage() {
  const { state, persona, recentBubble, isOnboarded, setState, setBubble } =
    useMallangStore();
  const [stateIndex, setStateIndex] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!recentBubble) return;
    const timer = setTimeout(() => setBubble(null), 4000);
    return () => clearTimeout(timer);
  }, [recentBubble, setBubble]);

  const handleClick = () => {
    setBubble(pickClickMessage(state));
  };

  const handleCycleState = () => {
    const next = (stateIndex + 1) % STATE_CYCLE.length;
    setStateIndex(next);
    setState(STATE_CYCLE[next]);
    setBubble(null);
  };

  const handleOpenSettings = () => {
    window.mallang?.window.openMain('/settings');
  };

  const sendPrompt = () => {
    const value = prompt.trim();
    if (!value) return;
    // TODO: 백엔드로 채팅 메시지 전송 + 페르소나 응답 수신
    setBubble(pickReply());
    setPrompt('');
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isComposing) {
      event.preventDefault();
      sendPrompt();
    }
  };

  const handleMicClick = () => {
    // TODO: 음성 입력(녹음→텍스트) 연결
    setBubble('음성 입력은 곧 만들 거야!');
  };

  if (!isOnboarded) {
    return (
      <Overlay>
        <OnboardingFlow />
      </Overlay>
    );
  }

  return (
    <Overlay>
      <Controls data-no-drag>
        <IconButton onClick={handleCycleState} title="상태 전환(데모)">
          ◆
        </IconButton>
        <IconButton onClick={handleOpenSettings} title="설정 열기">
          ⚙
        </IconButton>
        <IconButton
          onClick={() => window.mallang?.window.closeMallang()}
          title="닫기"
        >
          ×
        </IconButton>
      </Controls>

      <CharacterArea data-no-drag>
        <AnimatePresence>
          {recentBubble && (
            <Bubble
              key={recentBubble}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              {recentBubble}
            </Bubble>
          )}
        </AnimatePresence>
        <MallangCharacter
          state={state}
          persona={persona}
          size={220}
          onClick={handleClick}
        />
      </CharacterArea>

      <PromptRow
        data-no-drag
        onSubmit={(event) => {
          event.preventDefault();
          sendPrompt();
        }}
      >
        <PromptInput
          value={prompt}
          onChange={(event) =>
            setPrompt(event.target.value.slice(0, MAX_PROMPT_LENGTH))
          }
          onKeyDown={handlePromptKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="말 걸어봐 (30자 이내)"
          maxLength={MAX_PROMPT_LENGTH}
          aria-label="말랑이에게 보낼 메시지"
        />
        <MicButton
          type="button"
          onClick={handleMicClick}
          aria-label="음성으로 말 걸기"
          title="음성 입력 (곧 추가될 예정)"
        >
          <MicIcon />
        </MicButton>
      </PromptRow>
    </Overlay>
  );
}
