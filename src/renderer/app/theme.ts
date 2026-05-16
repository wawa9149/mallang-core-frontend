import type { MallangState } from '../../shared/types/domain';

/**
 * 말랑이의 5가지 상태별 시각 표현을 한 곳에서 관리한다.
 * 캐릭터 색상/glow/pulse는 모두 이 테마에서 파생된다.
 */
export const mallangStateTheme: Record<
  MallangState,
  {
    primary: string;
    accent: string;
    glow: string;
    pulseDurationMs: number;
    motion: 'bouncy' | 'slow' | 'sharp' | 'idle' | 'droop';
  }
> = {
  happy: {
    primary: '#FFD86B',
    accent: '#FF9F45',
    glow: 'rgba(255, 216, 107, 0.55)',
    pulseDurationMs: 900,
    motion: 'bouncy',
  },
  sad: {
    primary: '#7FA8D6',
    accent: '#4F6F99',
    glow: 'rgba(127, 168, 214, 0.35)',
    pulseDurationMs: 2600,
    motion: 'slow',
  },
  angry: {
    primary: '#FF6B6B',
    accent: '#C03A3A',
    glow: 'rgba(255, 107, 107, 0.5)',
    pulseDurationMs: 600,
    motion: 'sharp',
  },
  neutral: {
    primary: '#D5D5DC',
    accent: '#9C9CA8',
    glow: 'rgba(213, 213, 220, 0.4)',
    pulseDurationMs: 1800,
    motion: 'idle',
  },
  tired: {
    primary: '#A89CC9',
    accent: '#665C85',
    glow: 'rgba(168, 156, 201, 0.35)',
    pulseDurationMs: 3000,
    motion: 'droop',
  },
};

export const appTheme = {
  colors: {
    bg: '#FAFAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F2F2F6',
    border: '#E4E4EB',
    text: '#1A1A22',
    textMuted: '#6B6B78',
    primary: '#7A5CFF',
    primarySoft: 'rgba(122, 92, 255, 0.12)',
    danger: '#E5484D',
    success: '#3DB37B',
  },
  radii: {
    sm: '6px',
    md: '12px',
    lg: '20px',
    pill: '999px',
  },
  spacing: (n: number) => `${n * 4}px`,
  shadows: {
    card: '0 4px 16px rgba(20, 20, 40, 0.06)',
    floating: '0 12px 32px rgba(20, 20, 40, 0.18)',
  },
  fonts: {
    body: `'Pretendard', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
  },
  mallang: mallangStateTheme,
} as const;

export type AppTheme = typeof appTheme;
