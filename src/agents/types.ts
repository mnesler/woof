import { z } from 'zod';

// Input: Raw GitHub issue
export const GitHubIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()).default([]),
});
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

// Agent 1 Output: Parsed issue with structured analysis
export const ParsedIssueSchema = z.object({
  issueNumber: z.number(),
  title: z.string(),
  feature: z.string(),
  acceptanceCriteria: z.array(z.string()),
  suggestedTestFile: z.string(),
});
export type ParsedIssue = z.infer<typeof ParsedIssueSchema>;

// Agent 2 Output: Generated test
export const GeneratedTestSchema = z.object({
  filePath: z.string(),
  content: z.string(),
  issueNumber: z.number(),
});
export type GeneratedTest = z.infer<typeof GeneratedTestSchema>;

// Agent interface - each agent is a pure function
export interface Agent<TInput = unknown, TOutput = unknown> {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: z.ZodType<TInput, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputSchema: z.ZodType<TOutput, any, any>;
  run: (input: TInput) => Promise<TOutput>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAgent = Agent<any, any>;
