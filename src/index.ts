#!/usr/bin/env bun

/**
 * Woof - Agent Orchestrator CLI
 *
 * A terminal-based orchestrator CLI with LLM chat interaction.
 * Supports Anthropic and GitHub Copilot providers.
 */

export default function main(): void {
  console.log('Agent Orchestrator CLI');
  console.log('Ready to build amazing things!');
}

// Run main if executed directly
if (import.meta.main) {
  main();
}
