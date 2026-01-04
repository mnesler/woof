# GitHub TDD Agent Pipeline - Planning Document

**Date:** 2026-01-04  
**Project:** Woof - Agent Orchestrator CLI  
**Goal:** Autonomous GitHub issue → TDD → Implementation → CI/CD monitoring pipeline

---

## Executive Summary

Build a multi-agent system where specialized agents collaborate to autonomously process GitHub issues through a full TDD development lifecycle, with each agent visible in separate tmux panes and support for multiple LLM providers (GitHub Copilot, Claude, etc.).

---

## Agent Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GITHUB ISSUES AGENT                          │
│  • Monitors repository issues                                       │
│  • Prioritizes based on labels, age, complexity                     │
│  • Selects next issue to work on                                    │
│  • Creates work context for downstream agents                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           TDD AGENT                                 │
│  • Reads issue requirements                                         │
│  • Writes failing test(s) that validate the fix                     │
│  • Commits test to feature branch                                   │
│  • Verifies tests fail (red phase)                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SOFTWARE ENGINEER AGENT                        │
│  • Reads failing tests                                              │
│  • Analyzes codebase context                                        │
│  • Implements code to make tests pass                               │
│  • Runs tests iteratively until green                               │
│  • Refactors if needed (green → refactor phase)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       GITHUB COMMIT AGENT                           │
│  • Reviews changes made                                             │
│  • Generates semantic commit message                                │
│  • Commits code with issue reference                                │
│  • Creates/updates pull request                                     │
│  • Monitors CI/CD pipeline status                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   CI PASSES      │  │    CI FAILS      │
         │   → COMPLETE     │  │    → ROUTE       │
         └──────────────────┘  └────────┬─────────┘
                                        │
                    ┌───────────────────┴──────────────────┐
                    │                                       │
                    ▼                                       ▼
         ┌──────────────────────┐              ┌──────────────────────┐
         │ FIXABLE AUTOMATICALLY │              │  NEEDS HUMAN INPUT   │
         │ → Back to TDD Agent   │              │  → Create New Issue  │
         │   (create fix issue)  │              │  → Alert Human       │
         └──────────────────────┘              └──────────────────────┘
```

---

## Agent Specifications

### 1. GitHub Issues Agent

**Responsibilities:**
- Monitor repository issues (open, labeled, assigned)
- Filter and prioritize issues based on:
  - Labels (bug, enhancement, priority)
  - Issue age
  - Complexity estimation
  - Dependencies on other issues
- Select next issue to process
- Parse issue body for requirements
- Create work context (issue #, title, description, acceptance criteria)

**Inputs:**
- GitHub repository (owner/repo)
- Issue filters (labels, milestones)
- Priority rules

**Outputs:**
- Selected issue details
- Work context object
- Next agent: `tdd-agent`

**GitHub API Calls:**
- `GET /repos/{owner}/{repo}/issues` - List issues
- `GET /repos/{owner}/{repo}/issues/{issue_number}` - Get issue details
- `GET /repos/{owner}/{repo}/issues/{issue_number}/comments` - Read discussions
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}` - Update issue (assign to bot, add labels)

**Routing Logic:**
- If issue requires clarification → Alert human, skip to next issue
- If issue is well-defined → Route to `tdd-agent`
- If no issues available → Wait/idle state

---

### 2. TDD Agent

**Responsibilities:**
- Read issue requirements from context
- Analyze existing test structure
- Write failing test(s) that validate the requirement
- Ensure tests run and fail with meaningful error messages
- Commit tests to feature branch
- Document test strategy

**Inputs:**
- Issue context (from GitHub Issues Agent)
- Codebase structure
- Existing test patterns

**Outputs:**
- Test file(s) created/modified
- Test execution results (failing)
- Feature branch name
- Next agent: `engineer-agent`

**Tools Required:**
- File system access (read/write)
- Test runner (bun test, npm test, etc.)
- Git operations (branch, commit)

**Routing Logic:**
- If tests pass immediately → Issue may already be fixed, route to `github-agent` for verification
- If tests fail (expected) → Route to `engineer-agent`
- If unable to write tests → Alert human, create clarification issue

---

### 3. Software Engineer Agent

**Responsibilities:**
- Read failing test(s)
- Analyze codebase to understand context
- Implement minimal code to make tests pass
- Run tests iteratively
- Refactor code for quality (maintain green tests)
- Follow project conventions and patterns

**Inputs:**
- Failing test results
- Codebase structure
- Project style guides
- Linting/formatting rules

**Outputs:**
- Code changes (files modified)
- Test execution results (passing)
- Implementation summary
- Next agent: `github-agent`

**Tools Required:**
- File system access (read/write)
- Test runner
- Linter/formatter
- Build tools
- Git operations

**Routing Logic:**
- If tests pass → Route to `github-agent`
- If tests still fail after N attempts → Route to `github-agent` with failure flag
- If unexpected errors occur → Alert human

**Iteration Limit:** Max 10 attempts to make tests pass

---

### 4. GitHub Commit Agent

**Responsibilities:**
- Review all changes made (git diff)
- Generate semantic commit message
  - Format: `type(scope): message` (Conventional Commits)
  - Include issue reference: `Fixes #123`
- Commit changes
- Create or update pull request
- Monitor CI/CD pipeline
- Handle pipeline failures

**Inputs:**
- Code changes (git diff)
- Test results
- Issue context

**Outputs:**
- Commit SHA
- Pull request URL
- CI/CD status
- Next agent: `COMPLETE` or `github-issues-agent` (on failure)

**GitHub API Calls:**
- `POST /repos/{owner}/{repo}/git/commits` - Create commit
- `POST /repos/{owner}/{repo}/pulls` - Create PR
- `GET /repos/{owner}/{repo}/actions/runs` - Monitor CI/CD
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` - Get job details
- `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` - Comment on issue

**Routing Logic:**
- If CI passes → Mark issue as resolved, route to `COMPLETE`
- If CI fails (fixable) → Create new issue, route to `github-issues-agent`
- If CI fails (needs human) → Alert human, add "needs-review" label
- If PR conflicts → Alert human

**CI/CD Monitoring:**
- Poll GitHub Actions every 30 seconds
- Timeout after 30 minutes
- Parse build/test failures from logs

---

## Technical Architecture

### Multi-Provider LLM Support

Use **AI SDK** (Vercel) for unified interface:

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

// Configuration per agent
const agentConfigs = {
  'github-issues': {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
  },
  'tdd-agent': {
    provider: 'openai', // GitHub Copilot via OpenAI compatible API
    model: 'gpt-4',
  },
  'engineer-agent': {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
  },
  'github-commit': {
    provider: 'anthropic',
    model: 'claude-haiku-4',
  },
};

// Runtime provider selection
const getModel = (agentName: string) => {
  const config = agentConfigs[agentName];
  if (config.provider === 'anthropic') {
    return anthropic(config.model);
  }
  return openai(config.model);
};
```

**Provider Migration Path:**
1. Start with GitHub Copilot for initial testing
2. Gradually migrate to Claude (Anthropic) for cost/performance
3. A/B test agents with different providers
4. Support custom provider via config

---

### Tmux Integration for Agent Visibility

Each agent runs in its own tmux pane for real-time monitoring:

```typescript
// src/tmux/manager.ts
export class TmuxManager {
  private sessionName: string;
  private agentPanes: Map<string, string> = new Map();

  async createAgentSession(agents: string[]): Promise<void> {
    // Create tmux session
    await exec(`tmux new-session -d -s ${this.sessionName}`);
    
    // Create vertical splits for each agent
    for (let i = 0; i < agents.length - 1; i++) {
      await exec(`tmux split-window -t ${this.sessionName} -v`);
    }
    
    // Layout in tiled format
    await exec(`tmux select-layout -t ${this.sessionName} tiled`);
    
    // Name panes
    for (let i = 0; i < agents.length; i++) {
      const paneId = `${this.sessionName}:0.${i}`;
      this.agentPanes.set(agents[i], paneId);
      await exec(`tmux select-pane -t ${paneId} -T "${agents[i]}"`);
    }
  }

  async sendToAgent(agentName: string, output: string): Promise<void> {
    const paneId = this.agentPanes.get(agentName);
    if (!paneId) return;
    
    // Send output to specific pane
    await exec(`tmux send-keys -t ${paneId} "${output}" C-m`);
  }

  async attach(): Promise<void> {
    await exec(`tmux attach-session -t ${this.sessionName}`);
  }
}
```

**Tmux Layout:**
```
┌─────────────────────────┬─────────────────────────┐
│  GitHub Issues Agent    │      TDD Agent          │
│                         │                         │
│  • Scanning issues...   │  • Writing tests...     │
│  • Selected issue #42   │  • Test created         │
│                         │  • Tests failing ✓      │
├─────────────────────────┼─────────────────────────┤
│  Engineer Agent         │  GitHub Commit Agent    │
│                         │                         │
│  • Implementing fix...  │  • Monitoring CI...     │
│  • Tests passing ✓      │  • Build successful ✓   │
└─────────────────────────┴─────────────────────────┘
```

**Alternative: Log Files + Tail**

If tmux is too complex initially:
```bash
# Each agent writes to its own log
logs/github-issues-agent.log
logs/tdd-agent.log
logs/engineer-agent.log
logs/github-commit-agent.log

# User can tail any agent
tail -f logs/tdd-agent.log
```

---

### State Management

**Pipeline State Schema:**
```typescript
interface PipelineState {
  sessionId: string;
  issueNumber: number;
  issueTitle: string;
  branch: string;
  currentAgent: string;
  status: 'running' | 'completed' | 'failed' | 'waiting';
  
  // Agent-specific state
  github: {
    selectedIssue?: GitHubIssue;
    priority: number;
  };
  
  tdd: {
    testFiles: string[];
    testResults?: TestResults;
    failureMessages: string[];
  };
  
  engineer: {
    attempts: number;
    filesModified: string[];
    lastTestResults?: TestResults;
  };
  
  commit: {
    commitSha?: string;
    prNumber?: number;
    prUrl?: string;
    ciStatus?: 'pending' | 'success' | 'failure';
    ciRunId?: number;
  };
  
  history: AgentTransition[];
  createdAt: string;
  updatedAt: string;
}
```

**Persistence:**
- SQLite database (as in existing architecture)
- Checkpoint after each agent completes
- Resume capability on crash/restart

---

### Configuration System

**config/github-tdd-agents.yaml:**
```yaml
pipeline:
  name: github-tdd-pipeline
  maxIterations: 50
  timeout: 3600 # 1 hour
  
repository:
  owner: maxwell
  repo: woof
  branch: main
  
agents:
  - name: github-issues
    type: github-monitor
    provider: anthropic
    model: claude-sonnet-4
    systemPrompt: |
      You are a GitHub issues triage agent. Your job is to:
      1. Monitor repository issues
      2. Prioritize based on labels and complexity
      3. Select the next issue to work on
      4. Parse requirements clearly
    config:
      filters:
        labels: ['bug', 'enhancement', 'good-first-issue']
        state: open
        assignee: none
      priority:
        - label: 'critical' → weight: 10
        - label: 'bug' → weight: 5
        - label: 'enhancement' → weight: 3
        - label: 'good-first-issue' → weight: 1
    routes:
      - tdd-agent
      - WAIT # No issues available
    tools:
      - github_api
      - issue_parser
    
  - name: tdd-agent
    type: test-writer
    provider: openai
    model: gpt-4
    systemPrompt: |
      You are a TDD specialist agent. Your job is to:
      1. Read issue requirements
      2. Write failing tests that validate the fix
      3. Follow project test conventions
      4. Ensure tests fail with clear error messages
    config:
      testFramework: bun:test
      testPattern: 'tests/**/*.test.ts'
      maxTestFiles: 3
    routes:
      - engineer-agent
      - github-issues # Can't write tests
    tools:
      - filesystem
      - test_runner
      - git
      
  - name: engineer-agent
    type: code-implementer
    provider: anthropic
    model: claude-sonnet-4
    systemPrompt: |
      You are a software engineer agent. Your job is to:
      1. Read failing tests
      2. Implement minimal code to make tests pass
      3. Follow project conventions
      4. Refactor for quality
    config:
      maxAttempts: 10
      lintOnSave: true
      formatOnSave: true
    routes:
      - github-commit
      - github-issues # Failed to fix
    tools:
      - filesystem
      - test_runner
      - linter
      - git
      
  - name: github-commit
    type: github-committer
    provider: anthropic
    model: claude-haiku-4
    systemPrompt: |
      You are a Git commit and CI/CD monitoring agent. Your job is to:
      1. Review changes
      2. Generate semantic commit messages
      3. Create pull requests
      4. Monitor CI/CD pipelines
      5. Handle failures appropriately
    config:
      commitStyle: conventional
      requireTests: true
      ciTimeout: 1800 # 30 minutes
      ciPollInterval: 30 # seconds
    routes:
      - COMPLETE # Success
      - github-issues # CI failure, create new issue
      - ALERT_HUMAN # Needs manual intervention
    tools:
      - github_api
      - git
      - ci_monitor
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up project structure
- [ ] Implement agent orchestrator (reuse existing architecture)
- [ ] Add provider abstraction layer (AI SDK integration)
- [ ] Build state management system
- [ ] Create configuration loader

### Phase 2: GitHub Integration (Week 1-2)
- [ ] Implement GitHub API client
- [ ] Build GitHub Issues Agent
  - [ ] Issue listing and filtering
  - [ ] Priority scoring
  - [ ] Issue parsing
- [ ] Implement GitHub Commit Agent
  - [ ] Commit creation
  - [ ] PR management
  - [ ] CI/CD monitoring
- [ ] Add authentication (GitHub token, PAT)

### Phase 3: TDD & Engineering Agents (Week 2-3)
- [ ] Implement TDD Agent
  - [ ] Test file generation
  - [ ] Test execution
  - [ ] Failure analysis
- [ ] Implement Software Engineer Agent
  - [ ] Code generation
  - [ ] Iterative test running
  - [ ] Refactoring logic
- [ ] Integrate test runners (Bun, Jest, etc.)
- [ ] Add linting/formatting tools

### Phase 4: Tmux Integration (Week 3)
- [ ] Build TmuxManager class
- [ ] Implement pane creation and management
- [ ] Add real-time output streaming
- [ ] Create dashboard layout
- [ ] Add keyboard shortcuts for navigation

### Phase 5: Error Handling & Recovery (Week 4)
- [ ] Implement circuit breakers
- [ ] Add retry logic with exponential backoff
- [ ] Build failure routing (back to issues agent)
- [ ] Create human alert system (Slack, email, etc.)
- [ ] Add state recovery on crash

### Phase 6: Testing & Refinement (Week 4-5)
- [ ] Write unit tests for each agent
- [ ] Create integration tests for full pipeline
- [ ] Test with real GitHub repositories
- [ ] Performance optimization
- [ ] Documentation

### Phase 7: Advanced Features (Future)
- [ ] Parallel issue processing (multiple pipelines)
- [ ] Agent learning from past successes/failures
- [ ] Cost tracking per agent
- [ ] Web dashboard for monitoring
- [ ] Metrics and analytics

---

## Tools & Dependencies

### New Dependencies to Add

```json
{
  "dependencies": {
    "@octokit/rest": "^20.0.0",        // GitHub API client
    "simple-git": "^3.20.0",           // Git operations
    "execa": "^8.0.0",                 // Process execution
    "p-retry": "^6.0.0",               // Retry logic
    "pino": "^8.0.0",                  // Structured logging
    "pino-pretty": "^10.0.0",          // Pretty logs
    "yaml": "^2.3.0",                  // YAML parsing (already have zod)
    "better-sqlite3": "^9.0.0",        // State persistence
    "dotenv": "^16.0.0"                // Environment variables
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

### External Tools Required

- **Git**: Version control operations
- **GitHub CLI (gh)**: Optional, for advanced GitHub operations
- **Tmux**: Terminal multiplexer (optional, fallback to logs)
- **Bun/Node**: Runtime (already have)

---

## Configuration & Secrets

### Environment Variables

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
GITHUB_REPO_OWNER=maxwell
GITHUB_REPO_NAME=woof

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
LOG_LEVEL=info
TMUX_ENABLED=true
```

### GitHub Token Permissions

Required scopes:
- `repo` (full repository access)
- `workflow` (GitHub Actions)
- `write:packages` (if publishing packages)

---

## CLI Usage

### Start Pipeline
```bash
# Start the pipeline
woof start --repo maxwell/woof

# Start with specific issue
woof start --repo maxwell/woof --issue 42

# Start with provider override
woof start --repo maxwell/woof --provider claude

# Resume from checkpoint
woof resume --session session_123456

# Dry run (no actual commits)
woof start --repo maxwell/woof --dry-run
```

### Monitor Pipeline
```bash
# Attach to tmux session
woof attach

# View specific agent logs
woof logs github-issues
woof logs tdd-agent

# Show pipeline status
woof status

# View history
woof history --session session_123456
```

### Control Pipeline
```bash
# Pause pipeline
woof pause

# Stop pipeline
woof stop

# Skip current issue
woof skip-issue
```

---

## Success Metrics

### Agent Performance
- **GitHub Issues Agent**: Time to select issue, issue triage accuracy
- **TDD Agent**: Test quality, coverage, failure clarity
- **Engineer Agent**: Tests passing rate, code quality, iterations needed
- **GitHub Commit Agent**: Commit message quality, CI pass rate

### Pipeline Performance
- **End-to-End Time**: Issue selected → PR merged
- **Success Rate**: Issues completed without human intervention
- **CI Pass Rate**: First-time CI success rate
- **Cost**: API token usage per issue

### Quality Metrics
- **Test Coverage**: Maintained or improved
- **Code Quality**: Linter scores, complexity metrics
- **Bug Rate**: Issues created vs. issues resolved

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent infinite loops | High | Circuit breakers, max iterations, loop detection |
| API rate limits | Medium | Exponential backoff, caching, provider rotation |
| CI/CD timeouts | Medium | Timeout configuration, async monitoring |
| Token cost overrun | Medium | Budget limits per agent, usage tracking |
| Breaking changes | High | Comprehensive testing, rollback capability |
| GitHub API downtime | Low | Retry logic, queue system, graceful degradation |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect issue selection | Medium | Human review step, priority thresholds |
| Poor test quality | High | Test validation, human review for critical issues |
| Code quality issues | Medium | Linting, formatting, review agent (future) |
| Security vulnerabilities | High | Security scanning, human review for auth changes |
| Merge conflicts | Medium | Rebase logic, human alert |

---

## Open Questions

1. **Issue Priority Algorithm**: Should we use ML-based priority scoring or rule-based?
2. **Human-in-the-Loop**: At what points should humans approve? (e.g., before commit, before merge)
3. **Multi-Repo Support**: Should one woof instance handle multiple repos?
4. **Failure Threshold**: How many consecutive failures before stopping the pipeline?
5. **Test Strategy**: Unit tests only, or integration/e2e tests too?
6. **Branch Strategy**: One branch per issue, or single long-running feature branch?
7. **PR Merge**: Auto-merge or require human approval?
8. **Cost Budget**: What's the acceptable cost per issue? Per day?

---

## Next Steps

1. **Review & Approve**: Review this plan and approve direction
2. **Prototype**: Build minimal version (Phase 1-2) without tmux
3. **Test**: Run on a test repository with simple issues
4. **Iterate**: Refine based on learnings
5. **Production**: Deploy to real repository

---

## Alternative Approaches Considered

### Approach 1: Single "God" Agent
- **Pros**: Simpler architecture, less routing complexity
- **Cons**: Less visibility, harder to debug, expensive API calls

### Approach 2: Human in Every Step
- **Pros**: Maximum control, safety
- **Cons**: Defeats automation purpose, slow

### Approach 3: Pre-built CI/CD Tools (GitHub Actions only)
- **Pros**: Simpler integration
- **Cons**: Less flexible, harder to migrate providers, no interactive monitoring

**Selected Approach**: Multi-agent with tmux visibility (as specified above)

---

## Conclusion

This plan outlines a robust, extensible GitHub TDD pipeline using specialized agents with real-time visibility via tmux and provider flexibility via AI SDK. The architecture leverages the existing woof foundation while adding GitHub integration, TDD workflow, and advanced monitoring capabilities.

**Estimated Timeline**: 4-5 weeks for MVP  
**Estimated Cost**: Variable based on issue complexity (est. $0.10-$2.00 per issue)

Ready to proceed with implementation upon approval.
