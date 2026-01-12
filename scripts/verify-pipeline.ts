#!/usr/bin/env bun
/**
 * Manual Verification Script for Two-Agent Pipeline
 *
 * Run: bun scripts/verify-pipeline.ts
 *
 * Human should verify:
 * 1. Each agent logs its input size (proves fresh context)
 * 2. Agent 2 input size < Agent 1 input size (proves no context accumulation)
 * 3. Generated test file is syntactically valid
 * 4. No "canary" data leaks between agents
 */

import { runPipeline } from '../src/agents/runner';
import { issueParserAgent } from '../src/agents/issue-parser';
import { testGeneratorAgent } from '../src/agents/test-generator';
import type { GitHubIssue } from '../src/agents/types';

const CANARY = 'CANARY_SECRET_VERIFICATION_12345';

async function verify() {
  console.log('========================================');
  console.log('  MANUAL VERIFICATION: Two-Agent Chain  ');
  console.log('========================================\n');

  // Test issue with canary data
  const issue: GitHubIssue = {
    number: 99,
    title: 'Add calculator divide function',
    body: `Implement division for the calculator.

Acceptance criteria:
- divide(10, 2) returns 5
- divide(0, 5) returns 0
- divide(5, 0) throws error

Internal note: ${CANARY}
`,
    labels: ['feature', CANARY],
  };

  console.log('INPUT ISSUE:');
  console.log(JSON.stringify(issue, null, 2));
  console.log('\n');

  const { results, finalOutput } = await runPipeline(
    [issueParserAgent, testGeneratorAgent],
    issue
  );

  console.log('\n========================================');
  console.log('  VERIFICATION CHECKLIST');
  console.log('========================================\n');

  // Check 1: Input sizes
  const agent1Input = results[0].inputTokens!;
  const agent2Input = results[1].inputTokens!;

  console.log('[  ] CHECK 1: Fresh Context Per Agent');
  console.log(`     Agent 1 (IssueParser) input: ${agent1Input} chars`);
  console.log(`     Agent 2 (TestGenerator) input: ${agent2Input} chars`);
  console.log(`     Agent 2 should be SMALLER than Agent 1 (no context accumulation)`);
  console.log(`     Result: ${agent2Input < agent1Input ? 'PASS' : 'FAIL'}\n`);

  // Check 2: Canary not in output
  const outputStr = JSON.stringify(finalOutput);
  const canaryLeaked = outputStr.includes(CANARY);

  console.log('[  ] CHECK 2: Context Isolation (Canary Test)');
  console.log(`     Canary "${CANARY}" injected in issue body and labels`);
  console.log(`     Canary found in final output: ${canaryLeaked}`);
  console.log(`     Result: ${!canaryLeaked ? 'PASS' : 'FAIL'}\n`);

  // Check 3: Labels stripped
  const labelsInOutput = outputStr.includes('"labels"');

  console.log('[  ] CHECK 3: Schema Filtering');
  console.log(`     Raw issue had "labels" field`);
  console.log(`     Labels field in final output: ${labelsInOutput}`);
  console.log(`     Result: ${!labelsInOutput ? 'PASS' : 'FAIL'}\n`);

  // Check 4: Valid test syntax
  console.log('[  ] CHECK 4: Generated Test Syntax');
  console.log('     Inspect the test file below for valid TypeScript:\n');
  console.log('--- GENERATED TEST FILE ---');
  console.log(finalOutput!.content);
  console.log('--- END TEST FILE ---\n');

  // Summary
  const allPass =
    agent2Input < agent1Input &&
    !canaryLeaked &&
    !labelsInOutput;

  console.log('========================================');
  console.log(`  OVERALL: ${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  console.log('========================================');
}

verify();
