import { motion } from 'framer-motion';
import styled, { keyframes, css } from 'styled-components';
import type { MallangState } from '../../../../shared/types/domain';

interface Props {
  state: MallangState;
  size?: number;
  onClick?: () => void;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

const Body = styled(motion.div)<{ $state: MallangState }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  display: grid;
  place-items: center;

  ${({ theme, $state }) => {
    const m = theme.mallang[$state];
    return css`
      background: radial-gradient(
        circle at 35% 30%,
        #ffffff 0%,
        ${m.primary} 45%,
        ${m.accent} 100%
      );
      box-shadow:
        0 0 32px 12px ${m.glow},
        inset -8px -12px 24px rgba(0, 0, 0, 0.08),
        inset 6px 8px 18px rgba(255, 255, 255, 0.55);
      animation: ${pulse} ${m.pulseDurationMs}ms ease-in-out infinite;
    `;
  }}
`;

const Wrapper = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
`;

const Eye = styled.div`
  position: absolute;
  width: 12px;
  height: 16px;
  background: #1a1a22;
  border-radius: 50%;
  top: 38%;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 4px;
    height: 4px;
    background: #fff;
    border-radius: 50%;
  }
`;

const LeftEye = styled(Eye)`
  left: 32%;
`;
const RightEye = styled(Eye)`
  right: 32%;
`;

const Mouth = styled.div<{ $state: MallangState }>`
  position: absolute;
  bottom: 32%;
  width: 24px;
  height: 12px;
  border-bottom: 3px solid #1a1a22;
  border-radius: 0 0 24px 24px;

  ${({ $state }) =>
    $state === 'sad' &&
    css`
      transform: rotate(180deg);
      bottom: 28%;
    `}

  ${({ $state }) =>
    $state === 'angry' &&
    css`
      height: 4px;
      border-bottom: 3px solid #1a1a22;
      border-radius: 0;
    `}

  ${({ $state }) =>
    $state === 'tired' &&
    css`
      border-bottom: 2px solid #1a1a22;
      width: 16px;
    `}
`;

export function MallangCharacter({ state, size = 140, onClick }: Props) {
  return (
    <Wrapper $size={size}>
      <Body
        $state={state}
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.04 }}
      >
        <LeftEye />
        <RightEye />
        <Mouth $state={state} />
      </Body>
    </Wrapper>
  );
}
