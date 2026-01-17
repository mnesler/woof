/**
 * Full-text search across all documentation.
 */

import { DOC_SOURCES, type DocConfig } from "./config/doc-sources.js";
import { fetchDoc } from "./sources/index.js";
import { docCache } from "./cache.js";

export interface SearchResult {
  topic: string;
  title: string;
  category: "internal" | "public";
  excerpt: string;
  score: number;
}

/**
 * Search across all documentation for matching content.
 * Returns results sorted by relevance score.
 */
export async function searchDocs(query: string, limit: number = 5): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(Boolean);
  
  // Search through all doc sources
  for (const docConfig of DOC_SOURCES) {
    try {
      // Try to get content (may be cached)
      const content = await fetchDoc(docConfig);
      const contentLower = content.toLowerCase();
      
      // Calculate relevance score
      const score = calculateScore(queryTerms, contentLower, docConfig);
      
      if (score > 0) {
        // Extract excerpt around first match
        const excerpt = extractExcerpt(content, query);
        
        results.push({
          topic: docConfig.topic,
          title: docConfig.title,
          category: docConfig.category,
          excerpt,
          score,
        });
      }
    } catch (error) {
      // Skip docs that can't be fetched
      console.error(`Failed to search ${docConfig.topic}: ${error}`);
    }
  }
  
  // Sort by score (descending) and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculate relevance score for a document.
 */
function calculateScore(queryTerms: string[], content: string, config: DocConfig): number {
  let score = 0;
  
  for (const term of queryTerms) {
    // Count occurrences in content
    const contentMatches = (content.match(new RegExp(term, "gi")) || []).length;
    score += contentMatches;
    
    // Bonus for matches in title
    if (config.title.toLowerCase().includes(term)) {
      score += 10;
    }
    
    // Bonus for matches in topic
    if (config.topic.toLowerCase().includes(term)) {
      score += 5;
    }
    
    // Bonus for matches in description
    if (config.description.toLowerCase().includes(term)) {
      score += 3;
    }
  }
  
  // Apply priority weight
  score *= config.priority;
  
  // Boost internal docs slightly (company standards are more relevant)
  if (config.category === "internal") {
    score *= 1.2;
  }
  
  return score;
}

/**
 * Extract an excerpt around the first match of the query.
 */
function extractExcerpt(content: string, query: string, contextChars: number = 150): string {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Find first occurrence
  const index = contentLower.indexOf(queryLower);
  
  if (index === -1) {
    // If exact match not found, try first query term
    const firstTerm = query.split(/\s+/)[0]?.toLowerCase();
    const termIndex = firstTerm ? contentLower.indexOf(firstTerm) : -1;
    
    if (termIndex === -1) {
      // Return beginning of content
      return content.slice(0, contextChars * 2) + "...";
    }
    
    return extractAroundIndex(content, termIndex, contextChars);
  }
  
  return extractAroundIndex(content, index, contextChars);
}

/**
 * Extract content around a specific index.
 */
function extractAroundIndex(content: string, index: number, contextChars: number): string {
  const start = Math.max(0, index - contextChars);
  const end = Math.min(content.length, index + contextChars);
  
  let excerpt = content.slice(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) {
    excerpt = "..." + excerpt;
  }
  if (end < content.length) {
    excerpt = excerpt + "...";
  }
  
  // Clean up whitespace
  return excerpt.replace(/\s+/g, " ").trim();
}
