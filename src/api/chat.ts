import type { ChatMessage } from '../components/ChatHistory';

const API_BASE = process.env.API_URL ?? 'http://localhost:3000';

export interface SendMessageOptions {
  message: string;
  conversationId?: string;
}

export interface SendMessageResult {
  message: ChatMessage;
  conversationId: string;
}

export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message ?? 'Failed to send message');
  }

  return response.json() as Promise<SendMessageResult>;
}

export async function getChatHistory(conversationId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE}/api/chat/history?conversationId=${conversationId}`);

  if (!response.ok) {
    throw new Error('Failed to get chat history');
  }

  const data = await response.json() as { messages: ChatMessage[] };
  return data.messages;
}
