import type { Agent, AnyAgent } from './types';

export interface RunResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  inputTokens?: number;
}

// Runs an agent with a fresh context
// Enforces serialization boundary - no shared references
export async function runAgent<TInput, TOutput>(
  agent: Agent<TInput, TOutput>,
  rawInput: unknown
): Promise<RunResult<TOutput>> {
  // 1. Serialize input to break any shared references
  const serialized = JSON.stringify(rawInput);
  const inputTokens = serialized.length; // Rough proxy for context size

  // 2. Parse into fresh object
  const freshInput = JSON.parse(serialized);

  // 3. Validate input against schema
  const inputResult = agent.inputSchema.safeParse(freshInput);
  if (!inputResult.success) {
    return {
      success: false,
      error: `Input validation failed: ${inputResult.error.message}`,
      inputTokens,
    };
  }

  // 4. Run agent with validated input (fresh context)
  const output = await agent.run(inputResult.data);

  // 5. Validate output against schema
  const outputResult = agent.outputSchema.safeParse(output);
  if (!outputResult.success) {
    return {
      success: false,
      error: `Output validation failed: ${outputResult.error.message}`,
      inputTokens,
    };
  }

  // 6. Serialize output to ensure clean handoff to next agent
  const cleanOutput = JSON.parse(JSON.stringify(outputResult.data));

  return {
    success: true,
    data: cleanOutput,
    inputTokens,
  };
}

// Runs a pipeline of agents, passing output of each to the next
export async function runPipeline<TInitialInput, TFinalOutput>(
  agents: AnyAgent[],
  initialInput: TInitialInput
): Promise<{ results: RunResult<unknown>[]; finalOutput?: TFinalOutput }> {
  const results: RunResult<unknown>[] = [];
  let currentInput: unknown = initialInput;

  for (const agent of agents) {
    console.log(`\n--- Running agent: ${agent.name} ---`);
    console.log(`Input size: ${JSON.stringify(currentInput).length} chars`);

    const result = await runAgent(agent, currentInput);
    results.push(result);

    if (!result.success) {
      console.error(`Agent ${agent.name} failed: ${result.error}`);
      return { results };
    }

    console.log(`Output size: ${JSON.stringify(result.data).length} chars`);
    currentInput = result.data;
  }

  return {
    results,
    finalOutput: currentInput as TFinalOutput,
  };
}
