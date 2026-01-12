import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  model?: string;
}

export function ChatInput({ onSubmit, placeholder = 'Type a message...', disabled = false, model = 'claude-sonnet' }: ChatInputProps): React.ReactElement {
  const [value, setValue] = useState('');

  const handleSubmit = (input: string) => {
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setValue('');
    }
  };

  return (
    <Box flexDirection="column" width="100%">
      <Box
        paddingX={1}
        paddingY={0}
        width="100%"
        flexDirection="row"
      >
        <Text backgroundColor="gray" color="white"> </Text>
        <Box paddingX={1} flexGrow={1}>
          <Text color="cyan">❯ </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={disabled ? 'Waiting...' : placeholder}
          />
        </Box>
      </Box>
      <Box justifyContent="flex-end" paddingX={1}>
        <Text dimColor>{model}</Text>
      </Box>
    </Box>
  );
}
