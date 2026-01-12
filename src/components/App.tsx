import React, { useState } from 'react';
import { Box, useStdout, useInput } from 'ink';
import { ChatHistory, type ChatMessage } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { MainMenu, type MainMenuAction } from './MainMenu';
import { sendMessage } from '../api/chat';

export interface AppProps {
  initialMessages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  apiEnabled?: boolean;
}

// Input area takes approximately 3 lines (input + model indicator + padding)
const INPUT_AREA_HEIGHT = 3;

export function App({ initialMessages = [], onSendMessage, apiEnabled = true }: AppProps): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [scrollToBottomTrigger, setScrollToBottomTrigger] = useState(0);
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  // Calculate available height for chat history
  const chatHeight = Math.max(1, height - INPUT_AREA_HEIGHT);

  useInput((input, key) => {
    if (key.ctrl && input === 'p') {
      setShowMenu((prev) => !prev);
    }
  });

  const handleMenuSelect = (action: MainMenuAction) => {
    if (action === 'exit') {
      process.exit(0);
    } else if (action === 'connect') {
      setShowMenu(false);
    } else if (action === 'switch-model') {
      // TODO: implement model switching
      setShowMenu(false);
    }
  };

  const handleSubmit = async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    // Trigger scroll to bottom when user sends a message
    setScrollToBottomTrigger((prev) => prev + 1);
    setIsLoading(true);

    if (onSendMessage) {
      onSendMessage(content);
    }

    if (apiEnabled) {
      try {
        const result = await sendMessage({ message: content, conversationId });
        setConversationId(result.conversationId);
        setMessages((prev) => [...prev, result.message]);
      } catch {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Failed to connect to server. Is it running?',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }

    setIsLoading(false);
  };

  return (
    <Box
      width={width}
      height={height}
      flexDirection="column"
      margin={0}
      padding={0}
    >
      {showMenu ? (
        <MainMenu onSelect={handleMenuSelect} onClose={() => setShowMenu(false)} />
      ) : (
        <>
          <ChatHistory
            messages={messages}
            height={chatHeight}
            width={width}
            scrollToBottomTrigger={scrollToBottomTrigger}
          />
          <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
        </>
      )}
    </Box>
  );
}
