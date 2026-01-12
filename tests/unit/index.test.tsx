import React from 'react';
import { test, expect, describe } from 'bun:test';
import { render } from 'ink-testing-library';
import { App } from '../../src/components';

describe('CLI App', () => {
  test('displays chat interface', () => {
    const { lastFrame } = render(<App apiEnabled={false} />);
    const output = lastFrame();

    expect(output).toContain('Start a conversation...');
    expect(output).toContain('❯');
  });

  test('renders initial state snapshot', () => {
    const { lastFrame } = render(<App apiEnabled={false} />);
    expect(lastFrame()).toMatchSnapshot();
  });

  test('renders loading state snapshot', () => {
    const { lastFrame } = render(<App apiEnabled={false} initialMessages={[]} />);
    expect(lastFrame()).toMatchSnapshot();
  });
});
