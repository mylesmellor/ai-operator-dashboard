'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RunResponse } from '@/lib/types';
import { StatusBadge } from '@/components/run/StatusBadge';
import { StepItem } from '@/components/run/StepItem';
import { LogEntry } from '@/components/run/LogEntry';
import { MissingInfoExtract } from '@/components/run/MissingInfoExtract';
import { SuggestionsPanel } from '@/components/run/SuggestionsPanel';

type Tab = 'email' | 'proposal' | 'qa' | 'checklist';

const TAB_LABELS: Record<Tab, string> = {
  email: 'Email Draft',
  proposal: 'Proposal Draft',
  qa: 'QA Review',
  checklist: 'Send Checklist',
};

// ---------------------------------------------------------------------------
// Spinner helper
// ---------------------------------------------------------------------------
function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function RunPage({ params }: { params: { id: string } }) {
  const { id: runId } = params;
  const router = useRouter();

  const [data, setData] = useState<RunResponse | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('email');
  const [finalising, setFinalising] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState<'email' | 'proposal' | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep a stable ref to the polling interval so we can cancel it from
  // anywhere without needing it in a dependency array.
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/run/${runId}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to load run.');
        return;
      }
      const d: RunResponse = await res.json();
      setData(d);
    } catch {
      setError('Failed to connect to the server.');
    }
  }, [runId]);

  // Start polling at 1-second intervals. The cleanup function clears the
  // interval when the component unmounts.
  useEffect(() => {
    fetchRun();
    intervalRef.current = setInterval(fetchRun, 1000);
    return () => stopPolling();
  }, [fetchRun, stopPolling]);

  // Stop polling as soon as the workflow is no longer running — subsequent
  // data changes only happen via explicit user actions (which call fetchRun
  // directly), so continuous polling would just waste resources.
  useEffect(() => {
    if (data?.state.status && data.state.status !== 'running') {
      stopPolling();
    }
  }, [data?.state.status, stopPolling]);

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------
  const handleFinalise = async () => {
    setFinalising(true);
    try {
      const res = await fetch(`/api/run/${runId}/finalise`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'Finalise failed.');
      else await fetchRun();
    } catch {
      setError('Failed to finalise.');
    }
    setFinalising(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/run/${runId}/regenerate`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Regenerate failed.');
        setRegenerating(false);
        return;
      }
      router.push(`/run/${d.runId}`);
    } catch {
      setError('Failed to regenerate.');
      setRegenerating(false);
    }
  };

  const handleStartEdit = (type: 'email' | 'proposal') => {
    const content =
      type === 'email'
        ? (data?.outputs.emailDraft ?? '')
        : (data?.outputs.proposalDraft ?? '');
    setEditContent(content);
    setEditing(type);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/run/${runId}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: editing, content: editContent }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Failed to save draft.');
      } else {
        setEditing(null);
        await fetchRun();
      }
    } catch {
      setError('Failed to save draft.');
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setEditContent('');
  };

  // ---------------------------------------------------------------------------
  // Early-return states
  // ---------------------------------------------------------------------------
  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-500">
          <Spinner />
          Loading run...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const { state, outputs, log } = data;
  const isRunning = state.status === 'running';
  const isCompleted = state.status === 'completed';
  const isFinalised = state.status === 'finalised';

  const tabMarkdown = (): string => {
    switch (activeTab) {
      case 'email':
        return (isFinalised && outputs.emailFinal) ? outputs.emailFinal : outputs.emailDraft ?? '';
      case 'proposal':
        return (isFinalised && outputs.proposalFinal) ? outputs.proposalFinal : outputs.proposalDraft ?? '';
      case 'qa':
        return outputs.qaReview ?? '';
      case 'checklist':
        return outputs.sendChecklist ?? '';
    }
  };

  const canEdit =
    (activeTab === 'email' || activeTab === 'proposal') &&
    !isFinalised &&
    (isCompleted || state.status === 'error');

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Safety banner */}
      <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <strong>Nothing is sent automatically.</strong> Review all drafts before finalising.
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status / action bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={state.status} />
          <span className="text-xs text-slate-400 font-mono">{runId}</span>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <button
              onClick={handleFinalise}
              disabled={finalising}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {finalising ? 'Finalising...' : 'Approve & Finalise'}
            </button>
          )}
          {(isCompleted || isFinalised || state.status === 'error') && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            New Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Progress steps */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Progress</h3>
            <div className="space-y-3">
              {state.steps.map((step, i) => (
                <StepItem key={step.name} step={step} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Centre: Tabbed content */}
        <div className="col-span-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200">
              {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {TAB_LABELS[tab]}
                  {activeTab === tab && isFinalised && (tab === 'email' || tab === 'proposal') && (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                      Final
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="p-5 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
              {/* Edit mode */}
              {editing && (activeTab === 'email' || activeTab === 'proposal') && editing === activeTab ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Editing {editing === 'email' ? 'Email' : 'Proposal'} Draft
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[500px] px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y bg-white text-slate-900"
                  />
                </div>
              ) : activeTab === 'qa' && data.suggestions && data.suggestions.length > 0 ? (
                /* QA tab with suggestions */
                <SuggestionsPanel
                  suggestions={data.suggestions}
                  qaMarkdown={outputs.qaReview ?? ''}
                  runId={runId}
                  onApplied={fetchRun}
                />
              ) : tabMarkdown() ? (
                /* Markdown preview */
                <div>
                  {canEdit && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => handleStartEdit(activeTab as 'email' | 'proposal')}
                        className="px-3 py-1.5 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  )}
                  <div className="prose text-sm text-slate-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{tabMarkdown()}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                /* Empty / generating state */
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                  {isRunning ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Generating...
                    </span>
                  ) : (
                    'No content yet.'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Log + Missing info */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Run Log</h3>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {log.length === 0 ? (
                <p className="text-xs text-slate-400">No log entries yet.</p>
              ) : (
                log.map((line, i) => <LogEntry key={i} line={line} />)
              )}
            </div>
          </div>

          {outputs.sendChecklist && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">Missing Info</h3>
              <div className="prose text-xs text-slate-600">
                <MissingInfoExtract checklist={outputs.sendChecklist} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
