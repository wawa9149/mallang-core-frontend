import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';
import type { MallangState } from '../../../../shared/types/domain';
import mallangNeutral from '../../../assets/mallang/neutral.png';

interface Props {
  state: MallangState;
  size?: number;
  onClick?: () => void;
}

const stateFilter: Record<MallangState, string> = {
  neutral: 'none',
  happy: 'brightness(1.05) saturate(1.15) hue-rotate(-8deg)',
  sad: 'brightness(0.92) saturate(0.7) hue-rotate(18deg)',
  angry: 'brightness(0.98) saturate(1.4) hue-rotate(-26deg)',
  tired: 'brightness(0.88) saturate(0.75) hue-rotate(12deg)',
};

const stateMotion: Record<
  MallangState,
  { duration: number; yRange: [number, number]; rotate: [number, number] }
> = {
  neutral: { duration: 3.2, yRange: [0, -4], rotate: [-1.5, 1.5] },
  happy: { duration: 1.6, yRange: [0, -10], rotate: [-3, 3] },
  sad: { duration: 4.8, yRange: [0, -2], rotate: [-0.5, 0.5] },
  angry: { duration: 0.8, yRange: [-2, 2], rotate: [-4, 4] },
  tired: { duration: 5.2, yRange: [0, -1.5], rotate: [-0.5, 0.5] },
};

const Wrapper = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const Image = styled(motion.img)<{ $state: MallangState }>`
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  ${({ $state }) => css`
    filter: ${stateFilter[$state]};
  `}
`;

export function MallangCharacter({ state, size = 220, onClick }: Props) {
  const motionConfig = stateMotion[state];

  return (
    <Wrapper $size={size} onClick={onClick}>
      <Image
        $state={state}
        src={mallangNeutral}
        alt="말랑이"
        draggable={false}
        animate={{
          y: motionConfig.yRange,
          rotate: motionConfig.rotate,
        }}
        transition={{
          duration: motionConfig.duration,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
        whileTap={{ scale: 0.94 }}
      />
    </Wrapper>
  );
}
