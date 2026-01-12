import { runPipeline } from './agents/runner';
import { issueParserAgent } from './agents/issue-parser';
import { testGeneratorAgent } from './agents/test-generator';
import type { GitHubIssue, GeneratedTest } from './agents/types';

export async function runTDDPipeline(issue: GitHubIssue): Promise<GeneratedTest | null> {
  console.log('=== TDD Pipeline Started ===');
  console.log(`Processing issue #${issue.number}: ${issue.title}`);

  const { results, finalOutput } = await runPipeline<GitHubIssue, GeneratedTest>(
    [issueParserAgent, testGeneratorAgent],
    issue
  );

  // Log results for human verification
  console.log('\n=== Pipeline Results ===');
  results.forEach((result, i) => {
    const agentName = i === 0 ? 'IssueParser' : 'TestGenerator';
    console.log(`${agentName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.inputTokens) {
      console.log(`  Input size: ${result.inputTokens} chars`);
    }
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
    }
  });

  if (finalOutput) {
    console.log('\n=== Generated Test ===');
    console.log(`File: ${finalOutput.filePath}`);
    console.log('---');
    console.log(finalOutput.content);
    console.log('---');
  }

  return finalOutput ?? null;
}

// CLI entry point
if (import.meta.main) {
  const sampleIssue: GitHubIssue = {
    number: 42,
    title: 'Add subtract function',
    body: `We need a subtract function in the calculator module.

Acceptance criteria:
- subtract(5, 3) returns 2
- subtract(0, 0) returns 0
- subtract(10, 15) returns -5
`,
    labels: ['feature', 'good-first-issue'],
  };

  runTDDPipeline(sampleIssue);
}
