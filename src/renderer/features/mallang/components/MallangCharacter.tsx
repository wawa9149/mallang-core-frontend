import { motion } from 'framer-motion';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type {
  MallangPersona,
  MallangState,
} from '../../../../shared/types/domain';
import angryAnimation from '../../../assets/animations/angry.json';
import defaultAnimation from '../../../assets/animations/default.json';
import joyAnimation from '../../../assets/animations/joy.json';
import sadAnimation from '../../../assets/animations/sad.json';
import tiredAnimation from '../../../assets/animations/tired.json';

interface Props {
  state: MallangState;
  /** 호환을 위해 prop 은 남겨두지만, 표정 Lottie 가 자체 색상을 가지므로 색감 필터로는 쓰지 않는다. */
  persona?: MallangPersona;
  size?: number;
  /** 채팅 응답을 기다리는 동안 캐릭터가 살아있어 보이도록 켜는 플래그. */
  isBusy?: boolean;
  /**
   * 말풍선이 떠 있는 동안 표정 애니메이션을 계속 재생할지 알려주는 플래그.
   * 말풍선이 닫히는 순간 같이 멈춰서 "말이 끝나면 표정도 가라앉는다"는 느낌을 준다.
   */
  isSpeaking?: boolean;
  onClick?: () => void;
}

/** 클릭 직후 캐릭터가 살짝 움직이고 가라앉기까지 유지하는 시간. */
const CLICK_ACTIVE_MS = 1200;

/**
 * state 별 전용 Lottie. 색감/표정이 클립 자체에 들어 있어서 추가 filter는 안 입힌다.
 * neutral 은 평소 정지된 기본 표정으로 쓰고, 나머지 감정은 응답 직후 잠깐 재생되는 표정으로 쓴다.
 */
const stateAnimation: Record<MallangState, object> = {
  neutral: defaultAnimation,
  happy: joyAnimation,
  sad: sadAnimation,
  angry: angryAnimation,
  tired: tiredAnimation,
};

const stateAriaLabel: Record<MallangState, string> = {
  neutral: '말랑이',
  happy: '말랑이 (기쁨)',
  sad: '말랑이 (슬픔)',
  angry: '말랑이 (화남)',
  tired: '말랑이 (피곤)',
};

const Wrapper = styled(motion.div)<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
  display: grid;
  place-items: center;
  cursor: pointer;
`;

/**
 * Lottie 컨테이너. SVG 가 컨테이너에 꽉 차도록 맞춰준다.
 * 표정 Lottie 가 원본 색상을 그대로 보여줘야 칙칙해 보이지 않으므로 색감 필터는 입히지 않는다.
 * 클릭은 Wrapper 가 가로채야 하므로 내부 pointer-events 는 끈다.
 */
const LottieBox = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  pointer-events: none;

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
  // persona 는 호환을 위해 받기만 하고 시각적으로는 사용하지 않는다.
  persona: _persona = 'rest',
  size = 280,
  isBusy = false,
  isSpeaking = false,
  onClick,
}: Props) {
  // 평소엔 가만히 두고, 사용자 인터랙션(클릭) 직후와 응답 생성 중·말풍선이 떠 있는 동안에만 Lottie 를 재생한다.
  const [clickActive, setClickActive] = useState(false);
  useEffect(() => {
    if (!clickActive) return;
    const id = window.setTimeout(() => setClickActive(false), CLICK_ACTIVE_MS);
    return () => window.clearTimeout(id);
  }, [clickActive]);

  // 표정 상태(happy/sad/...) 가 유지되더라도 말풍선이 닫히면 표정 애니메이션도 같이 멈춘다.
  // 즉 재생 트리거는 "지금 말랑이가 말/반응을 하고 있는가" 한 가지 신호로 통일한다.
  const animating = clickActive || isBusy || isSpeaking;

  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  // animating 상태가 바뀔 때마다 Lottie 재생/정지를 동기화한다.
  // state 가 바뀌면 animationData 변경으로 Lottie 가 재마운트되므로,
  // 그 직후에도 한 번 더 동기화해 새 클립이 의도대로 정지/재생 상태로 시작하게 한다.
  useEffect(() => {
    const lottie = lottieRef.current;
    if (!lottie) return;
    if (animating) {
      lottie.play();
    } else {
      lottie.goToAndStop(0, true);
    }
  }, [animating, state]);

  const handleClick = () => {
    setClickActive(true);
    onClick?.();
  };

  return (
    <Wrapper
      $size={size}
      onClick={handleClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      <LottieBox aria-label={stateAriaLabel[state]}>
        <Lottie
          lottieRef={lottieRef}
          animationData={stateAnimation[state]}
          loop
          autoplay={animating}
        />
      </LottieBox>
    </Wrapper>
  );
}
