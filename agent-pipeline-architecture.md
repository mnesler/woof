# Agent Pipeline Orchestrator Architecture

**Tech Stack:** Node.js + TypeScript (Following Claude Code's Architecture)

## Executive Summary

This document outlines an extensible agent pipeline system where each agent performs a specific job and routes to the next agent based on its findings. Built with Node.js and TypeScript, following the proven patterns used by Claude Code.

---

## Core Technology Stack

### Runtime & Language
- **Node.js** >= 18.0.0
- **TypeScript** 5.x with strict mode
- **ES Modules** (type: "module")

### Key Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.40.0",
    "commander": "^12.0.0",
    "zod": "^3.22.0",
    "pino": "^8.0.0",
    "better-sqlite3": "^9.0.0",
    "p-queue": "^8.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Architecture Overview

### 1. Orchestrator Pattern

The orchestrator manages the entire pipeline flow, spawning specialized agents and routing based on their responses.

```typescript
// src/orchestrator/pipeline.ts
import Anthropic from '@anthropic-ai/sdk';
import { PipelineState } from './state';
import { AgentRegistry } from './registry';
import { AgentResult, AgentConfig } from './types';
import pino from 'pino';

export class AgentPipelineOrchestrator {
  private anthropic: Anthropic;
  private registry: AgentRegistry;
  private state: PipelineState;
  private logger: pino.Logger;
  private maxIterations: number = 20;

  constructor(config: OrchestratorConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
    this.registry = new AgentRegistry(config.agentsConfig);
    this.state = new PipelineState(config.stateDbPath);
    this.logger = pino({
      level: config.logLevel || 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    });
  }

  async execute(task: string): Promise<PipelineResult> {
    this.logger.info({ task }, 'Starting pipeline execution');

    let currentAgent = 'analyzer';
    let iterations = 0;
    const history: AgentTransition[] = [];

    while (currentAgent !== 'COMPLETE' && iterations < this.maxIterations) {
      iterations++;

      this.logger.info({
        agent: currentAgent,
        iteration: iterations
      }, '→ Routing to agent');

      // Get agent configuration
      const agentConfig = this.registry.getAgent(currentAgent);
      if (!agentConfig) {
        throw new Error(`Unknown agent: ${currentAgent}`);
      }

      // Spawn agent and get result
      const result = await this.spawnAgent(
        currentAgent,
        agentConfig,
        this.state.getContext()
      );

      // Update state
      this.state.update(result.data);
      history.push({
        agent: currentAgent,
        nextAgent: result.nextAgent,
        reason: result.routingReason,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
      });

      // Save checkpoint
      await this.state.saveCheckpoint(currentAgent, result);

      // Circuit breaker: detect loops
      if (this.detectLoop(history, currentAgent)) {
        this.logger.error('Loop detected in pipeline, breaking');
        throw new Error('Pipeline loop detected');
      }

      // Route to next agent
      currentAgent = result.nextAgent;
    }

    if (iterations >= this.maxIterations) {
      throw new Error('Pipeline exceeded maximum iterations');
    }

    return {
      success: true,
      history,
      finalState: this.state.getFinalResult(),
      iterations,
    };
  }

  private async spawnAgent(
    agentName: string,
    config: AgentConfig,
    context: PipelineContext
  ): Promise<AgentResult> {
    const startTime = Date.now();

    this.logger.debug({ agentName, config }, 'Spawning agent');

    // Build prompt with context
    const prompt = this.buildAgentPrompt(agentName, config, context);

    try {
      const response = await this.anthropic.messages.create({
        model: config.model || 'claude-sonnet-4-5-20250929',
        max_tokens: config.maxTokens || 8000,
        temperature: config.temperature || 1.0,
        system: config.systemPrompt,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const duration = Date.now() - startTime;

      // Parse agent response
      const result = this.parseAgentResponse(
        agentName,
        response.content[0].type === 'text'
          ? response.content[0].text
          : ''
      );

      this.logger.info({
        agentName,
        nextAgent: result.nextAgent,
        duration
      }, 'Agent completed');

      return result;
    } catch (error) {
      this.logger.error({ agentName, error }, 'Agent execution failed');
      throw error;
    }
  }

  private buildAgentPrompt(
    agentName: string,
    config: AgentConfig,
    context: PipelineContext
  ): string {
    return `
# Agent Context
You are the "${agentName}" agent in a multi-agent pipeline.

# Current Pipeline State
${JSON.stringify(context, null, 2)}

# Your Task
${config.task}

# Available Next Agents
${config.routes.join(', ')}, COMPLETE

# Response Format
You MUST respond with a JSON object in this exact format:
\`\`\`json
{
  "status": "success" | "error" | "needs_input",
  "data": {
    "findings": "Your analysis/results here",
    "artifacts": ["file1.ts", "file2.ts"]
  },
  "nextAgent": "agent_name" | "COMPLETE",
  "routingReason": "Why you chose this next agent",
  "confidence": 0.0 to 1.0
}
\`\`\`
`;
  }

  private parseAgentResponse(
    agentName: string,
    responseText: string
  ): AgentResult {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    try {
      const parsed = JSON.parse(jsonText);
      return AgentResultSchema.parse(parsed);
    } catch (error) {
      this.logger.error({ agentName, error }, 'Failed to parse agent response');
      throw new Error(`Agent ${agentName} returned invalid response format`);
    }
  }

  private detectLoop(
    history: AgentTransition[],
    currentAgent: string
  ): boolean {
    // Check if we've visited the same agent more than 3 times
    const visits = history.filter(h => h.agent === currentAgent).length;
    return visits > 3;
  }
}
```

---

## 2. Type Definitions

```typescript
// src/orchestrator/types.ts
import { z } from 'zod';

// Agent Result Schema
export const AgentResultSchema = z.object({
  status: z.enum(['success', 'error', 'needs_input']),
  data: z.object({
    findings: z.string(),
    artifacts: z.array(z.string()).optional(),
  }),
  nextAgent: z.string(),
  routingReason: z.string(),
  confidence: z.number().min(0).max(1),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

// Agent Configuration
export interface AgentConfig {
  name: string;
  type: 'analyzer' | 'planner' | 'executor' | 'reviewer' | 'tester';
  model: string;
  systemPrompt: string;
  task: string;
  routes: string[];
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
}

// Pipeline Context
export interface PipelineContext {
  task: string;
  codebaseMap?: Record<string, any>;
  findings?: Record<string, any>;
  previousAgents?: string[];
  accumulated?: Record<string, any>;
}

// Agent Transition
export interface AgentTransition {
  agent: string;
  nextAgent: string;
  reason: string;
  confidence: number;
  timestamp: string;
}

// Orchestrator Config
export interface OrchestratorConfig {
  apiKey: string;
  agentsConfig: string;
  stateDbPath: string;
  logLevel?: string;
  maxIterations?: number;
}

// Pipeline Result
export interface PipelineResult {
  success: boolean;
  history: AgentTransition[];
  finalState: any;
  iterations: number;
}
```

---

## 3. Agent Registry

```typescript
// src/orchestrator/registry.ts
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { AgentConfig } from './types';

export class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map();

  constructor(configPath: string) {
    this.loadAgents(configPath);
  }

  private loadAgents(configPath: string): void {
    const content = readFileSync(configPath, 'utf-8');
    const config = parseYaml(content);

    for (const agent of config.agents) {
      this.agents.set(agent.name, agent);
    }
  }

  getAgent(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  registerAgent(agent: AgentConfig): void {
    this.agents.set(agent.name, agent);
  }

  listAgentNames(): string[] {
    return Array.from(this.agents.keys());
  }
}
```

---

## 4. State Management

```typescript
// src/orchestrator/state.ts
import Database from 'better-sqlite3';
import { PipelineContext, AgentResult } from './types';

export class PipelineState {
  private db: Database.Database;
  private context: PipelineContext;
  private sessionId: string;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.sessionId = this.generateSessionId();
    this.context = {
      task: '',
      previousAgents: [],
      accumulated: {},
    };
    this.initDb();
  }

  private initDb(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        result TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        state TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_session
      ON agent_history(session_id);
    `);
  }

  update(data: Record<string, any>): void {
    this.context.accumulated = {
      ...this.context.accumulated,
      ...data,
    };
  }

  getContext(): PipelineContext {
    return { ...this.context };
  }

  async saveCheckpoint(agentName: string, result: AgentResult): Promise<void> {
    // Save agent result to history
    const insert = this.db.prepare(`
      INSERT INTO agent_history (session_id, agent_name, result)
      VALUES (?, ?, ?)
    `);

    insert.run(
      this.sessionId,
      agentName,
      JSON.stringify(result)
    );

    // Save current state as checkpoint
    const checkpointInsert = this.db.prepare(`
      INSERT INTO checkpoints (session_id, state)
      VALUES (?, ?)
    `);

    checkpointInsert.run(
      this.sessionId,
      JSON.stringify(this.context)
    );

    // Track agent in history
    if (!this.context.previousAgents) {
      this.context.previousAgents = [];
    }
    this.context.previousAgents.push(agentName);
  }

  getFinalResult(): any {
    return this.context.accumulated;
  }

  getHistory(): any[] {
    const query = this.db.prepare(`
      SELECT agent_name, result, timestamp
      FROM agent_history
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    return query.all(this.sessionId);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  close(): void {
    this.db.close();
  }
}
```

---

## 5. Agent Configuration (YAML)

```yaml
# config/agents.yaml
agents:
  - name: analyzer
    type: analyzer
    model: claude-sonnet-4-5-20250929
    systemPrompt: |
      You are a code analyzer agent. Your job is to analyze codebases,
      identify patterns, assess complexity, and determine what needs to be done.
    task: |
      Analyze the provided codebase context and determine:
      1. Complexity level (0.0 - 1.0)
      2. Required changes
      3. Whether requirements are clear
    routes:
      - planner
      - executor
      - clarifier
    maxTokens: 8000
    temperature: 1.0

  - name: planner
    type: planner
    model: claude-opus-4-5-20251101
    systemPrompt: |
      You are a software architect agent. Your job is to create detailed
      implementation plans for complex changes.
    task: |
      Create a detailed implementation plan including:
      1. Step-by-step tasks
      2. Files to modify
      3. Potential risks
      4. Testing strategy
    routes:
      - executor
      - analyzer
      - security_reviewer
    maxTokens: 16000
    temperature: 1.0

  - name: executor
    type: executor
    model: claude-sonnet-4-5-20250929
    systemPrompt: |
      You are a code execution agent. Your job is to implement changes
      based on plans or direct instructions.
    task: |
      Implement the required changes. Provide:
      1. Files modified
      2. Changes made
      3. Whether implementation is complete
    routes:
      - reviewer
      - tester
      - COMPLETE
    maxTokens: 8000
    temperature: 1.0

  - name: reviewer
    type: reviewer
    model: claude-sonnet-4-5-20250929
    systemPrompt: |
      You are a code reviewer agent. Your job is to review code changes
      for quality, security, and best practices.
    task: |
      Review the implemented changes for:
      1. Code quality
      2. Security vulnerabilities
      3. Best practices
      4. Potential bugs
    routes:
      - executor
      - tester
      - COMPLETE
    maxTokens: 8000
    temperature: 1.0

  - name: tester
    type: tester
    model: claude-sonnet-4-5-20250929
    systemPrompt: |
      You are a testing agent. Your job is to create and run tests
      for code changes.
    task: |
      Test the implemented changes:
      1. Write appropriate tests
      2. Run tests
      3. Report results
    routes:
      - executor
      - COMPLETE
    maxTokens: 8000
    temperature: 1.0

  - name: clarifier
    type: clarifier
    model: claude-sonnet-4-5-20250929
    systemPrompt: |
      You are a requirements clarification agent. Your job is to
      identify unclear requirements and ask for clarification.
    task: |
      Identify what's unclear and formulate questions for the user.
    routes:
      - analyzer
      - planner
    maxTokens: 4000
    temperature: 1.0

  - name: security_reviewer
    type: reviewer
    model: claude-sonnet-4-5-20250929
    systemPrompt: |
      You are a security review agent. Your job is to identify
      security vulnerabilities and suggest fixes.
    task: |
      Review for security issues:
      1. OWASP Top 10 vulnerabilities
      2. Authentication/authorization issues
      3. Data exposure risks
      4. Injection vulnerabilities
    routes:
      - executor
      - planner
      - COMPLETE
    maxTokens: 8000
    temperature: 1.0
```

---

## 6. CLI Interface

```typescript
// src/cli.ts
import { Command } from 'commander';
import { AgentPipelineOrchestrator } from './orchestrator/pipeline';
import { config } from 'dotenv';
import pino from 'pino';

config(); // Load .env

const logger = pino({
  transport: { target: 'pino-pretty' }
});

const program = new Command();

program
  .name('agent-pipeline')
  .description('Multi-agent pipeline orchestrator')
  .version('1.0.0');

program
  .command('run')
  .description('Run the agent pipeline')
  .argument('<task>', 'Task description')
  .option('-c, --config <path>', 'Agent config file', 'config/agents.yaml')
  .option('-d, --db <path>', 'State database path', '.pipeline/state.db')
  .option('-v, --verbose', 'Verbose logging')
  .option('--max-iterations <n>', 'Maximum iterations', '20')
  .action(async (task: string, options) => {
    try {
      const orchestrator = new AgentPipelineOrchestrator({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        agentsConfig: options.config,
        stateDbPath: options.db,
        logLevel: options.verbose ? 'debug' : 'info',
        maxIterations: parseInt(options.maxIterations),
      });

      logger.info({ task }, 'Starting pipeline');
      const result = await orchestrator.execute(task);

      logger.info({
        iterations: result.iterations,
        success: result.success,
      }, 'Pipeline completed');

      console.log('\n=== Pipeline Result ===');
      console.log(JSON.stringify(result.finalState, null, 2));
      console.log('\n=== Agent History ===');
      result.history.forEach((transition, i) => {
        console.log(`${i + 1}. ${transition.agent} → ${transition.nextAgent}`);
        console.log(`   Reason: ${transition.reason}`);
        console.log(`   Confidence: ${(transition.confidence * 100).toFixed(1)}%`);
      });

    } catch (error) {
      logger.error({ error }, 'Pipeline failed');
      process.exit(1);
    }
  });

program
  .command('history')
  .description('View pipeline execution history')
  .option('-d, --db <path>', 'State database path', '.pipeline/state.db')
  .action((options) => {
    // Implementation for viewing history
    logger.info('Viewing pipeline history...');
  });

program
  .command('agents')
  .description('List registered agents')
  .option('-c, --config <path>', 'Agent config file', 'config/agents.yaml')
  .action((options) => {
    // Implementation for listing agents
    logger.info('Listing agents...');
  });

program.parse();
```

---

## 7. Project Structure

```
agent-pipeline/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── orchestrator/
│   │   ├── pipeline.ts           # Main orchestrator
│   │   ├── registry.ts           # Agent registry
│   │   ├── state.ts              # State management
│   │   └── types.ts              # Type definitions
│   ├── agents/                   # Custom agent implementations
│   │   ├── base.ts               # Base agent class
│   │   └── plugins/              # Plugin agents
│   └── utils/
│       ├── logger.ts             # Logging utilities
│       └── validation.ts         # Schema validation
├── config/
│   ├── agents.yaml               # Agent definitions
│   └── routing.yaml              # Routing rules (optional)
├── .pipeline/                    # Runtime state (gitignored)
│   ├── state.db                  # SQLite database
│   └── logs/                     # Log files
└── tests/
    ├── orchestrator.test.ts
    ├── agents.test.ts
    └── integration.test.ts
```

---

## 8. Advanced Features

### Parallel Agent Execution

```typescript
// src/orchestrator/parallel.ts
import PQueue from 'p-queue';

export class ParallelOrchestrator extends AgentPipelineOrchestrator {
  private queue: PQueue;

  constructor(config: OrchestratorConfig) {
    super(config);
    this.queue = new PQueue({ concurrency: 3 });
  }

  async executeParallel(agents: string[]): Promise<AgentResult[]> {
    const tasks = agents.map(agentName =>
      this.queue.add(async () => {
        const config = this.registry.getAgent(agentName);
        if (!config) throw new Error(`Unknown agent: ${agentName}`);

        return this.spawnAgent(
          agentName,
          config,
          this.state.getContext()
        );
      })
    );

    return Promise.all(tasks);
  }
}
```

### Dynamic Routing Rules

```typescript
// src/orchestrator/routing.ts
export class RoutingEngine {
  evaluateCondition(
    condition: string,
    context: PipelineContext
  ): boolean {
    // Simple expression evaluator
    // e.g., "findings.complexity > 0.7"
    try {
      const fn = new Function('ctx', `return ${condition}`);
      return fn(context);
    } catch {
      return false;
    }
  }

  determineNextAgent(
    agentName: string,
    result: AgentResult,
    rules: RoutingRules
  ): string {
    const agentRules = rules[agentName];
    if (!agentRules) return result.nextAgent;

    for (const [condition, nextAgent] of Object.entries(agentRules.conditions)) {
      if (this.evaluateCondition(condition, result.data)) {
        return agentRules.routes[nextAgent];
      }
    }

    return result.nextAgent;
  }
}
```

### Event System

```typescript
// src/orchestrator/events.ts
import { EventEmitter } from 'events';

export class PipelineEventEmitter extends EventEmitter {
  emitAgentStart(agentName: string): void {
    this.emit('agent:start', { agentName, timestamp: Date.now() });
  }

  emitAgentComplete(agentName: string, result: AgentResult): void {
    this.emit('agent:complete', { agentName, result, timestamp: Date.now() });
  }

  emitAgentError(agentName: string, error: Error): void {
    this.emit('agent:error', { agentName, error, timestamp: Date.now() });
  }

  emitPipelineComplete(result: PipelineResult): void {
    this.emit('pipeline:complete', { result, timestamp: Date.now() });
  }
}
```

---

## 9. Usage Examples

### Basic Usage

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY

# Run pipeline
npm run build
node dist/cli.js run "Add user authentication to the API"

# View history
node dist/cli.js history

# List agents
node dist/cli.js agents
```

### Programmatic Usage

```typescript
import { AgentPipelineOrchestrator } from './orchestrator/pipeline';

const orchestrator = new AgentPipelineOrchestrator({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  agentsConfig: './config/agents.yaml',
  stateDbPath: './.pipeline/state.db',
  logLevel: 'info',
});

const result = await orchestrator.execute(
  'Refactor the authentication module to use JWT tokens'
);

console.log(result.finalState);
```

---

## 10. Extension Points

### Custom Agent Types

```typescript
// src/agents/custom-analyzer.ts
import { BaseAgent } from './base';

export class CustomAnalyzerAgent extends BaseAgent {
  async execute(context: PipelineContext): Promise<AgentResult> {
    // Custom logic here
    const findings = await this.analyzeCodebase(context);

    return {
      status: 'success',
      data: { findings },
      nextAgent: findings.complexity > 0.7 ? 'planner' : 'executor',
      routingReason: 'Based on complexity analysis',
      confidence: 0.95,
    };
  }
}
```

### Plugin System

```typescript
// src/plugins/slack-notifier.ts
export class SlackNotifierPlugin {
  constructor(private webhookUrl: string) {}

  onAgentComplete(event: AgentCompleteEvent): void {
    // Send notification to Slack
    fetch(this.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        text: `Agent ${event.agentName} completed → ${event.result.nextAgent}`,
      }),
    });
  }
}
```

---

## Key Design Principles

1. **Type Safety**: Zod schemas validate all agent responses
2. **State Persistence**: SQLite ensures pipeline can resume after failures
3. **Observability**: Structured logging with Pino for debugging
4. **Circuit Breakers**: Loop detection prevents infinite cycles
5. **Extensibility**: Plugin system and custom agents
6. **Configuration-Driven**: YAML-based agent definitions
7. **Error Handling**: Retry logic and graceful degradation

---

## Performance Considerations

- **Concurrent Agents**: Use `p-queue` for parallel execution when possible
- **Streaming**: Consider streaming responses for long-running agents
- **Caching**: Cache agent results for identical inputs
- **Database**: SQLite with WAL mode for better concurrency
- **Token Limits**: Monitor token usage per agent to control costs

---

## Security Considerations

- **API Keys**: Never commit .env files, use environment variables
- **Input Validation**: Validate all agent responses with Zod
- **Sandboxing**: Consider running agents in isolated environments
- **Audit Logs**: Track all agent actions in database
- **Rate Limiting**: Implement rate limiting for API calls

---

## Next Steps

1. Implement the core orchestrator
2. Create agent configurations
3. Build CLI interface
4. Add monitoring and metrics
5. Create integration tests
6. Deploy to production environment
