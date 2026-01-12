import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { MainMenu } from '../../src/components/MainMenu';
import { wait, pressKey, navigateDown, navigateUp, keyboard } from '../utils';

describe('MainMenu Component', () => {
  test('renders menu with all options', () => {
    const { lastFrame } = render(<MainMenu onSelect={() => {}} />);
    const output = lastFrame();

    expect(output).toContain('Connect');
    expect(output).toContain('Switch Model');
    expect(output).toContain('Exit');
  });

  test('renders initial state snapshot', () => {
    const { lastFrame } = render(<MainMenu onSelect={() => {}} />);
    expect(lastFrame()).toMatchSnapshot();
  });

  test('first item is selected by default', () => {
    const { lastFrame } = render(<MainMenu onSelect={() => {}} />);
    const output = lastFrame();

    // First item should have the selector indicator and padded label
    expect(output).toContain('❯');
    expect(output).toContain('Connect');
  });

  test('displays keyboard hints', () => {
    const { lastFrame } = render(<MainMenu onSelect={() => {}} />);
    const output = lastFrame();

    expect(output).toContain('↑↓ navigate');
    expect(output).toContain('enter select');
    expect(output).toContain('esc close');
  });

  test('navigates down with arrow key', async () => {
    const { lastFrame, stdin } = render(<MainMenu onSelect={() => {}} />);

    await pressKey(stdin, keyboard.down);

    const output = lastFrame();
    expect(output).toContain('❯');
    expect(output).toContain('Switch Model');
  });

  test('navigates up with arrow key', async () => {
    const { lastFrame, stdin } = render(<MainMenu onSelect={() => {}} />);

    await navigateDown(stdin);
    await pressKey(stdin, keyboard.up);

    const output = lastFrame();
    expect(output).toContain('❯');
    expect(output).toContain('Connect');
  });

  test('wraps to bottom when navigating up from first item', async () => {
    const { lastFrame, stdin } = render(<MainMenu onSelect={() => {}} />);

    await pressKey(stdin, keyboard.up);

    const output = lastFrame();
    expect(output).toContain('❯');
    expect(output).toContain('Exit');
  });

  test('wraps to top when navigating down from last item', async () => {
    const { lastFrame, stdin } = render(<MainMenu onSelect={() => {}} />);

    await navigateDown(stdin, 3);

    const output = lastFrame();
    expect(output).toContain('❯');
    expect(output).toContain('Connect');
  });

  test('calls onSelect with connect action', async () => {
    let selectedAction: unknown = null;

    const { stdin } = render(
      <MainMenu onSelect={(action) => { selectedAction = action; }} />
    );

    await pressKey(stdin, keyboard.enter);

    expect(selectedAction).toBe('connect');
  });

  test('calls onSelect with switch-model action', async () => {
    let selectedAction: unknown = null;

    const { stdin } = render(
      <MainMenu onSelect={(action) => { selectedAction = action; }} />
    );

    await navigateDown(stdin);
    await pressKey(stdin, keyboard.enter);

    expect(selectedAction).toBe('switch-model');
  });

  test('calls onSelect with exit action', async () => {
    let selectedAction: unknown = null;

    const { stdin } = render(
      <MainMenu onSelect={(action) => { selectedAction = action; }} />
    );

    await navigateDown(stdin, 2);
    await pressKey(stdin, keyboard.enter);

    expect(selectedAction).toBe('exit');
  });

  test('calls onClose when escape is pressed', async () => {
    let closeCalled = false;

    const { stdin } = render(
      <MainMenu onSelect={() => {}} onClose={() => { closeCalled = true; }} />
    );

    await pressKey(stdin, keyboard.escape);

    expect(closeCalled).toBe(true);
  });

  test('snapshot after navigating to second item', async () => {
    const { lastFrame, stdin } = render(<MainMenu onSelect={() => {}} />);

    await pressKey(stdin, keyboard.down);

    expect(lastFrame()).toMatchSnapshot();
  });
});
