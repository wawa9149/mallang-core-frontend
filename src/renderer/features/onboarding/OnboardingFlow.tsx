import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import styled from 'styled-components';
import type { MallangPersona } from '../../../shared/types/domain';
import { MallangCharacter } from '../mallang/components/MallangCharacter';
import {
  DEFAULT_SEARCH_RADIUS_METERS,
  updateTeamLocation,
} from '../../shared/api/teams-api';
import { setOpenAiKey, updateMe } from '../../shared/api/users-api';
import { useAuthStore } from '../../shared/stores/auth-store';
import { useMallangStore } from '../../shared/stores/mallang-store';
import { useUserProfileStore } from '../../shared/stores/user-profile-store';
import {
  ChoiceInput,
  ConfirmInput,
  TextInput,
  TimeTripleInput,
} from './components/inputs';
import { useOnboardingStore } from './onboarding-store';
import { ONBOARDING_STEPS, summarizeAnswers } from './steps';

function readError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data?.message.join(', ');
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 20px 20px;
`;

const CharacterArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 입력 영역이 절대 위치로 떠 있어서 말랑이는 자기 자리를 그대로 지킨다.
     말랑이 사이즈(280) + 말풍선 + 하단 입력 겹침을 고려해 가운데를 유지한다. */
`;

/**
 * 하단 입력/요약 영역.
 * absolute 로 띄워서 입력이 늘어나도 말랑이가 위로 밀려나지 않게 한다.
 * 사용자가 의도적으로 "말랑이를 가려도 OK" 라고 했기 때문에 z-index 로 말랑이 위에 올린다.
 */
const BottomArea = styled.div`
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 3;
`;

const Bubble = styled(motion.div)`
  position: absolute;
  top: 20px;
  left: 16px;
  max-width: calc(100% - 96px);
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
    /* 말풍선 너비가 변해도 꼬리 위치가 흔들리지 않도록 좌측 기준으로 고정한다. */
    left: 24px;
    width: 18px;
    height: 14px;
    background: inherit;
    /* 꼬리 끝이 우측 하단을 가리키도록 폴리곤의 하단 꼭짓점을 오른쪽(70%)으로 둔다. */
    clip-path: polygon(0 0, 100% 0, 70% 100%);
  }
`;

const ErrorMessage = styled.p`
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 12px;
  font-weight: 600;
  text-align: center;
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
  const { persona, setPersona } = useMallangStore();
  const setProfile = useUserProfileStore((state) => state.setProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitMutation = useMutation({
    /**
     * 온보딩에서 모은 정보를 백엔드로 일괄 전송한다.
     *  1) updateMe : 기본 프로필(이름/팀/시간/취미/알러지). 팀이 새로 만들어지는 경우 여기서 생성된다.
     *  2) updateTeamLocation : 회사 도로명 주소. 반경은 사용자에게 노출 안 하고 500m 로 고정.
     *  3) setOpenAiKey : 말랑이 두뇌 키. 빠지면 채팅이 동작하지 않으므로 필수로 받는다.
     * 부분 실패가 나면 그 단계에서 throw 해서 사용자에게 그 단계 메시지로 알리고,
     * "맞아!" 를 다시 누르면 idempotent 하게 처음부터 다시 시도된다.
     */
    mutationFn: async () => {
      const hobby = answers.hobby ?? 'rest';
      let lastUser;
      try {
        const result = await updateMe({
          name: answers.name,
          teamName: answers.team,
          workStartTime: answers.workStart,
          lunchTime: answers.lunch,
          workEndTime: answers.workEnd,
          hobby,
          allergies: answers.allergies,
        });
        lastUser = result.user;
      } catch (error) {
        throw new Error(readError(error, '기본 정보를 저장하지 못했어.'));
      }

      try {
        await updateTeamLocation({
          address: answers.address.trim(),
          searchRadiusMeters: DEFAULT_SEARCH_RADIUS_METERS,
        });
      } catch (error) {
        throw new Error(readError(error, '회사 주소를 저장하지 못했어.'));
      }

      try {
        const result = await setOpenAiKey(answers.apiKey.trim());
        lastUser = result.user;
      } catch (error) {
        throw new Error(readError(error, 'OpenAI 키를 등록하지 못했어.'));
      }

      return { user: lastUser, hobby };
    },
    onSuccess: ({ user, hobby }) => {
      // 백엔드가 user.onboardedAt 을 채워서 응답해 준다. setUser 만 호출하면 그 값이
      // useAuthStore 에 반영되고, MallangOverlayPage 의 onboardingComplete 분기가 자동으로 켜진다.
      setUser(user);
      setProfile({
        name: answers.name,
        team: answers.team,
        workStartTime: answers.workStart,
        lunchTime: answers.lunch,
        workEndTime: answers.workEnd,
        hobby,
        allergies: answers.allergies,
      });
      reset();
    },
    onError: (error) => {
      setSubmitError(
        error instanceof Error
          ? error.message
          : '서버에 답변을 저장하지 못했어. 잠시 후 다시 시도해 줘.',
      );
    },
  });

  const step = ONBOARDING_STEPS[stepIndex];
  if (!step) return null;

  const handleTextSubmit = (value: string) => {
    if (step.id === 'name') {
      updateAnswers({ name: value });
    } else if (step.id === 'allergies') {
      updateAnswers({ allergies: value });
    } else if (step.id === 'team') {
      updateAnswers({ team: value });
    } else if (step.id === 'address') {
      updateAnswers({ address: value });
    } else if (step.id === 'apiKey') {
      updateAnswers({ apiKey: value });
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
    setSubmitError(null);
    submitMutation.mutate();
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
        <MallangCharacter state="neutral" persona={persona} size={280} />
      </CharacterArea>

      <BottomArea>
        {step.type === 'confirm' && (
          <SummaryCard>{summarizeAnswers(answers)}</SummaryCard>
        )}

        {step.type === 'text' && (
          <TextInput
            key={step.id}
            placeholder={step.placeholder}
            maxLength={step.maxLength}
            allowEmpty={step.id === 'allergies' ? step.allowEmpty : false}
            secret={step.id === 'apiKey'}
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
          <>
            {submitError && <ErrorMessage>{submitError}</ErrorMessage>}
            <ConfirmInput
              onYes={handleConfirmYes}
              onNo={handleConfirmNo}
              isSubmitting={submitMutation.isPending}
            />
          </>
        )}
      </BottomArea>
    </Wrapper>
  );
}
