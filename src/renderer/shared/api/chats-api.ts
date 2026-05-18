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

export async function fetchRecentChats(
  limit = 30,
): Promise<BackendChatMessage[]> {
  const { data } = await http.get<BackendChatMessage[]>('/chats/recent', {
    params: { limit },
  });
  return data;
}
