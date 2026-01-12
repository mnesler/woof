import type { ChatMessage } from '../../components/ChatHistory';

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [chat] ${message}`);
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
}

// In-memory conversation store (replace with DB later)
const conversations = new Map<string, ChatMessage[]>();

export async function handleChatRequest(req: Request): Promise<Response> {
  log('handleChatRequest called');

  try {
    const body = await req.json() as ChatRequest;

    if (!body.message || typeof body.message !== 'string') {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const conversationId = body.conversationId ?? crypto.randomUUID();
    log(`Processing message for conversation ${conversationId}`);

    // Get or create conversation
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    const history = conversations.get(conversationId)!;

    // Store user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: body.message,
      timestamp: Date.now(),
    };
    history.push(userMessage);

    // Generate assistant response (mock for now)
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: generateResponse(body.message),
      timestamp: Date.now(),
    };
    history.push(assistantMessage);

    log(`Response generated for conversation ${conversationId}`);

    return Response.json({
      message: assistantMessage,
      conversationId,
    } as ChatResponse);
  } catch (error) {
    log(`Error: ${error}`);
    return Response.json(
      { error: 'Failed to process chat request', message: String(error) },
      { status: 500 }
    );
  }
}

// Mock response generator (will be replaced with LLM)
function generateResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hello! I'm Woof, your AI assistant. How can I help you today?";
  }

  if (lower.includes('help')) {
    return "I can help you with:\n- Running agent pipelines\n- Answering questions\n- Writing and reviewing code";
  }

  return `I received your message: "${userMessage}". This is a mock response - LLM integration coming soon!`;
}

export function handleChatHistory(req: Request): Response {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversationId');

  log(`handleChatHistory called for ${conversationId ?? 'new conversation'}`);

  if (!conversationId) {
    return Response.json({ messages: [] });
  }

  const history = conversations.get(conversationId) ?? [];
  return Response.json({ messages: history, conversationId });
}
