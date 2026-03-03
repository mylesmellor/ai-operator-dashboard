import { QASuggestion } from './types';

/**
 * Parse QA review markdown to extract individual suggestions.
 * Expects suggestions in the format:
 *   - [Email] Some suggestion text here.
 *   - [Proposal] Another suggestion text here.
 */
export function parseSuggestions(qaMarkdown: string): QASuggestion[] {
  const suggestions: QASuggestion[] = [];
  let id = 0;

  // Match bullet points that start with [Email] or [Proposal]
  const bulletRegex = /^[\s]*[-*]\s*\[(Email|Proposal)\]\s*(.+)$/gim;
  let match;

  while ((match = bulletRegex.exec(qaMarkdown)) !== null) {
    const type = match[1].toLowerCase() as 'email' | 'proposal';
    const text = match[2].trim();

    if (text) {
      suggestions.push({
        id: `${type}-${id}`,
        type,
        text,
        accepted: false,
      });
      id++;
    }
  }

  return suggestions;
}

/**
 * Extract the verdict line from the QA review.
 * Returns "Pass", "Needs Edits", or null if not found.
 */
export function parseVerdict(qaMarkdown: string): string | null {
  const verdictMatch = qaMarkdown.match(/^Verdict:\s*(.+)$/im);
  return verdictMatch ? verdictMatch[1].trim() : null;
}
