# OpenCode Demo: Personalized AI Agents with MCP Documentation

A professional demo showcasing how organizations can give AI agents access to internal documentation via the Model Context Protocol (MCP), enabling AI to follow company-specific standards.

## Demo Overview

**Target Audience:** Software engineers familiar with AI but new to agent patterns  
**Duration:** 15-20 minutes  
**Company Context:** Ford Motor Company infrastructure standards

### What This Demo Shows

1. **MCP Server Architecture** - A documentation server exposing Ford's internal standards
2. **Custom Agent Configuration** - A specialized "Ford Infrastructure Engineer" agent
3. **Documentation-First AI** - Agent consults docs before writing code
4. **Live Implementation** - Agent creates Terraform following all Ford standards

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- [OpenCode](https://opencode.ai/) CLI installed
- GitHub Personal Access Token (optional, for higher rate limits)

## Quick Start

```bash
# 1. Navigate to demo directory
cd demo

# 2. Install MCP server dependencies
cd mcp-server && bun install && cd ..

# 3. (Optional) Set GitHub token for better rate limits
cp .env.example .env
# Edit .env and add your GITHUB_TOKEN

# 4. Launch OpenCode with the Ford Infrastructure agent
opencode
```

## Project Structure

```
demo/
├── opencode.json                # OpenCode config with MCP server
├── .env.example                 # Environment variables template
│
├── .opencode/
│   └── agent/
│       └── ford-infra.md       # Custom Ford Infrastructure agent
│
├── mcp-server/                  # MCP Documentation Server
│   ├── package.json
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── resources.ts        # MCP Resources (passive context)
│   │   ├── tools.ts            # MCP Tools (active queries)
│   │   ├── search.ts           # Full-text doc search
│   │   ├── cache.ts            # In-memory cache with TTL
│   │   ├── config/
│   │   │   └── doc-sources.ts  # Documentation URL registry
│   │   └── sources/            # Platform adapters
│   │       ├── github.ts       # GitHub API
│   │       ├── gcp.ts          # GCP docs
│   │       ├── terraform.ts    # Terraform registry
│   │       └── tekton.ts       # Tekton docs
│   └── docs/                   # (Optional) Local doc cache
│
└── terraform/                  # Starter Terraform project
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

## MCP Server Details

### Capabilities

The server exposes Ford documentation through two MCP primitives:

| Primitive | Purpose |
|-----------|---------|
| **Resources** | Passive context - docs can be pre-loaded |
| **Tools** | Active queries - agent searches/fetches docs |

### Available Tools

| Tool | Description |
|------|-------------|
| `list_topics` | List all available documentation topics |
| `get_doc` | Retrieve full content of a specific doc |
| `search_docs` | Full-text search across all documentation |

### Documentation Sources

| Category | Sources |
|----------|---------|
| **Internal** | Ford naming standards, Terraform modules, security policies |
| **Public** | GCP docs, Terraform registry, Tekton docs |

## Demo Script

### Phase 1: Setup & Context (3 min)

1. Show the problem: "AI knows GCP, but not Ford's specific conventions"
2. Walk through `opencode.json` - show MCP server configuration
3. Show `ford-infra.md` agent definition

### Phase 2: Architecture Tour (3 min)

1. Briefly show MCP server structure
2. Explain Resources vs Tools
3. Show doc-sources.ts configuration

### Phase 3: Live Demo (10 min)

Switch to the `ford-infra` agent (Tab key) and give this prompt:

```
Add a GCS bucket for storing ML model artifacts for the MLOps team in production.
```

**Expected behavior:**
1. Agent calls `list_topics()` to discover available docs
2. Agent calls `get_doc("naming-standards")` 
3. Agent calls `get_doc("terraform-modules")`
4. Agent calls `get_doc("security-policies")`
5. Agent generates compliant Terraform code

**Review the output for:**
- Naming convention: `ford-prd-mlops-gcs-ml-model-artifacts`
- Uses internal module (not raw `google_storage_bucket`)
- Required labels: `cost-center`, `data-classification`, `owner-team`
- Security: `uniform_bucket_level_access = true`

### Phase 4: Wrap-up (3 min)

- Summarize: "Same AI, personalized with your company's standards"
- Mention production patterns (vector search, remote MCP, OAuth)
- Q&A

## Customization

### Adding Your Documentation

Edit `mcp-server/src/config/doc-sources.ts`:

```typescript
{
  topic: "your-topic",
  title: "Your Documentation Title",
  description: "What this doc covers",
  category: "internal",
  priority: 1.0,
  source: {
    type: "github",
    repo: "your-org/your-repo",
    path: "path/to/doc.md",
  },
}
```

### Changing the Agent

Edit `.opencode/agent/ford-infra.md` to customize:
- Agent name and description
- System prompt
- Tool permissions
- Temperature setting

## Production Considerations

For production deployment, consider:

| Demo Pattern | Production Evolution |
|--------------|---------------------|
| Local MCP server | Remote server with OAuth |
| In-memory cache | Redis or distributed cache |
| Simple text search | Vector embeddings + semantic search |
| Markdown files | Git sync, CMS integration |
| Single server | Multiple specialized MCP servers |

## Troubleshooting

### MCP Server Won't Start

```bash
# Check for errors
cd mcp-server && bun run src/index.ts
```

### GitHub Rate Limits

Without a token, GitHub API limits you to 60 requests/hour. Set `GITHUB_TOKEN` in `.env` to increase to 5000/hour.

### Agent Not Using Docs

Ensure the agent is actually configured. In OpenCode:
1. Press Tab to cycle agents
2. Look for "ford-infra" in the agent indicator
3. Check that MCP server started (look for `[ford-docs]` in logs)

## License

Internal demo - Ford Motor Company
