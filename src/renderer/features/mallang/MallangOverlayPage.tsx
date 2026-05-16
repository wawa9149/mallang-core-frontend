import type { KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useMallangStore } from '../../shared/stores/mallang-store';
import type { MallangState } from '../../../shared/types/domain';
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
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px 24px;
  gap: 24px;
  background: linear-gradient(160deg, #f6f1ff 0%, #fdf6ec 100%);
  position: relative;
  overflow: hidden;
  -webkit-app-region: drag;

  /* 캐릭터/버튼/말풍선은 드래그에서 제외해서 클릭/입력 이벤트가 살아있게 */
  & button,
  & input,
  & [data-no-drag] {
    -webkit-app-region: no-drag;
  }
`;

const Bubble = styled(motion.div)`
  position: absolute;
  bottom: calc(100% + 24px);
  left: 50%;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  box-shadow: ${({ theme }) => theme.shadows.floating};
  width: max-content;
  max-width: calc(100vw - 64px);
  text-align: center;
  pointer-events: none;
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: inherit;
    box-shadow: 2px 2px 4px rgba(20, 20, 40, 0.06);
  }
`;

const Controls = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
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
  background: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  box-shadow: 0 1px 4px rgba(20, 20, 40, 0.08);

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const CharacterSlot = styled.div`
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const PromptForm = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 296px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: 8px 14px;
  box-shadow: 0 2px 8px rgba(20, 20, 40, 0.06);

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
  }
`;

const PromptInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Counter = styled.span<{ $full?: boolean }>`
  font-size: 11px;
  color: ${({ theme, $full }) =>
    $full ? theme.colors.primary : theme.colors.textMuted};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

export function MallangOverlayPage() {
  const { state, recentBubble, setState, setBubble } = useMallangStore();
  const [stateIndex, setStateIndex] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!recentBubble) return;
    const timer = setTimeout(() => setBubble(null), 3000);
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

      <CharacterSlot data-no-drag>
        <AnimatePresence>
          {recentBubble && (
            <Bubble
              key={recentBubble}
              initial={{ opacity: 0, x: '-50%', y: 6 }}
              animate={{ opacity: 1, x: '-50%', y: 0 }}
              exit={{ opacity: 0, x: '-50%', y: 6 }}
              transition={{ duration: 0.18 }}
            >
              {recentBubble}
            </Bubble>
          )}
        </AnimatePresence>
        <MallangCharacter state={state} size={140} onClick={handleClick} />
      </CharacterSlot>

      <PromptForm
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
        />
        <Counter $full={prompt.length >= MAX_PROMPT_LENGTH}>
          {prompt.length}/{MAX_PROMPT_LENGTH}
        </Counter>
      </PromptForm>
    </Overlay>
  );
}
