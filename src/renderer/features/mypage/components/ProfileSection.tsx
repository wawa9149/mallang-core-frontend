import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  MALLANG_PERSONA_LABEL,
  type MallangPersona,
  type UserProfile,
} from '../../../../shared/types/domain';
import { updateMe } from '../../../shared/api/users-api';
import { syncSchedulerFromStores } from '../../../shared/scheduler/sync';
import { useAuthStore } from '../../../shared/stores/auth-store';
import { useUserProfileStore } from '../../../shared/stores/user-profile-store';
import { signOutAndReturnToLogin } from '../../../shared/window/sign-out';
import { NotificationToggle } from './NotificationToggle';
import { OpenAiKeySection } from './OpenAiKeySection';
import { TeamLocationSection } from './TeamLocationSection';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-app-region: no-drag;
`;

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Input = styled.input`
  min-height: 40px;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0 14px;
  background: ${({ theme }) => theme.brand.inputBg};
  color: ${({ theme }) => theme.brand.inputText};
  font-size: 14px;
  font-family: inherit;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.brand.inputPlaceholder};
  }

  &:focus {
    border-color: ${({ theme }) => theme.brand.primary};
  }
`;

const Select = styled.select`
  min-height: 40px;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0 14px;
  background: ${({ theme }) => theme.brand.inputBg};
  color: ${({ theme }) => theme.brand.inputText};
  font-size: 14px;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.brand.primary};
  }
`;

const TimeRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

const TimeInput = styled(Input)`
  text-align: center;
  padding: 0 6px;

  &::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
`;

const SaveButton = styled.button<{ $saved?: boolean }>`
  min-height: 54px;
  flex-shrink: 0;
  border-radius: 16px;
  background: ${({ theme, $saved }) =>
    $saved ? theme.colors.success : theme.brand.primary};
  color: ${({ theme }) => theme.brand.promptText};
  font-size: 14px;
  font-weight: 700;
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    background-color 200ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $saved }) =>
      $saved ? theme.colors.success : theme.brand.primaryHover};
  }
  &:active:not(:disabled) {
    transform: scale(0.99);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  margin: -4px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 12px;
  font-weight: 600;
  text-align: center;
`;

const SignOutButton = styled.button`
  min-height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 12px;
  font-weight: 600;
  -webkit-app-region: no-drag;

  &:hover {
    background: ${({ theme }) => theme.colors.dangerSurface};
  }
  &:active {
    transform: scale(0.99);
  }
`;

const EMPTY_DRAFT: UserProfile = {
  name: '',
  team: '',
  workStartTime: '09:00',
  lunchTime: '12:30',
  workEndTime: '18:00',
  hobby: 'rest',
  allergies: '',
};

const HOBBY_OPTIONS: MallangPersona[] = ['rest', 'workout', 'self-development'];

function readErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data?.message.join(', ');
  }
  if (error instanceof Error) return error.message;
  return '저장 중 오류가 발생했어. 잠시 후 다시 시도해 줘.';
}

export function ProfileSection() {
  const profile = useUserProfileStore((state) => state.profile);
  const setProfile = useUserProfileStore((state) => state.setProfile);
  const setUser = useAuthStore((state) => state.setUser);
  const [draft, setDraft] = useState<UserProfile>(profile ?? EMPTY_DRAFT);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const handleChange =
    <K extends keyof UserProfile>(key: K) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setErrorMessage(null);
      setDraft((prev) => ({
        ...prev,
        [key]: event.target.value as UserProfile[K],
      }));
    };

  const saveMutation = useMutation({
    mutationFn: (input: UserProfile) =>
      updateMe({
        name: input.name,
        teamName: input.team,
        workStartTime: input.workStartTime,
        lunchTime: input.lunchTime,
        workEndTime: input.workEndTime,
        hobby: input.hobby,
        allergies: input.allergies,
      }),
    onSuccess: ({ user }, input) => {
      setUser(user);
      setProfile(input);
      setSaved(true);
      // 시간 설정이 바뀌었을 가능성이 있으니 메인 프로세스 스케줄러에 최신 값을 전달한다.
      void syncSchedulerFromStores();
    },
    onError: (error) => {
      setErrorMessage(readErrorMessage(error));
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    saveMutation.mutate(draft);
  };

  const handleSignOut = () => {
    signOutAndReturnToLogin().catch((error) => {
      console.error('[mypage] sign out failed', error);
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FieldLabel>
        이름
        <Input
          value={draft.name}
          onChange={handleChange('name')}
          placeholder="이름"
          maxLength={16}
        />
      </FieldLabel>
      <FieldLabel>
        팀 이름
        <Input
          value={draft.team}
          onChange={handleChange('team')}
          placeholder="팀 이름"
          maxLength={30}
        />
      </FieldLabel>
      <TimeRow>
        <FieldLabel>
          출근 시간
          <TimeInput
            type="time"
            value={draft.workStartTime}
            onChange={handleChange('workStartTime')}
          />
        </FieldLabel>
        <FieldLabel>
          점심 시간
          <TimeInput
            type="time"
            value={draft.lunchTime}
            onChange={handleChange('lunchTime')}
          />
        </FieldLabel>
        <FieldLabel>
          퇴근 시간
          <TimeInput
            type="time"
            value={draft.workEndTime}
            onChange={handleChange('workEndTime')}
          />
        </FieldLabel>
      </TimeRow>
      <FieldLabel>
        취미
        <Select value={draft.hobby} onChange={handleChange('hobby')}>
          {HOBBY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {MALLANG_PERSONA_LABEL[value]}
            </option>
          ))}
        </Select>
      </FieldLabel>
      <FieldLabel>
        못 먹는 음식
        <Input
          value={draft.allergies}
          onChange={handleChange('allergies')}
          placeholder="없으면 비워둬도 돼"
          maxLength={60}
        />
      </FieldLabel>
      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      <SaveButton
        type="submit"
        $saved={saved}
        disabled={saveMutation.isPending}
      >
        {saved ? (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M2.5 7.5L5.5 10.5L11.5 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            저장 완료
          </>
        ) : saveMutation.isPending ? (
          '저장 중…'
        ) : (
          '저장'
        )}
      </SaveButton>
      <NotificationToggle />
      <TeamLocationSection />
      <OpenAiKeySection />
      <SignOutButton type="button" onClick={handleSignOut}>
        로그아웃
      </SignOutButton>
    </Form>
  );
}
