import type { Agent, GitHubIssue, ParsedIssue } from './types';
import { GitHubIssueSchema, ParsedIssueSchema } from './types';

// For spike: mock LLM response
// In production: this would call Anthropic/OpenAI with a fresh context
async function mockLLMParse(issue: GitHubIssue): Promise<ParsedIssue> {
  // Simulate LLM extracting structured data from issue
  const feature = issue.title.toLowerCase().replace(/^(add|implement|create)\s+/i, '');

  // Extract acceptance criteria from body (simple heuristic)
  const lines = issue.body.split('\n').filter(line => line.trim());
  const criteria = lines
    .filter(line => line.startsWith('-') || line.startsWith('*'))
    .map(line => line.replace(/^[-*]\s*/, '').trim());

  // Generate suggested test file path
  const testFile = `tests/${feature.replace(/\s+/g, '-').toLowerCase()}.test.ts`;

  return {
    issueNumber: issue.number,
    title: issue.title,
    feature,
    acceptanceCriteria: criteria.length > 0 ? criteria : ['Feature works as described'],
    suggestedTestFile: testFile,
  };
}

export const issueParserAgent: Agent<GitHubIssue, ParsedIssue> = {
  name: 'IssueParser',
  inputSchema: GitHubIssueSchema,
  outputSchema: ParsedIssueSchema,

  async run(input: GitHubIssue): Promise<ParsedIssue> {
    // IMPORTANT: This function receives a fresh input object
    // It has no access to previous agent's context or conversation history

    // In production, this would be:
    // const response = await anthropic.messages.create({
    //   model: 'claude-3-haiku',
    //   system: 'You are an issue parser...',
    //   messages: [{ role: 'user', content: JSON.stringify(input) }]
    // });

    return mockLLMParse(input);
  },
};
