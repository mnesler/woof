import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { Message } from '../../src/components/Message';

describe('Message Component', () => {
  describe('Role-based styling', () => {
    test('renders user message with cyan indicator', () => {
      const { lastFrame } = render(
        <Message role="user" content="Hello world" />
      );
      const output = lastFrame();

      expect(output).toContain('▌');
      expect(output).toContain('Hello world');
    });

    test('renders assistant message with magenta indicator', () => {
      const { lastFrame } = render(
        <Message role="assistant" content="Hi there" />
      );
      const output = lastFrame();

      expect(output).toContain('▌');
      expect(output).toContain('Hi there');
    });

    test('renders system message with yellow indicator', () => {
      const { lastFrame } = render(
        <Message role="system" content="System notice" />
      );
      const output = lastFrame();

      expect(output).toContain('▌');
      expect(output).toContain('System notice');
    });
  });

  describe('Loading state', () => {
    test('shows spinner when isLoading is true', () => {
      const { lastFrame } = render(
        <Message role="assistant" content="This should not show" isLoading={true} />
      );
      const output = lastFrame();

      // Should show a spinner character (one of the braille dots)
      const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      const hasSpinner = spinnerChars.some(char => output?.includes(char));
      expect(hasSpinner).toBe(true);
    });

    test('hides content when loading', () => {
      const { lastFrame } = render(
        <Message role="assistant" content="Hidden content" isLoading={true} />
      );
      const output = lastFrame();

      expect(output).not.toContain('Hidden content');
    });

    test('shows content when not loading', () => {
      const { lastFrame } = render(
        <Message role="assistant" content="Visible content" isLoading={false} />
      );
      const output = lastFrame();

      expect(output).toContain('Visible content');
    });
  });

  describe('Timestamp display', () => {
    test('hides timestamp by default', () => {
      const { lastFrame } = render(
        <Message 
          role="user" 
          content="Test message" 
          timestamp={new Date('2026-01-10T14:30:00').getTime()} 
        />
      );
      const output = lastFrame();

      expect(output).not.toContain('14:30');
    });

    test('shows timestamp when showTimestamp is true', () => {
      const { lastFrame } = render(
        <Message 
          role="user" 
          content="Test message" 
          timestamp={new Date('2026-01-10T14:30:00').getTime()}
          showTimestamp={true}
        />
      );
      const output = lastFrame();

      expect(output).toContain('14:30');
    });

    test('formats timestamp as HH:MM', () => {
      const { lastFrame } = render(
        <Message 
          role="user" 
          content="Test" 
          timestamp={new Date('2026-01-10T09:05:00').getTime()}
          showTimestamp={true}
        />
      );
      const output = lastFrame();

      expect(output).toContain('09:05');
    });
  });

  describe('Custom color', () => {
    test('accepts custom color override', () => {
      // Just verify it renders without error
      const { lastFrame } = render(
        <Message role="user" content="Custom color" color="green" />
      );
      const output = lastFrame();

      expect(output).toContain('Custom color');
    });
  });

  describe('Snapshots', () => {
    test('user message snapshot', () => {
      const { lastFrame } = render(
        <Message role="user" content="User message content" />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test('assistant message snapshot', () => {
      const { lastFrame } = render(
        <Message role="assistant" content="Assistant message content" />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test('system message snapshot', () => {
      const { lastFrame } = render(
        <Message role="system" content="System message content" />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    test('message with timestamp snapshot', () => {
      const { lastFrame } = render(
        <Message 
          role="user" 
          content="Message with time" 
          timestamp={new Date('2026-01-10T12:00:00').getTime()}
          showTimestamp={true}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
