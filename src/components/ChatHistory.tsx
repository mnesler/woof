import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { ScrollArea } from './ScrollArea';
import { Message, calculateMessageHeight } from './Message';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatHistoryProps {
  messages: ChatMessage[];
  /** Viewport height in lines for scrollable area */
  height: number;
  /** Terminal width for full-width message backgrounds */
  width: number;
  /** Trigger to scroll to bottom (increment to trigger) */
  scrollToBottomTrigger?: number;
  /** Show loading indicator on last assistant message */
  isLoading?: boolean;
}

export function ChatHistory({ 
  messages, 
  height,
  width,
  scrollToBottomTrigger = 0,
  isLoading = false,
}: ChatHistoryProps): React.ReactElement {
  if (messages.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text dimColor>Start a conversation...</Text>
        </Box>
      </Box>
    );
  }

  // Calculate item heights for line-based scrolling
  const itemHeights = useMemo(() => {
    return messages.map((message) => calculateMessageHeight(message.content, width));
  }, [messages, width]);

  const messageElements = messages.map((message, index) => {
    const isLastMessage = index === messages.length - 1;
    const showLoadingIndicator = isLoading && isLastMessage && message.role === 'assistant';

    return (
      <Message
        key={message.id}
        role={message.role}
        content={message.content}
        width={width}
        timestamp={message.timestamp}
        isLoading={showLoadingIndicator}
      />
    );
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <ScrollArea 
        height={height} 
        itemHeights={itemHeights}
        scrollToBottomTrigger={scrollToBottomTrigger}
      >
        {messageElements}
      </ScrollArea>
    </Box>
  );
}
