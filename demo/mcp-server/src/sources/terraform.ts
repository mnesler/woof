/**
 * Terraform Registry source adapter.
 * Fetches documentation from registry.terraform.io.
 */

import { docCache } from "../cache.js";
import type { TerraformSource } from "../config/doc-sources.js";

const TERRAFORM_REGISTRY_BASE = "https://registry.terraform.io";

/**
 * Fetch documentation from Terraform Registry.
 * Uses the registry API to get resource documentation.
 */
export async function fetchFromTerraform(source: TerraformSource): Promise<string> {
  const cacheKey = `terraform:${source.provider}:${source.resource}`;
  
  // Check cache first
  const cached = docCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { provider, resource } = source;
  
  // Terraform registry docs URL pattern
  // e.g., https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
  const resourceName = resource.replace(`${provider}_`, "").replace("google_", "");
  const url = `${TERRAFORM_REGISTRY_BASE}/providers/hashicorp/${provider}/latest/docs/resources/${resourceName}`;
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Ford-Docs-MCP-Server",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Terraform resource not found: ${provider}/${resource}`);
    }
    throw new Error(`Terraform registry error: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  
  // Extract documentation content
  const content = extractTerraformContent(html, resource);
  
  // Cache the result
  docCache.set(cacheKey, content);
  
  return content;
}

/**
 * Extract documentation content from Terraform registry HTML.
 */
function extractTerraformContent(html: string, resource: string): string {
  // Terraform registry embeds docs as markdown in a specific div
  // Try to extract the markdown content
  
  const markdownMatch = html.match(/<div[^>]*class="[^"]*markdown[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (markdownMatch) {
    // Clean and return
    return cleanTerraformHTML(markdownMatch[1]);
  }
  
  // Fallback: construct basic documentation
  return `# ${resource}

Terraform resource documentation.

For full documentation, visit:
${TERRAFORM_REGISTRY_BASE}/providers/hashicorp/google/latest/docs/resources/${resource.replace("google_", "")}
`;
}

/**
 * Clean Terraform HTML content
 */
function cleanTerraformHTML(html: string): string {
  // Convert common HTML elements to markdown-ish text
  return html
    // Remove script/style
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Convert headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    // Convert code blocks
    .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    // Convert lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    // Remove remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    // Clean whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Check if Terraform registry is accessible
 */
export async function checkTerraformAccess(): Promise<boolean> {
  try {
    const response = await fetch(`${TERRAFORM_REGISTRY_BASE}/providers/hashicorp/google`, {
      method: "HEAD",
      headers: { "User-Agent": "Ford-Docs-MCP-Server" },
    });
    return response.ok;
  } catch {
    return false;
  }
}
