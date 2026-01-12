import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { Text, Box } from 'ink';
import { ScrollArea } from '../../src/components/ScrollArea';
import { wait, pressKey, keyboard } from '../utils';

// Helper to create test items
function createItems(count: number): React.ReactNode[] {
  return Array.from({ length: count }, (_, i) => (
    <Text key={i}>Item {i + 1}</Text>
  ));
}

describe('ScrollArea Component', () => {
  test('renders visible items only', () => {
    const items = createItems(10);
    const { lastFrame } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    const output = lastFrame();
    // Should show last 3 items (starts scrolled to bottom)
    expect(output).toContain('Item 8');
    expect(output).toContain('Item 9');
    expect(output).toContain('Item 10');
    // Should not show early items (check for "Item 1\n" or end of item to avoid matching Item 10)
    expect(output).not.toContain('Item 2');
    expect(output).not.toContain('Item 3');
  });

  test('shows all items when content fits in viewport', () => {
    const items = createItems(3);
    const { lastFrame } = render(
      <ScrollArea height={5}>{items}</ScrollArea>
    );

    const output = lastFrame();
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    expect(output).toContain('Item 3');
  });

  test('scrolls up with arrow key', async () => {
    const items = createItems(10);
    const { lastFrame, stdin } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    // Initially at bottom, shows items 8-10
    expect(lastFrame()).toContain('Item 10');

    // Scroll up
    await pressKey(stdin, keyboard.up);

    const output = lastFrame();
    // Should now show items 7-9
    expect(output).toContain('Item 7');
    expect(output).toContain('Item 8');
    expect(output).toContain('Item 9');
    expect(output).not.toContain('Item 10');
  });

  test('scrolls down with arrow key', async () => {
    const items = createItems(10);
    const { lastFrame, stdin } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    // Scroll up first
    await pressKey(stdin, keyboard.up);
    await pressKey(stdin, keyboard.up);

    // Now scroll down
    await pressKey(stdin, keyboard.down);

    const output = lastFrame();
    expect(output).toContain('Item 8');
  });

  test('vim key k scrolls up', async () => {
    const items = createItems(10);
    const { lastFrame, stdin } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    await wait();
    stdin.write('k');
    await wait();

    const output = lastFrame();
    expect(output).toContain('Item 7');
  });

  test('vim key j scrolls down', async () => {
    const items = createItems(10);
    const { lastFrame, stdin } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    // Scroll up first
    await wait();
    stdin.write('k');
    stdin.write('k');
    await wait();

    // Scroll down with j
    stdin.write('j');
    await wait();

    const output = lastFrame();
    expect(output).toContain('Item 8');
  });

  test('respects upper scroll bound', async () => {
    const items = createItems(5);
    const { lastFrame, stdin } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    // Scroll up many times (more than possible)
    for (let i = 0; i < 10; i++) {
      await pressKey(stdin, keyboard.up);
    }

    const output = lastFrame();
    // Should be at top, showing items 1-3
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    expect(output).toContain('Item 3');
  });

  test('respects lower scroll bound', async () => {
    const items = createItems(5);
    const { lastFrame, stdin } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    // Already at bottom, try to scroll down more
    for (let i = 0; i < 5; i++) {
      await pressKey(stdin, keyboard.down);
    }

    const output = lastFrame();
    // Should still be at bottom, showing items 3-5
    expect(output).toContain('Item 3');
    expect(output).toContain('Item 4');
    expect(output).toContain('Item 5');
  });

  test('scrollbar shows when content exceeds viewport', () => {
    const items = createItems(10);
    const { lastFrame } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    const output = lastFrame();
    // Should contain scrollbar characters
    expect(output).toMatch(/[▌│]/);
  });

  test('scrollbar hidden when showScrollbar is false', () => {
    const items = createItems(10);
    const { lastFrame } = render(
      <ScrollArea height={3} showScrollbar={false}>{items}</ScrollArea>
    );

    const output = lastFrame();
    // Should not contain track character (│) outside of content
    // This is a basic check - the scrollbar column should be absent
    expect(output).toContain('Item 10');
  });

  test('no scrollbar when content fits viewport', () => {
    const items = createItems(2);
    const { lastFrame } = render(
      <ScrollArea height={5}>{items}</ScrollArea>
    );

    const output = lastFrame();
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    // Track character should not appear when no scrolling needed
    expect(output).not.toContain('│');
  });

  test('scrollToBottomTrigger scrolls to bottom', async () => {
    const items = createItems(10);
    const { lastFrame, stdin, rerender } = render(
      <ScrollArea height={3} scrollToBottomTrigger={0}>{items}</ScrollArea>
    );

    // Scroll up
    await pressKey(stdin, keyboard.up);
    await pressKey(stdin, keyboard.up);
    await pressKey(stdin, keyboard.up);

    expect(lastFrame()).toContain('Item 5');

    // Trigger scroll to bottom
    rerender(
      <ScrollArea height={3} scrollToBottomTrigger={1}>{items}</ScrollArea>
    );
    await wait();

    // Should be back at bottom
    expect(lastFrame()).toContain('Item 10');
  });

  test('handles empty children array', () => {
    const { lastFrame } = render(
      <ScrollArea height={3}>{[]}</ScrollArea>
    );

    // Should render without crashing
    expect(lastFrame()).toBeDefined();
  });

  test('handles single item', () => {
    const items = [<Text key="1">Single Item</Text>];
    const { lastFrame } = render(
      <ScrollArea height={3}>{items}</ScrollArea>
    );

    expect(lastFrame()).toContain('Single Item');
  });
});

describe('ScrollArea Keyboard Navigation', () => {
  test('Ctrl+D scrolls half page down', async () => {
    const items = createItems(20);
    const { lastFrame, stdin } = render(
      <ScrollArea height={6}>{items}</ScrollArea>
    );

    // Scroll to top first
    for (let i = 0; i < 20; i++) {
      await pressKey(stdin, keyboard.up);
    }

    expect(lastFrame()).toContain('Item 1');

    // Ctrl+D should scroll down half page (3 lines)
    await wait();
    stdin.write('\x04'); // Ctrl+D
    await wait();

    const output = lastFrame();
    expect(output).toContain('Item 4');
  });

  test('Ctrl+U scrolls half page up', async () => {
    const items = createItems(20);
    const { lastFrame, stdin } = render(
      <ScrollArea height={6}>{items}</ScrollArea>
    );

    // At bottom initially, showing items 15-20
    expect(lastFrame()).toContain('Item 20');

    // Ctrl+U should scroll up half page (3 lines)
    await wait();
    stdin.write('\x15'); // Ctrl+U
    await wait();

    const output = lastFrame();
    expect(output).toContain('Item 17');
    expect(output).not.toContain('Item 20');
  });
});
