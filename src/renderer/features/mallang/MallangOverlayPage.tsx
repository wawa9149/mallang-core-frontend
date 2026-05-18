import type { KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useMallangStore } from '../../shared/stores/mallang-store';
import { useUserProfileStore } from '../../shared/stores/user-profile-store';
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

const SideHoverZone = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  /* 채팅 입력(PromptRow 44px + Overlay padding-bottom 20px + gap 16px)을 침범하지 않도록 비워둔다. */
  bottom: calc(44px + 20px + 16px);
  width: 64px;
  ${({ $side }) =>
    $side === 'left'
      ? `
        left: 0;
        mask-image: linear-gradient(to right, black 0%, black 60%, transparent 100%);
        -webkit-mask-image: linear-gradient(to right, black 0%, black 60%, transparent 100%);
      `
      : `
        right: 0;
        mask-image: linear-gradient(to left, black 0%, black 60%, transparent 100%);
        -webkit-mask-image: linear-gradient(to left, black 0%, black 60%, transparent 100%);
      `}
  display: grid;
  place-items: center;
  background: transparent;
  color: ${({ theme }) => theme.brand.primary};
  opacity: 0;
  transition:
    background-color 220ms ease-out,
    opacity 220ms ease-out,
    backdrop-filter 220ms ease-out;
  cursor: pointer;
  z-index: 5;

  &:hover,
  &:focus-visible {
    opacity: 1;
    /* 캐릭터가 살짝 비쳐 보이도록 bubble 색을 50% 알파로 깐다. */
    background: color-mix(
      in srgb,
      ${({ theme }) => theme.brand.bubble} 50%,
      transparent
    );
    backdrop-filter: blur(2px);
  }

  svg {
    width: 22px;
    height: 22px;
  }
`;

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.86a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.27.65.84 1.11 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03z" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

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
    right: 28px;
    width: 18px;
    height: 14px;
    background: inherit;
    /* 말풍선 우측 하단에서 좌하단(=캐릭터 머리 쪽)을 가리키는 꼬리 */
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
  const profile = useUserProfileStore((s) => s.profile);
  const onboardingComplete = isOnboarded || profile !== null;
  const effectivePersona = profile?.hobby ?? persona;
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

  const handleOpenMyPage = () => {
    window.mallang?.window.openMyPage();
  };

  const handleOpenGroup = () => {
    window.mallang?.window.openGroup();
  };

  if (!onboardingComplete) {
    return (
      <Overlay>
        <OnboardingFlow />
      </Overlay>
    );
  }

  return (
    <Overlay>
      <SideHoverZone
        type="button"
        $side="left"
        data-no-drag
        onClick={handleOpenMyPage}
        aria-label="마이페이지 열기"
        title="마이페이지"
      >
        <GearIcon />
      </SideHoverZone>
      <SideHoverZone
        type="button"
        $side="right"
        data-no-drag
        onClick={handleOpenGroup}
        aria-label="그룹 말랑이 열기"
        title="그룹 말랑이"
      >
        <GroupIcon />
      </SideHoverZone>

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
          persona={effectivePersona}
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
