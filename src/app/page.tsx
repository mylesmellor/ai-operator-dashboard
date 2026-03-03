'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadInput } from '@/lib/types';
import { DEMO_LEAD, DEMO_LEAD_PEAKVIEW } from '@/lib/demoData';

const EMPTY_LEAD: LeadInput = {
  name: '', company: '', role: '', email: '', website: '', linkedin: '',
  source: '', context: '', painPoints: '', timeline: '', budget: '',
  offerSummary: '', notes: '',
};

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<LeadInput>(EMPTY_LEAD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof LeadInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [key]: e.target.value });

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.company.trim()) return 'Company is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.context.trim() && !form.painPoints.trim())
      return 'At least one of Context or Pain Points is required.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start run.');
        setLoading(false);
        return;
      }
      router.push(`/run/${data.runId}`);
    } catch {
      setError('Failed to connect to the server.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">New Lead</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter lead details to generate a follow-up email, proposal, QA review, and send checklist.
        </p>
      </div>

      {/* Safety banner */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <strong>Nothing is sent automatically.</strong> All outputs are drafts for your review.
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Required fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required value={form.name} onChange={set('name')} placeholder="Sarah Chen" />
          <Field label="Company" required value={form.company} onChange={set('company')} placeholder="Meridian Health Partners" />
          <Field label="Email" required value={form.email} onChange={set('email')} placeholder="sarah@example.com" type="email" />
          <Field label="Role" value={form.role} onChange={set('role')} placeholder="Head of Operations" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Website" value={form.website} onChange={set('website')} placeholder="https://example.com" />
          <Field label="LinkedIn" value={form.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Source" value={form.source} onChange={set('source')} placeholder="Referral, LinkedIn, Event..." />
          <Field label="Timeline" value={form.timeline} onChange={set('timeline')} placeholder="Next 6-8 weeks" />
        </div>

        <Field label="Budget" value={form.budget} onChange={set('budget')} placeholder="$30,000-50,000 or Unknown" />

        <TextArea label="Context" value={form.context} onChange={set('context')} placeholder="Background on the lead and how you connected..." rows={3} hint="Required if Pain Points is empty" />
        <TextArea label="Pain Points" value={form.painPoints} onChange={set('painPoints')} placeholder="What problems are they facing?" rows={3} hint="Required if Context is empty" />
        <TextArea label="Offer Summary" value={form.offerSummary} onChange={set('offerSummary')} placeholder="What you're offering them..." rows={2} />
        <TextArea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." rows={2} />

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Starting...
              </span>
            ) : 'Run Workflow'}
          </button>
          <button
            onClick={() => setForm(DEMO_LEAD)}
            disabled={loading}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Demo: Sarah Chen
          </button>
          <button
            onClick={() => setForm(DEMO_LEAD_PEAKVIEW)}
            disabled={loading}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Demo: Jane Hamlett
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, placeholder, rows = 3, hint,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {hint && <span className="text-xs text-slate-400 ml-2 font-normal">({hint})</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y bg-white text-slate-900 placeholder:text-slate-400"
      />
    </div>
  );
}
