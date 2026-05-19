import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import type {
  MallangPersona,
  MallangState,
} from '../../../../shared/types/domain';
import joyAnimation from '../../../assets/animations/joy.json';
import mallangNeutral from '../../../assets/mallang/neutral.png';

interface Props {
  state: MallangState;
  persona?: MallangPersona;
  size?: number;
  /** 채팅 응답을 기다리는 동안 캐릭터가 살아있어 보이도록 켜는 플래그. */
  isBusy?: boolean;
  onClick?: () => void;
}

/** 클릭 직후 캐릭터가 살짝 흔들리고 가라앉기까지 유지하는 시간. */
const CLICK_ACTIVE_MS = 1200;

const stateFilter: Record<MallangState, string> = {
  neutral: '',
  happy: 'brightness(1.05) saturate(1.15) hue-rotate(-8deg)',
  sad: 'brightness(0.92) saturate(0.7) hue-rotate(18deg)',
  angry: 'brightness(0.98) saturate(1.4) hue-rotate(-26deg)',
  tired: 'brightness(0.88) saturate(0.75) hue-rotate(12deg)',
};

const personaFilter: Record<MallangPersona, string> = {
  rest: '',
  workout: 'saturate(1.2) hue-rotate(-14deg) brightness(1.02)',
  'self-development': 'saturate(0.95) hue-rotate(28deg) brightness(0.98)',
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

const Image = styled(motion.img)<{ $filter: string }>`
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  ${({ $filter }) => css`
    filter: ${$filter || 'none'};
  `}
`;

/**
 * happy 상태일 때 띄우는 Lottie 컨테이너.
 * Lottie 자체가 자체 모션을 갖고 있으니 framer-motion 부유 모션은 입히지 않고,
 * persona별 색감 필터만 살려 캐릭터의 톤을 유지한다.
 */
const LottieBox = styled.div<{ $filter: string }>`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  pointer-events: none; /* 클릭은 Wrapper가 가로챈다. */
  ${({ $filter }) => css`
    filter: ${$filter || 'none'};
  `}

  & > div {
    width: 100%;
    height: 100%;
  }

  svg {
    width: 100%;
    height: 100%;
  }
`;

export function MallangCharacter({
  state,
  persona = 'rest',
  size = 280,
  isBusy = false,
  onClick,
}: Props) {
  const motionConfig = stateMotion[state];
  const combinedFilter = [stateFilter[state], personaFilter[persona]]
    .filter(Boolean)
    .join(' ');

  // 평소엔 가만히 두고, 사용자 인터랙션(클릭) 직후와 응답 생성 중에만 부유 모션을 켠다.
  const [clickActive, setClickActive] = useState(false);
  useEffect(() => {
    if (!clickActive) return;
    const id = window.setTimeout(() => setClickActive(false), CLICK_ACTIVE_MS);
    return () => window.clearTimeout(id);
  }, [clickActive]);

  const animating = clickActive || isBusy;

  const handleClick = () => {
    setClickActive(true);
    onClick?.();
  };

  return (
    <Wrapper $size={size} onClick={handleClick}>
      {state === 'happy' ? (
        <LottieBox
          $filter={personaFilter[persona] ?? ''}
          aria-label="말랑이 (기쁨)"
        >
          <Lottie animationData={joyAnimation} loop autoplay />
        </LottieBox>
      ) : (
        <Image
          $filter={combinedFilter}
          src={mallangNeutral}
          alt="말랑이"
          draggable={false}
          animate={
            animating
              ? { y: motionConfig.yRange, rotate: motionConfig.rotate }
              : { y: 0, rotate: 0 }
          }
          transition={
            animating
              ? {
                  duration: motionConfig.duration,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                }
              : { duration: 0.4, ease: 'easeOut' }
          }
          whileTap={{ scale: 0.94 }}
        />
      )}
    </Wrapper>
  );
}
