import { AnimatePresence, motion } from 'framer-motion';
import styled from 'styled-components';
import type { MallangPersona } from '../../../shared/types/domain';
import { MallangCharacter } from '../mallang/components/MallangCharacter';
import { useMallangStore } from '../../shared/stores/mallang-store';
import {
  ChoiceInput,
  ConfirmInput,
  TextInput,
  TimeTripleInput,
} from './components/inputs';
import { useOnboardingStore } from './onboarding-store';
import { ONBOARDING_STEPS, summarizeAnswers } from './steps';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 20px 20px;
  gap: 16px;
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

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.brand.bubble};
  color: ${({ theme }) => theme.brand.bubbleText};
  border-radius: 16px;
  padding: 14px 18px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  white-space: pre-wrap;
`;

export function OnboardingFlow() {
  const { stepIndex, answers, updateAnswers, next, reset } =
    useOnboardingStore();
  const { persona, setPersona, setOnboarded } = useMallangStore();

  const step = ONBOARDING_STEPS[stepIndex];
  if (!step) return null;

  const handleTextSubmit = (value: string) => {
    if (step.id === 'name') {
      updateAnswers({ name: value });
    } else if (step.id === 'allergies') {
      updateAnswers({ allergies: value });
    } else if (step.id === 'team') {
      updateAnswers({ team: value });
    }
    next();
  };

  const handleTimeSubmit = (values: {
    workStart: string;
    lunch: string;
    workEnd: string;
  }) => {
    updateAnswers(values);
    next();
  };

  const handleChoiceSubmit = (value: string) => {
    if (step.id === 'hobby') {
      const nextPersona = value as MallangPersona;
      updateAnswers({ hobby: nextPersona });
      setPersona(nextPersona);
    }
    next();
  };

  const handleConfirmYes = () => {
    // TODO: POST /users/onboarding 으로 답변 전송
    setOnboarded(true);
    reset();
  };

  const handleConfirmNo = () => {
    reset();
  };

  return (
    <Wrapper>
      <CharacterArea>
        <AnimatePresence mode="wait">
          <Bubble
            key={step.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {step.prompt(answers)}
          </Bubble>
        </AnimatePresence>
        <MallangCharacter state="neutral" persona={persona} size={220} />
      </CharacterArea>

      {step.type === 'confirm' && (
        <SummaryCard>{summarizeAnswers(answers)}</SummaryCard>
      )}

      {step.type === 'text' && (
        <TextInput
          key={step.id}
          placeholder={step.placeholder}
          maxLength={step.maxLength}
          allowEmpty={step.id === 'allergies' ? step.allowEmpty : false}
          onSubmit={handleTextSubmit}
        />
      )}

      {step.type === 'time-triple' && (
        <TimeTripleInput onSubmit={handleTimeSubmit} />
      )}

      {step.type === 'choice' && (
        <ChoiceInput options={step.options} onSubmit={handleChoiceSubmit} />
      )}

      {step.type === 'confirm' && (
        <ConfirmInput onYes={handleConfirmYes} onNo={handleConfirmNo} />
      )}
    </Wrapper>
  );
}
