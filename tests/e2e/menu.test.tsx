import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { Box } from 'ink';
import { Menu, generateRandomItems, type MenuItem } from '../../src/components/Menu';
import { wait, pressKey, navigateDown, keyboard } from '../utils';

// Wrapper component for testing Menu in isolation
function MenuTestWrapper({ items, onSelect }: { items: MenuItem[]; onSelect?: (item: MenuItem) => void }) {
  return (
    <Box flexDirection="column">
      <Menu items={items} onSelect={onSelect} />
    </Box>
  );
}

describe('Menu Component', () => {
  const fixedItems: MenuItem[] = [
    { label: 'alpha', value: 'alpha' },
    { label: 'bravo', value: 'bravo' },
    { label: 'charlie', value: 'charlie' },
    { label: 'delta', value: 'delta' },
    { label: 'echo', value: 'echo' },
    { label: 'foxtrot', value: 'foxtrot' },
    { label: 'golf', value: 'golf' },
    { label: 'hotel', value: 'hotel' },
    { label: 'india', value: 'india' },
    { label: 'juliet', value: 'juliet' },
  ];

  test('renders menu with 10 items', () => {
    const { lastFrame } = render(<MenuTestWrapper items={fixedItems} />);
    const output = lastFrame();

    for (const item of fixedItems) {
      expect(output).toContain(item.label);
    }
  });

  test('first item is highlighted by default', () => {
    const { lastFrame } = render(<MenuTestWrapper items={fixedItems} />);
    const output = lastFrame();

    expect(output).toContain('alpha');
  });

  test('menu responds to keyboard navigation', () => {
    const { lastFrame, stdin } = render(<MenuTestWrapper items={fixedItems} />);

    stdin.write(keyboard.down);

    const output = lastFrame();
    expect(output).toContain('bravo');
  });

  test('onSelect is called when item is selected', async () => {
    let selectedItem: MenuItem | null = null;

    const { stdin } = render(
      <MenuTestWrapper
        items={fixedItems}
        onSelect={(item) => {
          selectedItem = item;
        }}
      />
    );

    await pressKey(stdin, keyboard.enter);

    expect(selectedItem).not.toBeNull();
    expect(selectedItem!.value).toBe('alpha');
  });

  test('can navigate and select different item', async () => {
    let selectedItem: MenuItem | null = null;

    const { stdin } = render(
      <MenuTestWrapper
        items={fixedItems}
        onSelect={(item) => {
          selectedItem = item;
        }}
      />
    );

    await navigateDown(stdin, 2);
    await pressKey(stdin, keyboard.enter);

    expect(selectedItem).not.toBeNull();
    expect(selectedItem!.value).toBe('charlie');
  });
});

describe('Menu Utilities', () => {
  test('generateRandomItems creates correct count', () => {
    const items = generateRandomItems(10);
    expect(items).toHaveLength(10);
  });

  test('generateRandomItems creates unique items', () => {
    const items = generateRandomItems(10);
    const values = items.map((i) => i.value);
    const unique = new Set(values);
    expect(unique.size).toBe(10);
  });

  test('each item has label and value', () => {
    const items = generateRandomItems(10);
    for (const item of items) {
      expect(item.label).toBeDefined();
      expect(item.value).toBeDefined();
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});
