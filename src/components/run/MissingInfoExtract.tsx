'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Extracts and renders the "Missing Information" section from the
 * checklist markdown so it can be shown in the right-hand sidebar.
 */
export function MissingInfoExtract({ checklist }: { checklist: string }) {
  // Capture everything from the "Missing Information" heading to the next
  // heading or end of string.
  const match = checklist.match(
    /missing\s+information[^\n]*\n([\s\S]*?)(?=\n(?:#{1,3}\s|\*\*[A-Z])|\n$)/i,
  );

  if (match) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{match[1].trim()}</ReactMarkdown>
    );
  }

  return <p className="text-slate-400">No missing info flagged.</p>;
}
