import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  ScheduledIntent,
  SchedulerIntentFiredPayload,
} from '../../../shared/ipc/channels';
import type { MallangPersona } from '../../../shared/types/domain';
import bgRest from '../../assets/backgrounds/rest.png';
import bgSelfDevelopment from '../../assets/backgrounds/self-development.png';
import bgWorkout from '../../assets/backgrounds/workout.png';
import { fetchMe } from '../../shared/api/auth-api';
import { sendChat, triggerScheduledPrompt } from '../../shared/api/chats-api';
import { hobbyToPersona } from '../../shared/api/mappers';
import type { BackendChatIntent, BackendEmotion } from '../../shared/api/types';
import { syncSchedulerFromStores } from '../../shared/scheduler/sync';
import { useAuthStore } from '../../shared/stores/auth-store';
import { useMallangStore } from '../../shared/stores/mallang-store';
import { useUserProfileStore } from '../../shared/stores/user-profile-store';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { MallangCharacter } from './components/MallangCharacter';
import { pickClickMessage } from './data/click-messages';
import { pickGreeting } from './data/greetings';

/**
 * 사용자의 취미(hobby)에 따라 말랑이 창 뒤에 깔리는 배경.
 * 온보딩에서 고른 취미와 1:1로 매핑된다.
 */
const PERSONA_BACKGROUND: Record<MallangPersona, string> = {
  workout: bgWorkout,
  'self-development': bgSelfDevelopment,
  rest: bgRest,
};

const MAX_PROMPT_LENGTH = 30;

/**
 * 스케줄러 first-turn 질문에 대한 follow-up 라우팅 유효 시간(ms).
 * - 말랑이가 "출근했어?"를 던졌는데 사용자가 30분이 지나도록 답을 안 하면,
 *   그 한참 뒤의 발화가 morning_check 처럼 라우팅되지 않도록 만료시킨다.
 * - 시스템 슬립/복구를 견디기 위해 setTimeout 이 아니라 절대 시각(Date.now() 비교) 으로 관리한다.
 */
const PENDING_FOLLOWUP_TTL_MS = 30 * 60 * 1000;

// 백엔드 Emotion enum과 프론트 MallangState가 1:1로 매핑돼서 단순 캐스팅이지만,
// 타입 안전을 위해 한 곳에 두고 명시적으로 통과시킨다.
function emotionToMallangState(emotion: BackendEmotion) {
  return emotion;
}

function readErrorReply(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: unknown } | undefined;
    if (status === 400 && typeof data?.message === 'string')
      return data.message;
    if (status === 503) return '잠시 후 다시 말 걸어 줘.';
  }
  return '음… 지금은 답하기가 어려워.';
}

const INTENT_NOTIFICATION_TITLE: Record<ScheduledIntent, string> = {
  morning_check: '말랑이 · 출근 체크',
  lunch_alert: '말랑이 · 점심 10분 전',
  lunch_review: '말랑이 · 점심 어땠어?',
  evening_check: '말랑이 · 퇴근 체크',
};

const Overlay = styled.div<{ $bgUrl: string | null }>`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 20px 20px;
  gap: 16px;
  /*
   * 취미별 배경 이미지가 있으면 그 위에 흰색 톤을 살짝 덧깔아 가독성을 확보한다.
   * 이미지가 없으면(=온보딩 전 등) 그냥 테마 배경색만.
   */
  background: ${({ $bgUrl, theme }) =>
    $bgUrl
      ? `linear-gradient(
          to bottom,
          color-mix(in srgb, white 40%, transparent),
          color-mix(in srgb, white 10%, transparent)
        ), url(${$bgUrl}) center/cover no-repeat, ${theme.brand.background}`
      : theme.brand.background};
  transition: background 240ms ease;
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
  /* 상단 Controls 바(top 8px + IconButton 24px)와 겹치지 않도록 그 아래에서 시작한다. */
  top: 40px;
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
  overflow-wrap: anywhere;
  pointer-events: none;
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
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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
  const {
    state,
    persona,
    recentBubble,
    bubblePersistent,
    isOnboarded,
    setBubble,
  } = useMallangStore();
  const setMallangState = useMallangStore((s) => s.setState);
  const profile = useUserProfileStore((s) => s.profile);
  const setProfile = useUserProfileStore((s) => s.setProfile);
  const updateProfile = useUserProfileStore((s) => s.updateProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const onboardingComplete = isOnboarded || profile !== null;
  const effectivePersona = profile?.hobby ?? persona;
  const [prompt, setPrompt] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const meSyncedRef = useRef(false);
  const greetedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * 스케줄러가 발사한 first-turn(말랑이가 먼저 던진 질문) 의 후속 응답을 어디로 라우팅할지 기록한다.
   * - 값이 있고 expiresAt 이 아직 미래면: 사용자가 다음에 입력하는 발화를 이 intent 로 백엔드에 보내 leftOffice 등 추론을 받는다.
   * - 사용자가 한 번 답변하면 즉시 비워 다음 발화는 일반 'free' 로 돌아간다.
   * - 30분(=PENDING_FOLLOWUP_TTL_MS) 이 지나도록 답이 없으면 만료시켜, 한참 뒤의 발화가 엉뚱한 intent 로 라우팅되지 않도록 한다.
   *   타임스탬프 기반이라 시스템 슬립/복구 시에도 정확하다.
   * 렌더링과 무관한 일회성 라우팅 신호라 useRef 로 둔다.
   */
  const pendingFollowUpIntentRef = useRef<{
    intent: BackendChatIntent;
    expiresAt: number;
  } | null>(null);

  const focusPromptInput = () => {
    // disabled 토글 직후 React가 포커스를 복구하지 않으니, microtask 한 번 미뤄 안전하게 호출한다.
    queueMicrotask(() => {
      inputRef.current?.focus();
    });
  };

  interface ChatMutationVariables {
    content: string;
    intent?: BackendChatIntent;
  }

  const chatMutation = useMutation({
    mutationFn: ({ content, intent }: ChatMutationVariables) =>
      sendChat(content, intent ?? 'free'),
    onSuccess: (turn) => {
      // 사용자의 발화에 대한 follow-up 응답은 일반 대화처럼 4초 후 자동으로 사라진다.
      setBubble(turn.assistantMessage.content);
      setMallangState(emotionToMallangState(turn.emotion.emotion));
    },
    onError: (error) => {
      setBubble(readErrorReply(error));
    },
    onSettled: () => {
      // 응답 사이클(성공/실패 모두) 끝나면 곧장 다음 발화를 칠 수 있도록 포커스를 되살린다.
      focusPromptInput();
    },
  });

  interface ScheduledPromptMutationVariables {
    intent: ScheduledIntent;
    notificationTitle: string;
  }

  /**
   * 스케줄러로 발사된 first-turn 호출.
   * - 백엔드는 사용자 답변 없이 LLM 으로 "질문만" 만들어 돌려준다.
   * - 응답이 오면 말풍선에 persistent=true 로 띄워 사용자가 답하기 전까지 유지한다.
   * - pendingFollowUpIntentRef 를 세팅해, 사용자의 다음 발화는 같은 intent 로 보내 leftOffice 등을 추론하게 한다.
   */
  const scheduledPromptMutation = useMutation({
    mutationFn: ({ intent }: ScheduledPromptMutationVariables) =>
      triggerScheduledPrompt(intent),
    onSuccess: (assistantMessage, variables) => {
      setBubble(assistantMessage.content, { persistent: true });
      // 다음에 사용자가 어떤 발화를 하든 이 intent 로 백엔드에 보내 답변을 평가받는다.
      // 단, 30분 이내에 답한 발화만 follow-up 으로 라우팅한다(그 이상은 만료).
      pendingFollowUpIntentRef.current = {
        intent: variables.intent,
        expiresAt: Date.now() + PENDING_FOLLOWUP_TTL_MS,
      };
      void window.mallang?.notification
        .show({
          title: variables.notificationTitle,
          body: assistantMessage.content,
        })
        .catch((error) => {
          console.error('[mallang] notification show failed', error);
        });
    },
    onError: (error) => {
      setBubble(readErrorReply(error));
    },
    onSettled: () => {
      focusPromptInput();
    },
  });

  useEffect(() => {
    if (!recentBubble) return;
    // 1) 말랑이가 먼저 던진 질문은 사용자가 답하기 전까지 유지한다.
    // 2) 응답 대기 중('…')일 때도 사라지지 않아야 사용자가 발화 결과를 놓치지 않는다.
    if (bubblePersistent) return;
    if (chatMutation.isPending) return;
    const timer = setTimeout(() => setBubble(null), 4000);
    return () => clearTimeout(timer);
  }, [recentBubble, bubblePersistent, chatMutation.isPending, setBubble]);

  // 앱에 접속한 직후 말랑이가 먼저 인사를 건넨다.
  // - 한 세션 동안 한 번만 발사하기 위해 ref 로 가드한다.
  // - fetchMe 가 끝나기 전이라도 useAuthStore.user.name 은 로그인 응답에서 이미 채워져 있어 그대로 쓴다.
  // - 마운트 직후 곧장 띄우면 컴포넌트 전환 깜빡임과 겹치므로 약간(400ms) 늦춰서 자연스럽게 띄운다.
  useEffect(() => {
    if (!onboardingComplete) return;
    if (greetedRef.current) return;
    greetedRef.current = true;
    const userName = useAuthStore.getState().user?.name;
    const greeting = pickGreeting({
      hour: new Date().getHours(),
      name: userName ?? undefined,
    });
    const id = window.setTimeout(() => {
      setBubble(greeting);
    }, 400);
    return () => window.clearTimeout(id);
  }, [onboardingComplete, setBubble]);

  // 다른 창에서 말랑이 창으로 돌아왔을 때 매번 입력창을 클릭해야 하는 불편을 없앤다.
  // 창이 포커스를 받는 순간 채팅 입력창에 자동으로 캐럿을 위치시킨다.
  useEffect(() => {
    if (!onboardingComplete) return;
    const handleWindowFocus = () => {
      // 사용자가 다른 input(예: 호버 패널 내부)에 의도적으로 포커스 둔 상태라면 빼앗지 않는다.
      const active = document.activeElement;
      if (
        active &&
        active !== document.body &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }
      inputRef.current?.focus();
    };
    window.addEventListener('focus', handleWindowFocus);
    // 첫 마운트(=온보딩 막 끝났거나 자동 로그인)에서도 즉시 캐럿 배치.
    handleWindowFocus();
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [onboardingComplete]);

  // 캐릭터 창이 뜨면 한 번 GET /auth/me 로 서버의 최신 프로필을 끌어와서
  // 영속된 토큰이 살아 있는지 확인하면서 auth/user-profile store를 동기화한다.
  // 401이 떨어지면 http 인터셉터가 refresh → 실패 시 store 비우기까지 처리해 준다.
  useEffect(() => {
    if (meSyncedRef.current) return;
    meSyncedRef.current = true;
    fetchMe()
      .then(({ user, raw }) => {
        setUser(user);
        // 백엔드 user 응답 기준으로 "온보딩을 마친 사용자"인지 재확인한다.
        // login 호출 시점에 setOnboarded(true) 가 누락됐거나, 자동 로그인 경로(앱 재시작)
        // 처럼 login 함수 자체를 거치지 않은 경우에도 여기서 보정해 OnboardingFlow 를 건너뛴다.
        const onboarded = raw.name.trim().length > 0 && Boolean(raw.teamId);
        if (import.meta.env.DEV) {
          console.info(
            '[mallang] /auth/me sync — name=',
            JSON.stringify(raw.name),
            'teamId=',
            raw.teamId,
            'onboarded=',
            onboarded,
          );
        }
        if (onboarded && !useMallangStore.getState().isOnboarded) {
          useMallangStore.getState().setOnboarded(true);
        }
        const currentProfile = useUserProfileStore.getState().profile;
        if (currentProfile) {
          updateProfile({
            name: raw.name,
            workStartTime: raw.workStartTime,
            lunchTime: raw.lunchTime,
            workEndTime: raw.workEndTime,
            hobby: hobbyToPersona(raw.hobby),
            allergies: raw.allergies ?? '',
          });
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('[mallang] /auth/me sync failed', error);
        }
      })
      .finally(() => {
        // 프로필이 준비된 직후 메인 프로세스 스케줄러에 시간 설정을 전달해 둔다.
        void syncSchedulerFromStores();
      });
    // 마운트 한 번만 실행. profile/store 핸들은 effect 안에서 최신 값을 참조해도 무방.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 메인 프로세스 스케줄러가 도래한 intent 신호를 보내오면, 백엔드 first-turn 흐름으로
  // "말랑이가 먼저 질문" 을 받아 와 말풍선에 띄우고, OS 배너에도 같은 질문을 띄운다.
  // 그 다음 사용자의 답변은 sendPrompt 에서 pendingFollowUpIntentRef 를 통해
  // 같은 intent 로 백엔드에 보내져 leftOffice 등을 추론하게 된다.
  useEffect(() => {
    if (!onboardingComplete) return;
    if (!window.mallang) return;
    const unsubscribe = window.mallang.scheduler.onIntentFired(
      (payload: SchedulerIntentFiredPayload) => {
        const intent = payload.intent;
        setBubble('…');
        scheduledPromptMutation.mutate({
          intent,
          notificationTitle: INTENT_NOTIFICATION_TITLE[intent],
        });
      },
    );
    return unsubscribe;
    // mutate 함수만 사용하므로 mutation 객체 자체는 의존성에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingComplete]);

  // 다른 BrowserWindow(특히 마이페이지) 에서 프로필이 갱신되면 메인이 broadcast 해 주는 신호.
  // 같은 사용자의 zustand store 가 창마다 독립이라 이걸 받아야 말랑이 창의 hobby/배경/시간 등이
  // 즉시 따라 바뀐다.
  useEffect(() => {
    if (!window.mallang) return;
    const unsubscribe = window.mallang.profile.onUpdated((next) => {
      setProfile(next);
      // 시간 설정도 함께 바뀌었을 수 있으니 메인 프로세스 스케줄러에도 최신 값을 동기화한다.
      void syncSchedulerFromStores();
    });
    return unsubscribe;
  }, [setProfile]);

  const handleClick = () => {
    setBubble(pickClickMessage(state));
  };

  const sendPrompt = () => {
    const value = prompt.trim();
    if (!value || chatMutation.isPending) return;
    setPrompt('');
    setBubble('…');
    // 스케줄러 first-turn 으로 받은 질문에 사용자가 처음 답하는 경우라면,
    // 같은 intent 로 백엔드에 보내 leftOffice 같은 평가를 받게 한다.
    // 단, 30분(=PENDING_FOLLOWUP_TTL_MS) 이 지나면 만료된 것으로 보고 일반 'free' 대화로 전송한다.
    const pending = pendingFollowUpIntentRef.current;
    pendingFollowUpIntentRef.current = null;
    const followUpIntent =
      pending && pending.expiresAt > Date.now() ? pending.intent : null;
    chatMutation.mutate({
      content: value,
      intent: followUpIntent ?? 'free',
    });
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

  // 온보딩 중에는 취미가 확정되지 않았을 수 있으므로 배경 이미지를 깔지 않는다.
  const backgroundUrl = onboardingComplete
    ? (PERSONA_BACKGROUND[effectivePersona] ?? null)
    : null;

  if (!onboardingComplete) {
    return (
      <Overlay $bgUrl={null}>
        <OnboardingFlow />
      </Overlay>
    );
  }

  return (
    <Overlay $bgUrl={backgroundUrl}>
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
          size={280}
          isBusy={chatMutation.isPending}
          isSpeaking={Boolean(recentBubble)}
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
          ref={inputRef}
          value={prompt}
          onChange={(event) =>
            setPrompt(event.target.value.slice(0, MAX_PROMPT_LENGTH))
          }
          onKeyDown={handlePromptKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={
            chatMutation.isPending
              ? '말랑이가 생각 중… (다음 말 미리 써둬도 돼)'
              : '말 걸어봐 (30자 이내)'
          }
          maxLength={MAX_PROMPT_LENGTH}
          autoFocus
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
