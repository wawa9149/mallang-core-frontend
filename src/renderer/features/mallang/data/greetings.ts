/**
 * 앱을 켰을 때 말랑이가 먼저 건네는 인사 멘트.
 * click-messages 와 같은 서인영 톤을 유지하고, 시간대별로 다른 묶음에서 랜덤 픽한다.
 * 이름이 있으면 "{이름}, …" 형태로 앞에 붙여 친근하게 부른다.
 */

interface GreetingContext {
  /** 0~23. 현재 로컬 시각의 hour. */
  hour: number;
  /** 사용자 이름. 비어 있으면 이름 없이 띄운다. */
  name?: string;
}

const EARLY = [
  '벌써 켰어? 시간 봐.',
  '왔구나. 너무 일찍 일어났다.',
  '이 시간에 왔어? 정말?',
];

const MORNING = [
  '왔어? 오늘도 시작이야.',
  '좋은 아침. 커피부터 하자.',
  '왔구나. 오늘 페이스 어때?',
  '눈 떴어? 잘했어. 오늘 부탁해.',
];

const NOON = [
  '왔네. 점심 뭐 먹을지 생각해 봤어?',
  '아침은 잘 보냈어?',
  '오, 왔다. 오전은 어땠어?',
];

const AFTERNOON = [
  '오후네. 졸리지?',
  '왔어. 졸음 깰 시간이야.',
  '나 너 기다리고 있었지.',
  '오후도 같이 가보자.',
];

const EVENING = [
  '왔어. 오늘도 수고 많았어.',
  '퇴근 가까웠다. 조금만 더.',
  '왔구나. 마무리 잘 해보자.',
];

const NIGHT = [
  '왔어? 아직 일하는 거야?',
  '늦었다. 빨리 마치고 쉬어.',
  '이 시간에 또 왔네. 무리하지 마.',
];

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? '';
}

export function pickGreeting({ hour, name }: GreetingContext): string {
  const list =
    hour < 5
      ? EARLY
      : hour < 11
        ? MORNING
        : hour < 13
          ? NOON
          : hour < 17
            ? AFTERNOON
            : hour < 21
              ? EVENING
              : NIGHT;
  const message = pick(list);
  const trimmedName = name?.trim();
  return trimmedName ? `${trimmedName}, ${message}` : message;
}
