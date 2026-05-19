import {
  MALLANG_PERSONA_LABEL,
  type MallangPersona,
} from '../../../shared/types/domain';
import type { OnboardingAnswers } from './onboarding-store';

export type OnboardingStep =
  | {
      id: 'name';
      type: 'text';
      prompt: (a: OnboardingAnswers) => string;
      placeholder: string;
      maxLength: number;
    }
  | {
      id: 'time';
      type: 'time-triple';
      prompt: (a: OnboardingAnswers) => string;
    }
  | {
      id: 'hobby';
      type: 'choice';
      prompt: (a: OnboardingAnswers) => string;
      options: { value: MallangPersona; label: string }[];
    }
  | {
      id: 'allergies';
      type: 'text';
      prompt: (a: OnboardingAnswers) => string;
      placeholder: string;
      maxLength: number;
      allowEmpty?: true;
    }
  | {
      id: 'team';
      type: 'text';
      prompt: (a: OnboardingAnswers) => string;
      placeholder: string;
      maxLength: number;
    }
  | {
      id: 'address';
      type: 'text';
      prompt: (a: OnboardingAnswers) => string;
      placeholder: string;
      maxLength: number;
    }
  | {
      id: 'apiKey';
      type: 'text';
      prompt: (a: OnboardingAnswers) => string;
      placeholder: string;
      maxLength: number;
      /** 비밀번호 타입으로 입력해서 화면에 노출되지 않게 한다. */
      secret: true;
    }
  | {
      id: 'confirm';
      type: 'confirm';
      prompt: (a: OnboardingAnswers) => string;
    };

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'name',
    type: 'text',
    prompt: () => '안녕? 나는 말랑이! 네 이름은 뭐야?',
    placeholder: '이름을 알려줘',
    maxLength: 16,
  },
  {
    id: 'time',
    type: 'time-triple',
    prompt: (a) =>
      `만나서 반가워 ${a.name}아!\n넌 출퇴근, 점심 시간이 어떻게 되니?`,
  },
  {
    id: 'hobby',
    type: 'choice',
    prompt: () =>
      '너의 하루는 이렇게 흘러가는구나.\n퇴근 후엔 보통 어떻게 시간을 보내?',
    options: [
      { value: 'workout', label: '운동' },
      { value: 'self-development', label: '자기개발' },
      { value: 'rest', label: '휴식' },
    ],
  },
  {
    id: 'allergies',
    type: 'text',
    prompt: (a) =>
      a.hobby
        ? `오, 나도 ${MALLANG_PERSONA_LABEL[a.hobby]} 좋아하는데!\n혹시 알러지나 못 먹는 음식 있어?`
        : '혹시 알러지나 못 먹는 음식 있어?',
    placeholder: '없으면 그냥 보내도 돼',
    maxLength: 60,
    allowEmpty: true,
  },
  {
    id: 'team',
    type: 'text',
    prompt: () => '어떤 팀에 속해 있어?',
    placeholder: '팀 이름을 알려줘',
    maxLength: 30,
  },
  {
    id: 'address',
    type: 'text',
    prompt: () =>
      '회사는 어디 있어?\n점심 추천을 위해 회사 도로명 주소가 필요해.',
    placeholder: '예: 서울 강남구 테헤란로 152',
    maxLength: 200,
  },
  {
    id: 'apiKey',
    type: 'text',
    prompt: () =>
      '마지막으로 OpenAI API 키를 알려줘.\n내가 너랑 대화하고 너의 하루를 정리하려면 이 키가 필요해.',
    placeholder: 'sk-...',
    maxLength: 200,
    secret: true,
  },
  {
    id: 'confirm',
    type: 'confirm',
    prompt: () =>
      '너에 대해 많은 걸 알게 됐다!\n내가 제대로 알고 있는지 확인해줘.',
  },
];

export function summarizeAnswers(a: OnboardingAnswers): string {
  const lines = [
    `이름: ${a.name}`,
    `시간: ${a.workStart} 출근 · ${a.lunch} 점심 · ${a.workEnd} 퇴근`,
    `퇴근 후: ${a.hobby ? MALLANG_PERSONA_LABEL[a.hobby] : '-'}`,
    `못 먹는 음식: ${a.allergies.trim() ? a.allergies : '없음'}`,
    `팀: ${a.team}`,
    `회사 주소: ${a.address}`,
    `OpenAI 키: ${maskApiKey(a.apiKey)}`,
  ];
  return lines.join('\n');
}

/** API 키는 요약에서도 끝 4자리만 보이도록 마스킹한다. */
function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '-';
  if (trimmed.length <= 4) return '••••';
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}
