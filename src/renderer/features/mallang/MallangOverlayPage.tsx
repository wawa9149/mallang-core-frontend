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
import { transcribeAudio } from '../../shared/api/stt-api';
import { fetchTeamMembers } from '../../shared/api/teams-api';
import type { BackendChatIntent, BackendEmotion } from '../../shared/api/types';
import {
  fetchTodayWinner,
  checkAlreadyReviewed,
  submitReview,
  type TodayWinner,
} from '../../shared/api/visit-records-api';
import { mallangTtsPlayer } from '../../shared/audio/tts-player';
import { useVoiceRecorder } from '../../shared/audio/use-voice-recorder';
import { syncSchedulerFromStores } from '../../shared/scheduler/sync';
import { useAuthStore } from '../../shared/stores/auth-store';
import { useMallangStore } from '../../shared/stores/mallang-store';
import { useUserProfileStore } from '../../shared/stores/user-profile-store';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { LunchReviewCard } from './components/LunchReviewCard';
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

const MicButton = styled.button<{ $recording?: boolean }>`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme, $recording }) =>
    $recording ? '#e53e3e' : theme.brand.promptBg};
  color: ${({ theme, $recording }) =>
    $recording ? '#fff' : theme.brand.promptText};
  display: grid;
  place-items: center;
  position: relative;
  transition:
    background-color 160ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $recording }) =>
      $recording ? '#c53030' : theme.brand.primaryHover};
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

  /* 녹음 중일 때 부드러운 펄스로 사용자에게 활성 상태를 알린다. */
  ${({ $recording }) =>
    $recording
      ? `
    &::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(229, 62, 62, 0.55);
      animation: mallang-mic-pulse 1.2s ease-out infinite;
      pointer-events: none;
    }
    @keyframes mallang-mic-pulse {
      0% { transform: scale(0.9); opacity: 0.8; }
      100% { transform: scale(1.25); opacity: 0; }
    }
  `
      : ''}
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
    bubbleMute,
    setBubble,
  } = useMallangStore();
  const setMallangState = useMallangStore((s) => s.setState);
  const profile = useUserProfileStore((s) => s.profile);
  const setProfile = useUserProfileStore((s) => s.setProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const authedUser = useAuthStore((s) => s.user);
  // 진실의 출처는 오직 백엔드 user.onboardedAt.
  // useAuthStore 는 persist + storage 이벤트 동기화가 이미 걸려 있어 멀티 윈도우에서도 즉시 따라간다.
  // 과거에는 profile != null 도 OR 로 인정했는데, fetchMe 직후 빈 프로필을 setProfile 해 두는
  // 동작과 맞물려 회원가입 직후 새 사용자에게도 onboardingComplete=true 가 박혀 OnboardingFlow 가
  // 떠야 할 자리에 메인 채팅 화면이 떠 버렸다. DB 의 onboardedAt 만 본다.
  const onboardingComplete = Boolean(authedUser?.onboardedAt);
  const effectivePersona = profile?.hobby ?? persona;
  const [prompt, setPrompt] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  // 음성 인식 호출이 진행 중인 동안(STT 업스트림 대기) MicButton 을 잠가 둔다.
  const [isTranscribing, setIsTranscribing] = useState(false);
  const voiceRecorder = useVoiceRecorder();

  // 점심 리뷰 카드 상태
  const [reviewWinner, setReviewWinner] = useState<TodayWinner | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const meSyncedRef = useRef(false);
  /**
   * GET /auth/me 로 서버 진실(onboardedAt 포함) 을 확인한 뒤에야 true 가 된다.
   * useAuthStore 가 persist 로 user 를 복원하긴 하지만, 다른 창에서 PATCH 가 일어났을
   * 경우의 lag 를 막기 위해 fetchMe 응답을 기다린 뒤에야 OnboardingFlow 분기를 허용한다.
   */
  const [meSynced, setMeSynced] = useState(false);
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
      setBubble(turn.assistantMessage.content);
      setMallangState(emotionToMallangState(turn.emotion.emotion));
      lastEmotionRef.current = {
        emotion: turn.emotion.emotion,
        score: turn.emotion.score,
      };
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

      // lunch_review가 도착하면 오늘 winner를 조회해 리뷰 카드를 띄울 준비를 한다.
      if (variables.intent === 'lunch_review') {
        void (async () => {
          try {
            const winner = await fetchTodayWinner();
            if (!winner) return;
            const reviewed = await checkAlreadyReviewed(winner.lunchVoteId);
            if (!reviewed) {
              setReviewWinner(winner);
            }
          } catch (e) {
            console.error('[mallang] lunch review winner fetch failed', e);
          }
        })();
      }
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

  // 말풍선이 의미 있는 텍스트로 바뀔 때마다 Clova Voice TTS 로 함께 들려준다.
  // - 사용자가 마이페이지에서 토글을 꺼 두면 백엔드가 403 으로 응답하므로 자연스럽게 silent 가 된다.
  // - '…' 같은 로딩 placeholder 는 발화하지 않는다.
  // - 같은 발화에 중복 트리거되지 않도록 마지막으로 발화한 텍스트를 ref 로 추적한다.
  const lastSpokenRef = useRef<string | null>(null);
  const lastEmotionRef = useRef<{ emotion?: string; score?: number } | null>(
    null,
  );
  useEffect(() => {
    if (!recentBubble) {
      return;
    }
    if (recentBubble === '…') {
      return;
    }
    if (lastSpokenRef.current === recentBubble) {
      console.info(
        '[mallang] tts skip — same bubble already spoken',
        recentBubble.slice(0, 30),
      );
      return;
    }
    // 자막은 띄우되 발화는 하지 말라고 명시한 안내(마이크 녹음 시작 안내 등).
    // 추후 같은 텍스트가 다시 들어와도 발화하지 않도록 lastSpokenRef 를 미리 박아 둔다.
    if (bubbleMute) {
      console.info(
        '[mallang] tts skip — bubble marked as mute',
        recentBubble.slice(0, 30),
      );
      lastSpokenRef.current = recentBubble;
      return;
    }
    const user = useAuthStore.getState().user;
    if (!user?.ttsEnabled) {
      console.info(
        `[mallang] tts skip — toggle off (user.ttsEnabled=${user?.ttsEnabled ?? 'no-user'})`,
      );
      return;
    }
    console.info(
      '[mallang] tts trigger',
      recentBubble.slice(0, 30),
      `ttsEnabled=${user.ttsEnabled}`,
    );
    lastSpokenRef.current = recentBubble;
    void mallangTtsPlayer.speak(
      recentBubble,
      lastEmotionRef.current ?? undefined,
    );
  }, [recentBubble, bubbleMute]);

  // 창이 닫히면 진행 중이던 음성도 정리한다.
  useEffect(() => () => mallangTtsPlayer.stop(), []);

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
    void (async () => {
      try {
        const { user, raw } = await fetchMe();
        // setUser 호출만으로 useAuthStore.user.onboardedAt 이 갱신되어, 다음 렌더에서
        // onboardingComplete 분기가 자동으로 결정된다. 별도 플래그를 따로 켜 줄 필요가 없다.
        setUser(user);
        if (import.meta.env.DEV) {
          console.info(
            '[mallang] /auth/me sync — name=',
            JSON.stringify(raw.name),
            'teamId=',
            raw.teamId,
            'onboardedAt=',
            raw.onboardedAt,
          );
        }

        // 팀 이름은 BackendPublicUser 에 포함되지 않으므로 teamId 가 있으면 한 번 더 조회한다.
        // 실패해도 다른 필드 동기화는 그대로 진행한다 — 팀 이름만 빈 값으로 떨어진다.
        let teamName = '';
        if (raw.teamId) {
          try {
            const members = await fetchTeamMembers();
            teamName = members.team?.name ?? '';
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('[mallang] /teams/me/members sync failed', error);
            }
          }
        }

        // 온보딩을 마친 사용자에게만 마이페이지 prefill 용으로 store 를 채운다.
        // 회원가입 직후처럼 onboardedAt 이 없는 사용자에게 빈 문자열로 setProfile 해 두면
        // useUserProfileStore.profile 이 not-null 이 되어, 온보딩 분기를 잘못 우회시킨
        // 과거 버그를 다시 만든다.
        if (raw.onboardedAt) {
          const nextProfile = {
            name: raw.name ?? '',
            team: teamName,
            workStartTime: raw.workStartTime,
            lunchTime: raw.lunchTime,
            workEndTime: raw.workEndTime,
            hobby: hobbyToPersona(raw.hobby),
            allergies: raw.allergies ?? '',
          };
          // store 가 비어 있을 수도 있고(=로그아웃 직후 다시 로그인) 이전 세션 값이 남아 있을 수도 있다.
          // 어느 쪽이든 서버 진실로 한 번 덮어써, 마이페이지 폼이 빈 칸으로 노출되는 일을 막는다.
          useUserProfileStore.getState().setProfile(nextProfile);
        } else {
          // 온보딩 전이면 이전 세션의 stale 프로필을 깨끗이 비워, OnboardingFlow 로 자연스럽게 보낸다.
          useUserProfileStore.getState().clearProfile();
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[mallang] /auth/me sync failed', error);
        }
      } finally {
        // 서버 진실을 한 번이라도 확인했음을 표시해, 이후 분기에서 OnboardingFlow 로 안전하게 보낼 수 있게 한다.
        setMeSynced(true);
        // 프로필이 준비된 직후 메인 프로세스 스케줄러에 시간 설정을 전달해 둔다.
        void syncSchedulerFromStores();
      }
    })();
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

  const handleReviewSubmit = async (data: {
    rating: number;
    note: string;
    wantsAgain: boolean | null;
  }) => {
    if (!reviewWinner) return;
    setReviewSubmitting(true);
    try {
      await submitReview({
        lunchVoteId: reviewWinner.lunchVoteId,
        rating: data.rating,
        note: data.note || undefined,
        wantsAgain: data.wantsAgain ?? undefined,
      });
      setReviewWinner(null);
      setBubble('리뷰 고마워! 다음 추천에 반영할게 😊');
    } catch (e) {
      console.error('[mallang] review submit failed', e);
      setBubble('앗, 리뷰 저장에 실패했어. 다시 해볼까?');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewDismiss = () => {
    setReviewWinner(null);
  };

  const handleClick = () => {
    setBubble(pickClickMessage(state));
  };

  /**
   * @param override 음성 인식 결과처럼 입력창과 무관하게 외부에서 들어온 발화. 비우면 prompt state 를 사용한다.
   */
  const sendPrompt = (override?: string) => {
    const raw = override ?? prompt;
    const value = raw.trim();
    if (!value || chatMutation.isPending) return;
    // 입력창에서 보낸 경우에만 입력창을 비운다. 음성 발화는 입력창과 별개라 건드리지 않는다.
    if (override === undefined) setPrompt('');
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

  /**
   * 마이크 버튼 토글.
   * - 녹음 중이 아니면 녹음 시작 (권한 요청 포함).
   * - 녹음 중이면 녹음 종료 → 매고보이스로 STT → 결과를 sendPrompt 로 전달.
   *
   * 어느 단계에서든 실패하면 말풍선으로 안내하고 다음 발화를 막지 않도록 자원을 정리한다.
   */
  const handleMicClick = async () => {
    if (isTranscribing) return;
    if (!voiceRecorder.isSupported) {
      setBubble('이 환경에선 음성 입력을 쓸 수 없어.');
      return;
    }

    if (!voiceRecorder.isRecording) {
      // 진행 중이던 TTS 발화가 있으면 마이크 입력에 그 소리가 섞이지 않도록 즉시 끊는다.
      mallangTtsPlayer.stop();
      try {
        await voiceRecorder.start();
        // 자막은 띄우되 TTS 로 발화하지는 않는다(사용자가 답하기도 전에 말랑이가 말을 거는 어색함 방지).
        setBubble('듣고 있어… 다 말하면 마이크를 다시 눌러 줘.', {
          persistent: true,
          mute: true,
        });
      } catch (error) {
        console.warn('[mallang] mic start failed', error);
        const message = (error as { name?: string } | null)?.name;
        if (message === 'NotAllowedError' || message === 'SecurityError') {
          setBubble('마이크 권한이 필요해. 시스템 설정에서 허용해 줘.');
        } else if (message === 'NotFoundError') {
          setBubble('마이크를 찾지 못했어. 장치 연결을 확인해 줘.');
        } else {
          setBubble('마이크를 켜지 못했어.');
        }
      }
      return;
    }

    // 녹음 종료 → STT 호출.
    setIsTranscribing(true);
    setBubble('…');
    try {
      const blob = await voiceRecorder.stop();
      if (!blob || blob.size === 0) {
        setBubble('녹음된 음성이 없어. 다시 시도해 줘.');
        return;
      }
      const text = (await transcribeAudio(blob)).trim();
      if (!text) {
        setBubble('잘 못 들었어. 다시 말해 줄래?');
        return;
      }
      sendPrompt(text);
    } catch (error) {
      console.error('[mallang] transcribe failed', error);
      setBubble('음성을 알아듣지 못했어. 잠시 후 다시 시도해 줘.');
    } finally {
      setIsTranscribing(false);
    }
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
    // 서버 진실(onboardedAt) 을 한 번도 확인하지 못한 상태라면 OnboardingFlow 로 바로 보내지 않는다.
    // 다른 창에서 막 PATCH 가 끝났는데 이쪽 user 가 stale 인 케이스에서 잘못된 온보딩 노출을 막는다.
    if (!meSynced) {
      return <Overlay $bgUrl={null} />;
    }
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
          disabled={isTranscribing || chatMutation.isPending}
          $recording={voiceRecorder.isRecording}
          aria-label={
            voiceRecorder.isRecording
              ? '녹음 종료하고 보내기'
              : '음성으로 말 걸기'
          }
          aria-pressed={voiceRecorder.isRecording}
          title={
            isTranscribing
              ? '음성 인식 중…'
              : voiceRecorder.isRecording
                ? '녹음 종료하고 보내기'
                : '음성으로 말 걸기'
          }
        >
          <MicIcon />
        </MicButton>
      </PromptRow>

      {reviewWinner && (
        <LunchReviewCard
          winner={reviewWinner}
          onSubmit={handleReviewSubmit}
          onDismiss={handleReviewDismiss}
          isSubmitting={reviewSubmitting}
        />
      )}
    </Overlay>
  );
}
