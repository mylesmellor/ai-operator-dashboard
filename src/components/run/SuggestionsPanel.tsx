'use client';

import { useState } from 'react';
import { QASuggestion } from '@/lib/types';

interface Props {
  suggestions: QASuggestion[];
  qaMarkdown: string;
  runId: string;
  onApplied: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SuggestionCard({
  suggestion,
  isApplying,
  isDisabled,
  onAccept,
}: {
  suggestion: QASuggestion;
  isApplying: boolean;
  isDisabled: boolean;
  onAccept: (id: string) => void;
}) {
  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        suggestion.accepted
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-slate-200 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                suggestion.type === 'email'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {suggestion.type === 'email' ? 'Email' : 'Proposal'}
            </span>
            {suggestion.accepted && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Applied
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700">{suggestion.text}</p>
        </div>

        {!suggestion.accepted && (
          <button
            onClick={() => onAccept(suggestion.id)}
            disabled={isDisabled}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isApplying ? (
              <span className="flex items-center gap-1.5">
                <Spinner />
                Applying...
              </span>
            ) : (
              'Accept'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function SuggestionsPanel({ suggestions, qaMarkdown, runId, onApplied }: Props) {
  const [applying, setApplying] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [applyError, setApplyError] = useState('');

  const verdictMatch = qaMarkdown.match(/^Verdict:\s*(.+)$/im);
  const verdict = verdictMatch ? verdictMatch[1].trim() : null;
  const pendingSuggestions = suggestions.filter((s) => !s.accepted);

  const applySuggestion = async (suggestionId: string): Promise<boolean> => {
    const res = await fetch(`/api/run/${runId}/accept-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId }),
    });
    const d = await res.json();
    if (!res.ok) {
      setApplyError(d.error || 'Failed to apply suggestion.');
      return false;
    }
    onApplied();
    return true;
  };

  const handleAccept = async (suggestionId: string) => {
    setApplying(suggestionId);
    setApplyError('');
    try {
      await applySuggestion(suggestionId);
    } catch {
      setApplyError('Network error applying suggestion.');
    }
    setApplying(null);
  };

  const handleAcceptAll = async () => {
    setApplyingAll(true);
    setApplyError('');
    try {
      for (const s of pendingSuggestions) {
        const ok = await applySuggestion(s.id);
        if (!ok) break; // Stop on first failure and surface the error
      }
    } catch {
      setApplyError('Network error applying suggestions.');
    }
    setApplyingAll(false);
  };

  const isBusy = applying !== null || applyingAll;

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      {verdict && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            verdict.toLowerCase().includes('pass')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          Verdict: {verdict}
        </div>
      )}

      {applyError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {applyError}
        </div>
      )}

      {/* Accept All */}
      {pendingSuggestions.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={handleAcceptAll}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {applyingAll ? 'Applying all...' : `Accept All (${pendingSuggestions.length})`}
          </button>
        </div>
      )}

      {/* Suggestion cards */}
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          isApplying={applying === suggestion.id}
          isDisabled={isBusy}
          onAccept={handleAccept}
        />
      ))}

      {suggestions.length === 0 && (
        <p className="text-sm text-slate-400">No suggestions extracted.</p>
      )}
    </div>
  );
}
