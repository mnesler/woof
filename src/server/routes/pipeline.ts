import { runPipeline } from '../../agents/runner';
import { issueParserAgent } from '../../agents/issue-parser';
import { testGeneratorAgent } from '../../agents/test-generator';
import { GitHubIssueSchema, type GeneratedTest } from '../../agents/types';
import { pipelineStore } from '../store';

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [pipeline] ${message}`);
}

export function handleHealthCheck(): Response {
  log('handleHealthCheck called');
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export async function handlePipelineRequest(req: Request): Promise<Response> {
  log('handlePipelineRequest called');
  try {
    const body = await req.json() as { issue?: unknown };

    // Validate input
    const issueResult = GitHubIssueSchema.safeParse(body.issue);
    if (!issueResult.success) {
      return Response.json(
        { error: 'Invalid issue format', details: issueResult.error.issues },
        { status: 400 }
      );
    }

    const issue = issueResult.data;
    const pipelineId = crypto.randomUUID();

    // Store pipeline state
    pipelineStore.set(pipelineId, {
      id: pipelineId,
      status: 'running',
      issue,
      events: [],
      startedAt: new Date().toISOString(),
    });

    // Run pipeline async
    log(`Starting pipeline ${pipelineId} for issue #${issue.number}`);
    runPipelineAsync(pipelineId, issue);

    return Response.json({ pipelineId, status: 'started' }, { status: 202 });
  } catch (error) {
    return Response.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    );
  }
}

async function runPipelineAsync(pipelineId: string, issue: unknown): Promise<void> {
  const state = pipelineStore.get(pipelineId);
  if (!state) return;

  try {
    // Agent 1: Issue Parser
    log(`[${pipelineId}] Running IssueParser agent`);
    state.events.push({ agent: 'IssueParser', status: 'running', timestamp: Date.now() });
    pipelineStore.notifySubscribers(pipelineId, { agent: 'IssueParser', status: 'running' });

    const { results, finalOutput } = await runPipeline<unknown, GeneratedTest>(
      [issueParserAgent, testGeneratorAgent],
      issue
    );

    // Check results
    if (results[0]?.success) {
      log(`[${pipelineId}] IssueParser complete`);
      state.events.push({
        agent: 'IssueParser',
        status: 'complete',
        output: results[0].data,
        timestamp: Date.now(),
      });
      pipelineStore.notifySubscribers(pipelineId, {
        agent: 'IssueParser',
        status: 'complete',
        output: results[0].data,
      });
    }

    if (results[1]?.success) {
      log(`[${pipelineId}] TestGenerator complete`);
      state.events.push({
        agent: 'TestGenerator',
        status: 'complete',
        output: results[1].data,
        timestamp: Date.now(),
      });
      pipelineStore.notifySubscribers(pipelineId, {
        agent: 'TestGenerator',
        status: 'complete',
        output: results[1].data,
      });
    }

    log(`[${pipelineId}] Pipeline complete`);
    state.status = 'complete';
    state.result = finalOutput;
    state.completedAt = new Date().toISOString();
    pipelineStore.notifySubscribers(pipelineId, { status: 'complete', result: finalOutput });
  } catch (error) {
    log(`[${pipelineId}] Pipeline failed: ${error}`);
    state.status = 'failed';
    state.error = String(error);
    pipelineStore.notifySubscribers(pipelineId, { status: 'failed', error: String(error) });
  }
}
