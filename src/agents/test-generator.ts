import type { Agent, ParsedIssue, GeneratedTest } from './types';
import { ParsedIssueSchema, GeneratedTestSchema } from './types';

// For spike: mock LLM response
// In production: this would call Anthropic/OpenAI with a fresh context
async function mockLLMGenerateTest(parsed: ParsedIssue): Promise<GeneratedTest> {
  // Generate test cases from acceptance criteria
  const testCases = parsed.acceptanceCriteria
    .map((criterion, i) => {
      const testName = criterion.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return `  test('${testName}', () => {
    // TODO: Implement test for: ${criterion}
    throw new Error('Not implemented');
  });`;
    })
    .join('\n\n');

  const content = `import { describe, test, expect } from 'bun:test';

// Auto-generated test for issue #${parsed.issueNumber}: ${parsed.title}
// Feature: ${parsed.feature}

describe('${parsed.feature}', () => {
${testCases}
});
`;

  return {
    filePath: parsed.suggestedTestFile,
    content,
    issueNumber: parsed.issueNumber,
  };
}

export const testGeneratorAgent: Agent<ParsedIssue, GeneratedTest> = {
  name: 'TestGenerator',
  inputSchema: ParsedIssueSchema,
  outputSchema: GeneratedTestSchema,

  async run(input: ParsedIssue): Promise<GeneratedTest> {
    // IMPORTANT: This function receives a fresh input object
    // It has NO access to:
    // - The original GitHubIssue (only the parsed version)
    // - The IssueParser agent's internal state
    // - Any conversation history from previous agents

    // In production, this would be:
    // const response = await anthropic.messages.create({
    //   model: 'claude-3-haiku',
    //   system: 'You are a test generator...',
    //   messages: [{ role: 'user', content: JSON.stringify(input) }]
    // });

    return mockLLMGenerateTest(input);
  },
};
