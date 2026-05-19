import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

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

interface WeeklyData {
  daily: DailyEmotion[];
  avgEndTime: string;
  overtimeCount: number;
  summary: string;
}

/**
 * 더미 주간 데이터.
 * 인덱스 = "이번 주에서 N주 전" (0 = 이번 주, 1 = 지난 주, ...).
 * 백엔드 주간 리포트 API가 붙기 전까지는 사용자가 화살표/캘린더로 주를 바꿔도
 * 매번 다른 결과가 나타나도록 5주치를 미리 채워둔다.
 * TODO(backend): GET /reports/weekly?monday=YYYY-MM-DD 같은 엔드포인트로 교체.
 */
const MOCK_WEEKS: WeeklyData[] = [
  {
    daily: [
      { day: '월', emotion: 'neutral', score: 70 },
      { day: '화', emotion: 'tired', score: 65 },
      { day: '수', emotion: 'happy', score: 85 },
      { day: '목', emotion: 'tired', score: 60 },
      { day: '금', emotion: 'happy', score: 90 },
    ],
    avgEndTime: '19:23',
    overtimeCount: 3,
    summary:
      '금요일이 가장 기분 좋은 날이었네. 목요일은 좀 힘들었던 것 같아. 평소보다 야근이 좀 많았어. 다음 주는 좀 더 일찍 퇴근해보자.',
  },
  {
    daily: [
      { day: '월', emotion: 'happy', score: 80 },
      { day: '화', emotion: 'happy', score: 75 },
      { day: '수', emotion: 'neutral', score: 65 },
      { day: '목', emotion: 'sad', score: 48 },
      { day: '금', emotion: 'happy', score: 88 },
    ],
    avgEndTime: '18:42',
    overtimeCount: 1,
    summary:
      '한 주를 꽤 가볍게 보냈네. 목요일에 무슨 일 있었어? 그래도 금요일에 잘 마무리한 것 같아 다행이야.',
  },
  {
    daily: [
      { day: '월', emotion: 'tired', score: 55 },
      { day: '화', emotion: 'tired', score: 50 },
      { day: '수', emotion: 'angry', score: 35 },
      { day: '목', emotion: 'sad', score: 45 },
      { day: '금', emotion: 'neutral', score: 60 },
    ],
    avgEndTime: '20:15',
    overtimeCount: 4,
    summary:
      '많이 힘든 한 주였어. 야근도 잦았고 수요일엔 특히 화가 났던 것 같아. 이번 주는 좀 쉬엄쉬엄 가자.',
  },
  {
    daily: [
      { day: '월', emotion: 'neutral', score: 60 },
      { day: '화', emotion: 'happy', score: 82 },
      { day: '수', emotion: 'happy', score: 78 },
      { day: '목', emotion: 'happy', score: 80 },
      { day: '금', emotion: 'happy', score: 92 },
    ],
    avgEndTime: '18:10',
    overtimeCount: 0,
    summary:
      '야근 0회. 정말 잘했어. 화요일부터 컨디션이 쭉 좋았네. 이 페이스를 유지해 보자.',
  },
  {
    daily: [
      { day: '월', emotion: 'happy', score: 75 },
      { day: '화', emotion: 'neutral', score: 65 },
      { day: '수', emotion: 'tired', score: 55 },
      { day: '목', emotion: 'neutral', score: 70 },
      { day: '금', emotion: 'happy', score: 85 },
    ],
    avgEndTime: '19:05',
    overtimeCount: 2,
    summary:
      '평범하고 무난한 한 주. 수요일에 살짝 처졌지만 회복은 잘했어. 이 정도면 괜찮은 페이스야.',
  },
];

const EMPTY_WEEK: WeeklyData = {
  daily: [
    { day: '월', emotion: 'neutral', score: 0 },
    { day: '화', emotion: 'neutral', score: 0 },
    { day: '수', emotion: 'neutral', score: 0 },
    { day: '목', emotion: 'neutral', score: 0 },
    { day: '금', emotion: 'neutral', score: 0 },
  ],
  avgEndTime: '-',
  overtimeCount: 0,
  summary: '아직 이 주의 데이터가 없어. 다른 주를 골라보자.',
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** 주어진 날짜가 속한 주(월~금 기준)의 월요일 00:00:00 로컬 시각으로 정규화. */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0=일,1=월,...,6=토
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + offsetToMonday);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** 두 월요일 사이의 주 차이(=정수). a > b면 양수. */
function diffWeeks(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (7 * ONE_DAY_MS));
}

function sameYearMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${fmt(start)} - ${fmt(end)}`;
}

/** offset 0 = 이번 주, 양수 = 과거 주. 5주치를 벗어나면 빈 데이터로 fallback. */
function getMockWeekData(weeksBack: number): WeeklyData {
  if (weeksBack < 0) return EMPTY_WEEK;
  return MOCK_WEEKS[weeksBack] ?? EMPTY_WEEK;
}

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

const NavRow = styled.div`
  position: relative;
  background: ${({ theme }) => theme.brand.inputBg};
  border-radius: 16px;
  padding: 10px 8px;
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  gap: 4px;
`;

const NavIconButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: ${({ theme }) => theme.brand.title};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      `color-mix(in srgb, ${theme.brand.primary} 12%, transparent)`};
  }

  &:disabled {
    color: ${({ theme }) => theme.brand.subtitle};
    opacity: 0.4;
    cursor: default;
  }
`;

const RangeButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.title};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      `color-mix(in srgb, ${theme.brand.primary} 10%, transparent)`};
  }
`;

const TodayButton = styled.button`
  position: absolute;
  top: 50%;
  right: 44px;
  transform: translateY(-50%);
  padding: 4px 10px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.brand.primary} 14%, transparent)`};
  color: ${({ theme }) => theme.brand.primary};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      `color-mix(in srgb, ${theme.brand.primary} 22%, transparent)`};
  }
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

const CalendarPopover = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: 280px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.shadows.floating};
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`;

const CalendarHeaderTitle = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const WeekdayRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.subtitle};
  padding: 0 2px;
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

interface DayCellProps {
  $inMonth: boolean;
  $inSelectedWeek: boolean;
  $isWeekEdgeLeft: boolean;
  $isWeekEdgeRight: boolean;
  $isToday: boolean;
  $disabled: boolean;
}

const DayCell = styled.button<DayCellProps>`
  position: relative;
  aspect-ratio: 1 / 1;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: ${({ $inSelectedWeek }) => ($inSelectedWeek ? 800 : 600)};
  color: ${({ theme, $inMonth, $disabled }) => {
    if ($disabled) return theme.brand.subtitle;
    return $inMonth ? theme.brand.title : theme.brand.subtitle;
  }};
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  opacity: ${({ $inMonth, $disabled }) =>
    $disabled ? 0.35 : $inMonth ? 1 : 0.45};

  ${({ $inSelectedWeek, theme, $isWeekEdgeLeft, $isWeekEdgeRight }) =>
    $inSelectedWeek &&
    css`
      background: ${`color-mix(in srgb, ${theme.brand.primary} 16%, transparent)`};
      border-top-left-radius: ${$isWeekEdgeLeft ? '999px' : '0'};
      border-bottom-left-radius: ${$isWeekEdgeLeft ? '999px' : '0'};
      border-top-right-radius: ${$isWeekEdgeRight ? '999px' : '0'};
      border-bottom-right-radius: ${$isWeekEdgeRight ? '999px' : '0'};
    `}

  ${({ $isToday, theme, $disabled }) =>
    $isToday &&
    !$disabled &&
    css`
      &::after {
        content: '';
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        border-radius: 999px;
        background: ${theme.brand.primary};
      }
    `}

  &:hover:not(:disabled) {
    background: ${({ theme, $inSelectedWeek }) =>
      $inSelectedWeek
        ? `color-mix(in srgb, ${theme.brand.primary} 24%, transparent)`
        : `color-mix(in srgb, ${theme.brand.primary} 8%, transparent)`};
  }
`;

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 3.5L5.5 8L10 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 월 그리드 캘린더. 일자 클릭 시 해당 날짜가 속한 주(월~금)가 선택된다.
 * 선택된 주의 월~금 셀에 배경을 깔아 한 주를 직관적으로 보여준다.
 * 미래 주(이번 주 이후)는 disabled 처리한다.
 */
function WeekPickerCalendar({
  selectedMonday,
  todayMonday,
  onSelect,
  onClose,
}: {
  selectedMonday: Date;
  todayMonday: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date(selectedMonday);
    d.setDate(1);
    return d;
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 그리드는 항상 일요일 시작 6주(=42칸)로 채워서 레이아웃이 흔들리지 않게 한다.
  const gridStart = useMemo(() => {
    const firstOfMonth = new Date(viewMonth);
    firstOfMonth.setDate(1);
    const gs = new Date(firstOfMonth);
    gs.setDate(gs.getDate() - firstOfMonth.getDay());
    gs.setHours(0, 0, 0, 0);
    return gs;
  }, [viewMonth]);

  const cells = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      arr.push(addDays(gridStart, i));
    }
    return arr;
  }, [gridStart]);

  const monthTitle = `${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`;

  function shiftMonth(delta: number) {
    const next = new Date(viewMonth);
    next.setMonth(next.getMonth() + delta);
    setViewMonth(next);
  }

  return (
    <CalendarPopover ref={containerRef} role="dialog" aria-label="주 선택">
      <CalendarHeader>
        <NavIconButton
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
        >
          <ChevronLeftIcon />
        </NavIconButton>
        <CalendarHeaderTitle>{monthTitle}</CalendarHeaderTitle>
        <NavIconButton
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
        >
          <ChevronRightIcon />
        </NavIconButton>
      </CalendarHeader>
      <WeekdayRow>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </WeekdayRow>
      <DaysGrid>
        {cells.map((cellDate) => {
          const cellMonday = getMondayOf(cellDate);
          const inMonth = sameYearMonth(cellDate, viewMonth);
          const inSelectedWeek = sameDay(cellMonday, selectedMonday);
          const isToday = sameDay(cellDate, today);
          // 미래 주는 비활성화. 이번 주의 미래 요일(예: 수요일에 본 금요일)은 선택 가능하게 둔다.
          // 클릭 핸들러가 어차피 그 주의 월요일로 정규화하므로 이번 주 안에서는 어느 날을 눌러도 같다.
          const disabled = cellMonday.getTime() > todayMonday.getTime();
          const dayOfWeek = cellDate.getDay();
          return (
            <DayCell
              key={cellDate.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cellDate)}
              $inMonth={inMonth}
              $inSelectedWeek={inSelectedWeek}
              $isWeekEdgeLeft={inSelectedWeek && dayOfWeek === 1}
              $isWeekEdgeRight={inSelectedWeek && dayOfWeek === 5}
              $isToday={isToday}
              $disabled={disabled}
            >
              {cellDate.getDate()}
            </DayCell>
          );
        })}
      </DaysGrid>
    </CalendarPopover>
  );
}

export function WeeklyReportSection() {
  const todayMonday = useMemo(() => getMondayOf(new Date()), []);
  const [selectedMonday, setSelectedMonday] = useState<Date>(todayMonday);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const friday = useMemo(() => addDays(selectedMonday, 4), [selectedMonday]);
  const rangeLabel = useMemo(
    () => formatRange(selectedMonday, friday),
    [selectedMonday, friday],
  );

  const weeksBack = useMemo(
    () => diffWeeks(todayMonday, selectedMonday),
    [todayMonday, selectedMonday],
  );
  const isCurrentWeek = weeksBack === 0;
  const isFutureBlocked = weeksBack <= 0;

  const data = useMemo(() => getMockWeekData(weeksBack), [weeksBack]);

  function goPrev() {
    setSelectedMonday((prev) => addDays(prev, -7));
  }

  function goNext() {
    if (isFutureBlocked) return;
    setSelectedMonday((prev) => addDays(prev, 7));
  }

  function goCurrent() {
    setSelectedMonday(todayMonday);
  }

  function handleCalendarSelect(date: Date) {
    const monday = getMondayOf(date);
    if (monday.getTime() > todayMonday.getTime()) return;
    setSelectedMonday(monday);
    setCalendarOpen(false);
  }

  return (
    <Wrapper>
      <NavRow>
        <NavIconButton type="button" onClick={goPrev} aria-label="이전 주">
          <ChevronLeftIcon />
        </NavIconButton>
        <RangeButton
          type="button"
          onClick={() => setCalendarOpen((open) => !open)}
          aria-expanded={calendarOpen}
          aria-haspopup="dialog"
        >
          <CalendarIcon />
          {rangeLabel}
        </RangeButton>
        <NavIconButton
          type="button"
          onClick={goNext}
          disabled={isFutureBlocked}
          aria-label="다음 주"
        >
          <ChevronRightIcon />
        </NavIconButton>
        {!isCurrentWeek && (
          <TodayButton type="button" onClick={goCurrent}>
            이번 주로
          </TodayButton>
        )}
        {calendarOpen && (
          <WeekPickerCalendar
            selectedMonday={selectedMonday}
            todayMonday={todayMonday}
            onSelect={handleCalendarSelect}
            onClose={() => setCalendarOpen(false)}
          />
        )}
      </NavRow>

      <Card>
        <CardTitle>주간 감정 상태</CardTitle>
        <ChartWrapper>
          {[25, 50, 75].map((pct) => (
            <GridLine key={pct} $bottom={pct} />
          ))}
          {data.daily.map(({ day, emotion, score }) => (
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
            <StatValue>{data.avgEndTime}</StatValue>
          </StatTile>
          <StatTile $variant="alert">
            <StatLabel>야근 횟수</StatLabel>
            <StatValue $variant="alert">{data.overtimeCount}회</StatValue>
          </StatTile>
        </StatsGrid>
        <SummaryBox>
          <SummaryLabel>
            {isCurrentWeek ? '이번 주 요약' : '이 주 요약'}
          </SummaryLabel>
          <SummaryText>{data.summary}</SummaryText>
        </SummaryBox>
      </Card>
    </Wrapper>
  );
}
