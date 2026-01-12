import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export interface MenuItem {
  label: string;
  value: string;
}

export interface MenuProps {
  items: MenuItem[];
  onSelect?: (item: MenuItem) => void;
}

export function Menu({ items, onSelect }: MenuProps): React.ReactElement {
  const handleSelect = (item: MenuItem) => {
    onSelect?.(item);
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box flexDirection="column" alignItems="flex-start">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}

export function generateRandomItems(count: number): MenuItem[] {
  const words = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo',
    'foxtrot', 'golf', 'hotel', 'india', 'juliet',
    'kilo', 'lima', 'mike', 'november', 'oscar',
    'papa', 'quebec', 'romeo', 'sierra', 'tango',
  ];

  const items: MenuItem[] = [];
  const used = new Set<number>();

  while (items.length < count) {
    const idx = Math.floor(Math.random() * words.length);
    if (!used.has(idx)) {
      used.add(idx);
      items.push({
        label: words[idx],
        value: words[idx],
      });
    }
  }

  return items;
}
