#!/usr/bin/env bun
/**
 * Sync Claude Code agents to OpenCode
 *
 * Reads agents from ~/.claude/agents/ and writes them to ~/.config/opencode/agent/
 * with the necessary format transformations.
 *
 * Usage:
 *   bun scripts/sync-claude-agents.ts
 */

import { readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Source and destination directories
const CLAUDE_AGENTS_DIR = join(homedir(), ".claude", "agents");
const OPENCODE_AGENTS_DIR = join(homedir(), ".config", "opencode", "agent");

// Model mapping from Claude Code shorthand to OpenCode provider/model format
const MODEL_MAP: Record<string, string> = {
  sonnet: "anthropic/claude-sonnet-4-20250514",
  opus: "anthropic/claude-opus-4-20250514",
  haiku: "anthropic/claude-haiku-4-20250514",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4-20250514",
  "claude-opus-4-20250514": "anthropic/claude-opus-4-20250514",
  "claude-haiku-4-20250514": "anthropic/claude-haiku-4-20250514",
  "claude-3-5-sonnet-20241022": "anthropic/claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022": "anthropic/claude-3-5-haiku-20241022",
};

interface ClaudeAgentFrontmatter {
  name?: string;
  description?: string;
  model?: string;
  color?: string;
  [key: string]: unknown;
}

interface ParsedAgent {
  frontmatter: ClaudeAgentFrontmatter;
  body: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): ParsedAgent {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return {
      frontmatter: {},
      body: content,
    };
  }

  const [, yamlContent, body] = frontmatterMatch;
  const frontmatter: ClaudeAgentFrontmatter = {};

  // Simple YAML parser for flat key-value pairs
  // Handles multiline strings that are escaped with \n
  for (const line of yamlContent.split("\n")) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Handle quoted strings and unescape \n
      let parsedValue = value.trim();
      if (
        (parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
        (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
      ) {
        parsedValue = parsedValue.slice(1, -1);
      }
      // Unescape literal \n sequences
      parsedValue = parsedValue.replace(/\\n/g, "\n");
      frontmatter[key] = parsedValue;
    }
  }

  return { frontmatter, body: body.trim() };
}

/**
 * Extract the first sentence from a description
 */
function extractFirstSentence(description: string): string {
  // Handle descriptions that might have examples or multiple paragraphs
  // Get content before first double newline or example block
  const beforeExamples = description.split(/\n\n|<example>/)[0];

  // Find first sentence (ends with . followed by space or end)
  const sentenceMatch = beforeExamples.match(/^(.+?\.)\s/);
  if (sentenceMatch) {
    return sentenceMatch[1].trim();
  }

  // If no clear sentence ending, take the first line or first 200 chars
  const firstLine = beforeExamples.split("\n")[0];
  if (firstLine.length <= 200) {
    return firstLine.trim();
  }

  return firstLine.slice(0, 200).trim() + "...";
}

/**
 * Map Claude Code model to OpenCode model format
 */
function mapModel(model: string): string {
  const normalized = model.toLowerCase().trim();

  // Check direct mapping
  if (MODEL_MAP[normalized]) {
    return MODEL_MAP[normalized];
  }

  // If already has provider prefix, return as-is
  if (model.includes("/")) {
    return model;
  }

  // Default to anthropic provider if unknown
  console.warn(`  ⚠ Unknown model "${model}", assuming anthropic provider`);
  return `anthropic/${model}`;
}

/**
 * Generate OpenCode agent frontmatter
 */
function generateOpenCodeFrontmatter(
  claude: ClaudeAgentFrontmatter
): Record<string, string> {
  const opencode: Record<string, string> = {};

  // Description (required) - extract first sentence
  if (claude.description) {
    opencode.description = extractFirstSentence(claude.description);
  } else {
    opencode.description = "Imported from Claude Code";
  }

  // Mode - primary so it appears in Tab rotation
  opencode.mode = "primary";

  // Model - map to OpenCode format
  if (claude.model) {
    opencode.model = mapModel(claude.model);
  }

  // Ignore: name (becomes filename), color (not supported)

  return opencode;
}

/**
 * Serialize frontmatter to YAML
 */
function serializeFrontmatter(frontmatter: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    // Quote values that contain special characters
    if (value.includes(":") || value.includes("#") || value.includes("\n")) {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

/**
 * Convert a Claude Code agent to OpenCode format
 */
function convertAgent(content: string): string {
  const { frontmatter, body } = parseFrontmatter(content);
  const opencodeFrontmatter = generateOpenCodeFrontmatter(frontmatter);

  return `---
${serializeFrontmatter(opencodeFrontmatter)}
---

${body}
`;
}

/**
 * Main sync function
 */
async function syncAgents(): Promise<void> {
  console.log("Syncing Claude Code agents to OpenCode...\n");

  // Check source directory exists
  if (!existsSync(CLAUDE_AGENTS_DIR)) {
    console.log(`Source directory not found: ${CLAUDE_AGENTS_DIR}`);
    console.log("No Claude Code agents to sync.");
    return;
  }

  // Ensure destination directory exists
  if (!existsSync(OPENCODE_AGENTS_DIR)) {
    await mkdir(OPENCODE_AGENTS_DIR, { recursive: true });
    console.log(`Created: ${OPENCODE_AGENTS_DIR}\n`);
  }

  // Read all .md files from source
  const files = await readdir(CLAUDE_AGENTS_DIR);
  const agentFiles = files.filter((f) => f.endsWith(".md"));

  if (agentFiles.length === 0) {
    console.log("No agent files found in", CLAUDE_AGENTS_DIR);
    return;
  }

  let synced = 0;

  for (const filename of agentFiles) {
    const sourcePath = join(CLAUDE_AGENTS_DIR, filename);
    const destPath = join(OPENCODE_AGENTS_DIR, filename);

    try {
      const content = await Bun.file(sourcePath).text();
      const converted = convertAgent(content);

      await Bun.write(destPath, converted);

      console.log(`  ${sourcePath}`);
      console.log(`    → ${destPath}`);
      synced++;
    } catch (error) {
      console.error(`  ✗ Failed to sync ${filename}:`, error);
    }
  }

  console.log(`\nDone! Synced ${synced} agent${synced !== 1 ? "s" : ""}.`);
}

// Run
syncAgents().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
