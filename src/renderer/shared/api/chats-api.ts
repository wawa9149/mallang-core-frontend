import { http } from './http';
import type {
  BackendChatIntent,
  BackendChatMessage,
  BackendChatTurn,
} from './types';

export async function sendChat(
  content: string,
  intent: BackendChatIntent = 'free',
): Promise<BackendChatTurn> {
  const { data } = await http.post<BackendChatTurn>('/chats', {
    content,
    intent,
  });
  return data;
}

/**
 * 스케줄러가 시간 도래로 발사한 first-turn 응답을 받아 온다.
 * 사용자 답변 없이 말랑이가 먼저 던질 질문(assistantMessage)만 백엔드가 생성해 돌려준다.
 * leftOffice 같은 사용자 답변 기반 메타 데이터는 다음 라운드(일반 sendChat)에서 추론된다.
 */
export async function triggerScheduledPrompt(
  intent: BackendChatIntent,
): Promise<BackendChatMessage> {
  const { data } = await http.post<{ assistantMessage: BackendChatMessage }>(
    '/chats/scheduled-prompt',
    { intent },
  );
  return data.assistantMessage;
}

export async function fetchRecentChats(
  limit = 30,
): Promise<BackendChatMessage[]> {
  const { data } = await http.get<BackendChatMessage[]>('/chats/recent', {
    params: { limit },
  });
  return data;
}
