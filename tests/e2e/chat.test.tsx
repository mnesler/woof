import React from 'react';
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { render } from 'ink-testing-library';
import { App } from '../../src/components/App';
import { ChatHistory, type ChatMessage } from '../../src/components/ChatHistory';
import { ChatInput } from '../../src/components/ChatInput';
import { createServer } from '../../src/server';
import type { Server } from 'bun';
import { wait, typeAndSubmit } from '../utils';

// Default test viewport dimensions
const TEST_HEIGHT = 10;
const TEST_WIDTH = 80;

describe('ChatHistory Component', () => {
  test('renders empty state when no messages', () => {
    const { lastFrame } = render(<ChatHistory messages={[]} height={TEST_HEIGHT} width={TEST_WIDTH} />);
    expect(lastFrame()).toContain('Start a conversation...');
  });

  test('renders user messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Hello there', timestamp: Date.now() },
    ];
    const { lastFrame } = render(<ChatHistory messages={messages} height={TEST_HEIGHT} width={TEST_WIDTH} />);
    expect(lastFrame()).toContain('▌'); // User message indicator
    expect(lastFrame()).toContain('Hello there');
  });

  test('renders assistant messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'assistant', content: 'Hi! How can I help?', timestamp: Date.now() },
    ];
    const { lastFrame } = render(<ChatHistory messages={messages} height={TEST_HEIGHT} width={TEST_WIDTH} />);
    expect(lastFrame()).toContain('▌'); // Assistant message indicator
    expect(lastFrame()).toContain('Hi! How can I help?');
  });

  test('renders conversation with multiple messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      { id: '3', role: 'user', content: 'How are you?', timestamp: Date.now() },
    ];
    const { lastFrame } = render(<ChatHistory messages={messages} height={TEST_HEIGHT} width={TEST_WIDTH} />);
    expect(lastFrame()).toContain('Hello');
    expect(lastFrame()).toContain('Hi there!');
    expect(lastFrame()).toContain('How are you?');
  });

});

describe('ChatInput Component', () => {
  test('renders input prompt', () => {
    const { lastFrame } = render(<ChatInput onSubmit={() => {}} />);
    expect(lastFrame()).toContain('❯'); // Prompt indicator
  });

  test('calls onSubmit when enter is pressed', async () => {
    let submitted = '';
    const { stdin } = render(
      <ChatInput onSubmit={(msg) => { submitted = msg; }} />
    );

    await typeAndSubmit(stdin, 'test message');

    expect(submitted).toBe('test message');
  });

  test('shows disabled state', () => {
    const { lastFrame } = render(<ChatInput onSubmit={() => {}} disabled={true} />);
    expect(lastFrame()).toContain('Waiting...');
  });

});

describe('Chat App Integration', () => {
  test('renders chat layout with history and input', () => {
    const { lastFrame } = render(<App apiEnabled={false} />);
    const output = lastFrame();

    expect(output).toContain('Start a conversation...');
    expect(output).toContain('❯'); // Prompt indicator
  });

  test('adds user message to history on submit', async () => {
    const { lastFrame, stdin } = render(<App apiEnabled={false} />);

    await typeAndSubmit(stdin, 'Hello world');
    await wait(50); // Extra wait for state update

    expect(lastFrame()).toContain('▌'); // User message indicator
    expect(lastFrame()).toContain('Hello world');
  });
});

describe('Chat API', () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(() => {
    server = createServer({ port: 0 });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  test('POST /api/chat sends message and gets response', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });

    const data = (await res.json()) as { conversationId: string; message: { role: string; content: string } };

    expect(res.status).toBe(200);
    expect(data.conversationId).toBeDefined();
    expect(data.message).toBeDefined();
    expect(data.message.role).toBe('assistant');
    expect(data.message.content).toContain('Hello');
  });

  test('POST /api/chat validates message', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  test('GET /api/chat/history returns empty for new conversation', async () => {
    const res = await fetch(`${baseUrl}/api/chat/history`);
    const data = (await res.json()) as { messages: unknown[] };

    expect(res.status).toBe(200);
    expect(data.messages).toEqual([]);
  });

  test('GET /api/chat/history returns messages for existing conversation', async () => {
    // First send a message
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test message' }),
    });
    const chatData = (await chatRes.json()) as { conversationId: string };

    // Then get history
    const historyRes = await fetch(`${baseUrl}/api/chat/history?conversationId=${chatData.conversationId}`);
    const data = (await historyRes.json()) as { messages: { role: string }[] };

    expect(data.messages.length).toBe(2); // user + assistant
    expect(data.messages[0].role).toBe('user');
    expect(data.messages[1].role).toBe('assistant');
  });
});
