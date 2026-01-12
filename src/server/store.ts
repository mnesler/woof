import type { ServerWebSocket } from 'bun';
import type { GitHubIssue, GeneratedTest } from '../agents/types';

export interface PipelineEvent {
  agent?: string;
  status: string;
  output?: unknown;
  error?: string;
  timestamp?: number;
  result?: GeneratedTest;
}

export interface PipelineState {
  id: string;
  status: 'running' | 'complete' | 'failed';
  issue: GitHubIssue;
  events: PipelineEvent[];
  result?: GeneratedTest;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

class PipelineStore {
  private pipelines = new Map<string, PipelineState>();
  private subscribers = new Map<string, Set<ServerWebSocket<unknown>>>();

  set(id: string, state: PipelineState): void {
    this.pipelines.set(id, state);
  }

  get(id: string): PipelineState | undefined {
    return this.pipelines.get(id);
  }

  subscribe(pipelineId: string, ws: ServerWebSocket<unknown>): void {
    if (!this.subscribers.has(pipelineId)) {
      this.subscribers.set(pipelineId, new Set());
    }
    this.subscribers.get(pipelineId)!.add(ws);

    // Send current state
    const state = this.pipelines.get(pipelineId);
    if (state) {
      ws.send(JSON.stringify({ type: 'state', data: state }));
    }
  }

  unsubscribe(pipelineId: string, ws: ServerWebSocket<unknown>): void {
    this.subscribers.get(pipelineId)?.delete(ws);
  }

  unsubscribeAll(ws: ServerWebSocket<unknown>): void {
    for (const subscribers of this.subscribers.values()) {
      subscribers.delete(ws);
    }
  }

  notifySubscribers(pipelineId: string, event: PipelineEvent): void {
    const subscribers = this.subscribers.get(pipelineId);
    if (!subscribers) return;

    const message = JSON.stringify({ type: 'event', data: event });
    for (const ws of subscribers) {
      ws.send(message);
    }
  }
}

export const pipelineStore = new PipelineStore();
