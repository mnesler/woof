#!/usr/bin/env bun

/**
 * Woof - Agent Orchestrator CLI
 *
 * A terminal-based orchestrator CLI with LLM chat interaction.
 * Supports Anthropic and GitHub Copilot providers.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './components';

export default function main(): void {
  render(<App />);
}

if (import.meta.main) {
  main();
}
