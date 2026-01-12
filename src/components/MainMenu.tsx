import React from 'react';
import { Box, Text, useInput } from 'ink';

export type MainMenuAction = 'connect' | 'switch-model' | 'exit';

export interface MainMenuProps {
  onSelect: (action: MainMenuAction) => void;
  onClose?: () => void;
}

interface MenuOption {
  label: string;
  value: MainMenuAction;
}

const menuOptions: MenuOption[] = [
  { label: 'Connect', value: 'connect' },
  { label: 'Switch Model', value: 'switch-model' },
  { label: 'Exit', value: 'exit' },
];

export function MainMenu({ onSelect, onClose }: MainMenuProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : menuOptions.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < menuOptions.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(menuOptions[selectedIndex].value);
    } else if (key.escape) {
      onClose?.();
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box flexDirection="column">
        {menuOptions.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={option.value} flexDirection="row">
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '❯ ' : '  '}
              </Text>
              <Text
                color={isSelected ? 'black' : undefined}
                backgroundColor={isSelected ? 'cyan' : undefined}
                bold={isSelected}
              >
                {isSelected ? ` ${option.label} ` : option.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · enter select · esc close</Text>
      </Box>
    </Box>
  );
}
