import { describe, it, expect } from 'vitest';
import { parseSuggestions, parseVerdict } from '../lib/suggestions';

// ---------------------------------------------------------------------------
// parseSuggestions
// ---------------------------------------------------------------------------
describe('parseSuggestions', () => {
  it('extracts a single email suggestion', () => {
    const md = `## Suggestions\n- [Email] Make the subject line more specific.`;
    const result = parseSuggestions(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('email');
    expect(result[0].text).toBe('Make the subject line more specific.');
    expect(result[0].accepted).toBe(false);
    expect(result[0].id).toBe('email-0');
  });

  it('extracts a single proposal suggestion', () => {
    const md = `- [Proposal] Add a timeline section.`;
    const result = parseSuggestions(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('proposal');
    expect(result[0].id).toBe('proposal-0');
  });

  it('extracts mixed email and proposal suggestions', () => {
    const md = [
      '- [Email] Fix the greeting.',
      '- [Proposal] Clarify the pricing section.',
      '- [Email] Remove exclamation marks.',
    ].join('\n');
    const result = parseSuggestions(md);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('email');
    expect(result[1].type).toBe('proposal');
    expect(result[2].type).toBe('email');
  });

  it('returns an empty array when no suggestions are found', () => {
    expect(parseSuggestions('No suggestions here.')).toHaveLength(0);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseSuggestions('')).toHaveLength(0);
  });

  it('handles asterisk-style bullet points', () => {
    const md = `* [Email] Use a warmer tone.`;
    const result = parseSuggestions(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('email');
  });

  it('is case-insensitive for the [Email] / [Proposal] tags', () => {
    const md = [
      '- [EMAIL] Upper-case tag.',
      '- [Proposal] Normal tag.',
    ].join('\n');
    const result = parseSuggestions(md);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('email');
    expect(result[1].type).toBe('proposal');
  });

  it('assigns unique IDs across all suggestions', () => {
    const md = [
      '- [Email] First.',
      '- [Email] Second.',
      '- [Proposal] Third.',
    ].join('\n');
    const result = parseSuggestions(md);
    const ids = result.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('initialises all suggestions with accepted: false', () => {
    const md = [
      '- [Email] Suggestion A.',
      '- [Proposal] Suggestion B.',
    ].join('\n');
    const result = parseSuggestions(md);
    expect(result.every((s) => s.accepted === false)).toBe(true);
  });

  it('ignores bullet points that lack a [Email] or [Proposal] tag', () => {
    const md = [
      '- [Email] Valid suggestion.',
      '- Plain bullet without a tag.',
      '- [Other] Unknown tag.',
    ].join('\n');
    const result = parseSuggestions(md);
    expect(result).toHaveLength(1);
  });

  it('trims surrounding whitespace from extracted text', () => {
    const md = `- [Email]   Text with extra spaces.  `;
    const result = parseSuggestions(md);
    expect(result[0].text).toBe('Text with extra spaces.');
  });

  it('handles indented bullet points', () => {
    const md = `  - [Email] Indented suggestion.`;
    const result = parseSuggestions(md);
    expect(result).toHaveLength(1);
  });

  it('extracts six suggestions from a typical QA review block', () => {
    const md = `
Verdict: Needs Edits

## Suggestions

- [Email] Soften the opening line.
- [Email] Add a specific call-to-action with a date suggestion.
- [Email] Remove the phrase "cutting-edge".
- [Proposal] Under Deliverables, add a line item for training sessions.
- [Proposal] Clarify "To be confirmed" placeholders in the Investment section.
- [Proposal] Break the Proposed Approach section into sub-steps.

## Flags
- No guarantees should be made about timelines.
`;
    const result = parseSuggestions(md);
    expect(result).toHaveLength(6);
    expect(result.filter((s) => s.type === 'email')).toHaveLength(3);
    expect(result.filter((s) => s.type === 'proposal')).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// parseVerdict
// ---------------------------------------------------------------------------
describe('parseVerdict', () => {
  it('extracts a "Pass" verdict', () => {
    const md = 'Verdict: Pass\n\nRest of content.';
    expect(parseVerdict(md)).toBe('Pass');
  });

  it('extracts a "Needs Edits" verdict', () => {
    const md = 'Verdict: Needs Edits';
    expect(parseVerdict(md)).toBe('Needs Edits');
  });

  it('is case-insensitive for the "Verdict:" keyword', () => {
    expect(parseVerdict('verdict: Pass')).toBe('Pass');
    expect(parseVerdict('VERDICT: Needs Edits')).toBe('Needs Edits');
  });

  it('returns null when no verdict line is found', () => {
    expect(parseVerdict('No verdict here.')).toBeNull();
    expect(parseVerdict('')).toBeNull();
  });

  it('trims surrounding whitespace from the extracted verdict', () => {
    expect(parseVerdict('Verdict:   Pass   ')).toBe('Pass');
  });

  it('works when the verdict line is not the first line', () => {
    const md = '## QA Review\n\nVerdict: Needs Edits\n\n## Suggestions';
    expect(parseVerdict(md)).toBe('Needs Edits');
  });
});
