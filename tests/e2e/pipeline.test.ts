import { describe, test, expect } from 'bun:test';
import { runAgent, runPipeline } from '../../src/agents/runner';
import { issueParserAgent } from '../../src/agents/issue-parser';
import { testGeneratorAgent } from '../../src/agents/test-generator';
import type { GitHubIssue, ParsedIssue, GeneratedTest } from '../../src/agents/types';

describe('Two-Agent Pipeline E2E', () => {
  const sampleIssue: GitHubIssue = {
    number: 42,
    title: 'Add subtract function',
    body: `We need a subtract function.

- subtract(5, 3) returns 2
- subtract(0, 0) returns 0
`,
    labels: ['feature'],
  };

  test('full pipeline produces valid test file', async () => {
    const { results, finalOutput } = await runPipeline<GitHubIssue, GeneratedTest>(
      [issueParserAgent, testGeneratorAgent],
      sampleIssue
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    expect(finalOutput).toBeDefined();
    expect(finalOutput!.filePath).toMatch(/\.test\.ts$/);
    expect(finalOutput!.content).toContain('describe');
    expect(finalOutput!.content).toContain('test');
    expect(finalOutput!.issueNumber).toBe(42);
  });

  test('Agent 1 output matches expected schema', async () => {
    const result = await runAgent(issueParserAgent, sampleIssue);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('issueNumber');
    expect(result.data).toHaveProperty('feature');
    expect(result.data).toHaveProperty('acceptanceCriteria');
    expect(result.data).toHaveProperty('suggestedTestFile');
  });

  test('Agent 2 only receives parsed schema, not raw issue', async () => {
    // First, get Agent 1 output
    const agent1Result = await runAgent(issueParserAgent, sampleIssue);
    expect(agent1Result.success).toBe(true);

    const parsedIssue = agent1Result.data as ParsedIssue;

    // Verify the parsed output does NOT contain raw issue fields
    // that should have been filtered out
    const serialized = JSON.stringify(parsedIssue);
    expect(serialized).not.toContain('"body"');
    expect(serialized).not.toContain('"labels"');

    // Agent 2 should work with just the parsed data
    const agent2Result = await runAgent(testGeneratorAgent, parsedIssue);
    expect(agent2Result.success).toBe(true);
  });
});

describe('Context Isolation', () => {
  test('input is serialized to break object references', async () => {
    const issue: GitHubIssue = {
      number: 1,
      title: 'Test',
      body: '- criterion 1',
      labels: [],
    };

    // Add a non-serializable property (would break if passed through)
    (issue as Record<string, unknown>).hiddenFn = () => 'secret';

    const result = await runAgent(issueParserAgent, issue);

    // Should succeed because serialization strips the function
    expect(result.success).toBe(true);
  });

  test('each agent receives independent input copy', async () => {
    const issue: GitHubIssue = {
      number: 1,
      title: 'Test feature',
      body: '- works correctly',
      labels: [],
    };

    const result1 = await runAgent(issueParserAgent, issue);
    const result2 = await runAgent(issueParserAgent, issue);

    // Both should succeed independently
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Outputs should be equal but not same reference
    expect(result1.data).toEqual(result2.data);
    expect(result1.data).not.toBe(result2.data);
  });

  test('invalid input schema is rejected', async () => {
    const badInput = {
      // Missing required fields
      title: 'Test',
    };

    const result = await runAgent(issueParserAgent, badInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Input validation failed');
  });

  test('canary data does not leak between agents', async () => {
    // Inject canary into issue that should NOT appear in test output
    const issueWithCanary: GitHubIssue = {
      number: 99,
      title: 'Normal feature',
      body: '- CANARY_SECRET_12345\n- normal criterion',
      labels: ['CANARY_LABEL'],
    };

    const { finalOutput } = await runPipeline<GitHubIssue, GeneratedTest>(
      [issueParserAgent, testGeneratorAgent],
      issueWithCanary
    );

    // The label should be stripped (not in ParsedIssue schema)
    expect(JSON.stringify(finalOutput)).not.toContain('CANARY_LABEL');
  });
});

describe('Human Verification Points', () => {
  test('pipeline logs show input sizes for each agent', async () => {
    const issue: GitHubIssue = {
      number: 1,
      title: 'Test',
      body: '- criterion',
      labels: [],
    };

    const { results } = await runPipeline<GitHubIssue, GeneratedTest>(
      [issueParserAgent, testGeneratorAgent],
      issue
    );

    // Each result should have inputTokens for human to verify
    results.forEach((result) => {
      expect(result.inputTokens).toBeDefined();
      expect(result.inputTokens).toBeGreaterThan(0);
    });
  });

  test('generated test file is syntactically valid', async () => {
    const issue: GitHubIssue = {
      number: 42,
      title: 'Add multiply function',
      body: '- multiply(2, 3) returns 6',
      labels: [],
    };

    const { finalOutput } = await runPipeline<GitHubIssue, GeneratedTest>(
      [issueParserAgent, testGeneratorAgent],
      issue
    );

    // Should be parseable as TypeScript (basic check)
    expect(finalOutput!.content).toContain('import');
    expect(finalOutput!.content).toContain('describe(');
    expect(finalOutput!.content).toContain('test(');
    expect(finalOutput!.content).toContain('expect');

    // Braces should be balanced (rough check)
    const opens = (finalOutput!.content.match(/{/g) || []).length;
    const closes = (finalOutput!.content.match(/}/g) || []).length;
    expect(opens).toBe(closes);
  });
});
