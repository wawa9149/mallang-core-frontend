import { useMemo } from 'react';
import styled from 'styled-components';

type Emotion = 'happy' | 'neutral' | 'tired' | 'sad' | 'angry';

const EMOTION_LABEL: Record<Emotion, string> = {
  happy: '기쁨',
  neutral: '보통',
  tired: '지침',
  sad: '슬픔',
  angry: '화남',
};

const EMOTION_COLOR: Record<Emotion, string> = {
  happy: '#F5C947',
  neutral: '#B093FF',
  tired: '#C5C9D4',
  sad: '#3B82F6',
  angry: '#EF4444',
};

const EMOTION_ORDER: Emotion[] = ['happy', 'neutral', 'tired', 'sad', 'angry'];

interface DailyEmotion {
  /** 월=0 ... 금=4 */
  day: '월' | '화' | '수' | '목' | '금';
  emotion: Emotion;
  /** 0~100 */
  score: number;
}

// TODO(backend): 백엔드 주간 리포트 API가 붙으면 실제 데이터로 교체한다.
const MOCK_DAILY: DailyEmotion[] = [
  { day: '월', emotion: 'neutral', score: 70 },
  { day: '화', emotion: 'tired', score: 65 },
  { day: '수', emotion: 'happy', score: 85 },
  { day: '목', emotion: 'tired', score: 60 },
  { day: '금', emotion: 'happy', score: 90 },
];

const MOCK_STATS = {
  avgEndTime: '19:23',
  overtimeCount: 3,
  summary:
    '금요일이 가장 기분 좋은 날이었네. 목요일은 좀 힘들었던 것 같아. 평소보다 야근이 좀 많았어. 다음 주는 좀 더 일찍 퇴근해보자.',
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-app-region: no-drag;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.brand.inputBg};
  border-radius: 16px;
  padding: 16px 18px;
`;

const DateRangeCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.title};
`;

const CardTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.title};
`;

const ChartWrapper = styled.div`
  position: relative;
  height: 160px;
  padding: 0 4px 4px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`;

const GridLine = styled.div<{ $bottom: number }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: ${({ $bottom }) => `${$bottom}%`};
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
`;

const BarColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
`;

const BarTrack = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const Bar = styled.div<{ $color: string; $heightPct: number }>`
  width: 60%;
  max-width: 28px;
  height: ${({ $heightPct }) => `${$heightPct}%`};
  background: ${({ $color }) => $color};
  border-radius: 8px 8px 4px 4px;
  transition: height 240ms ease;
`;

const DayLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 14px;
  margin-top: 14px;
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const LegendSwatch = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const StatTile = styled.div<{ $variant?: 'default' | 'alert' }>`
  background: ${({ $variant }) =>
    $variant === 'alert' ? '#FDECEC' : '#F4F2FB'};
  border-radius: 14px;
  padding: 14px 12px;
  text-align: center;
`;

const StatLabel = styled.p`
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const StatValue = styled.p<{ $variant?: 'default' | 'alert' }>`
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme, $variant }) =>
    $variant === 'alert' ? theme.colors.danger : theme.brand.title};
`;

const SummaryBox = styled.div`
  background: ${({ theme }) => theme.brand.inputBg};
  border-radius: 12px;
  padding: 12px 14px;
  margin-top: 12px;
`;

const SummaryLabel = styled.p`
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const SummaryText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.brand.title};
`;

function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${fmt(start)} - ${fmt(end)}`;
}

/** 이번 주의 월요일(KST 기준)을 계산. 일요일이면 지난 주 월요일로. */
function getWeekRange(today: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(today);
  const dayOfWeek = start.getDay(); // 0=일, 1=월, ...
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + offsetToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 4); // 금요일
  return { start, end };
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 6h12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M5.5 1.5v2.5M10.5 1.5v2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WeeklyReportSection() {
  const { start, end } = useMemo(() => getWeekRange(), []);
  const rangeLabel = useMemo(() => formatRange(start, end), [start, end]);

  return (
    <Wrapper>
      <DateRangeCard>
        <CalendarIcon />
        {rangeLabel}
      </DateRangeCard>

      <Card>
        <CardTitle>주간 감정 상태</CardTitle>
        <ChartWrapper>
          {[25, 50, 75].map((pct) => (
            <GridLine key={pct} $bottom={pct} />
          ))}
          {MOCK_DAILY.map(({ day, emotion, score }) => (
            <BarColumn key={day}>
              <BarTrack>
                <Bar $color={EMOTION_COLOR[emotion]} $heightPct={score} />
              </BarTrack>
              <DayLabel>{day}</DayLabel>
            </BarColumn>
          ))}
        </ChartWrapper>
        <Legend>
          {EMOTION_ORDER.map((emo) => (
            <LegendItem key={emo}>
              <LegendSwatch $color={EMOTION_COLOR[emo]} />
              {EMOTION_LABEL[emo]}
            </LegendItem>
          ))}
        </Legend>
      </Card>

      <Card>
        <CardTitle>근무 통계</CardTitle>
        <StatsGrid>
          <StatTile>
            <StatLabel>평균 퇴근 시간</StatLabel>
            <StatValue>{MOCK_STATS.avgEndTime}</StatValue>
          </StatTile>
          <StatTile $variant="alert">
            <StatLabel>야근 횟수</StatLabel>
            <StatValue $variant="alert">{MOCK_STATS.overtimeCount}회</StatValue>
          </StatTile>
        </StatsGrid>
        <SummaryBox>
          <SummaryLabel>이번 주 요약</SummaryLabel>
          <SummaryText>{MOCK_STATS.summary}</SummaryText>
        </SummaryBox>
      </Card>
    </Wrapper>
  );
}
