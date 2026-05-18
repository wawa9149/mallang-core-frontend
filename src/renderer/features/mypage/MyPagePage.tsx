import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  MALLANG_PERSONA_LABEL,
  type MallangPersona,
  type UserProfile,
} from '../../../shared/types/domain';
import { CloseButton } from '../../shared/components/CloseButton';
import { useEscapeToClose } from '../../shared/hooks/useEscapeToClose';
import { useUserProfileStore } from '../../shared/stores/user-profile-store';
import { signOutAndReturnToLogin } from '../../shared/window/sign-out';

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.brand.background};
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  -webkit-app-region: drag;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
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
  height: 40px;
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
  height: 40px;
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

  /* Chromium 기본으로 들어가는 시계 picker 아이콘을 숨긴다. */
  &::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
`;

const SaveButton = styled.button<{ $saved?: boolean }>`
  height: 48px;
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

  &:hover {
    background: ${({ theme, $saved }) =>
      $saved ? theme.colors.success : theme.brand.primaryHover};
  }
  &:active {
    transform: scale(0.99);
  }
`;

const SignOutButton = styled.button`
  height: 36px;
  border-radius: 12px;
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

export function MyPagePage() {
  const profile = useUserProfileStore((state) => state.profile);
  const setProfile = useUserProfileStore((state) => state.setProfile);
  const [draft, setDraft] = useState<UserProfile>(profile ?? EMPTY_DRAFT);
  const [saved, setSaved] = useState(false);

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
      setDraft((prev) => ({
        ...prev,
        [key]: event.target.value as UserProfile[K],
      }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: PATCH /users/me 로 교체
    setProfile(draft);
    setSaved(true);
  };

  const handleSignOut = () => {
    signOutAndReturnToLogin().catch((error) => {
      console.error('[mypage] sign out failed', error);
    });
  };

  const handleClose = () => {
    window.mallang?.window.closeMyPage().catch((error) => {
      console.error('[mypage] close failed', error);
    });
  };

  useEscapeToClose(handleClose);

  return (
    <Page>
      <CloseButton onClick={handleClose} />
      <Title>마이페이지</Title>
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
        <SaveButton type="submit" $saved={saved}>
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
          ) : (
            '저장'
          )}
        </SaveButton>
        <SignOutButton type="button" onClick={handleSignOut}>
          로그아웃
        </SignOutButton>
      </Form>
    </Page>
  );
}
