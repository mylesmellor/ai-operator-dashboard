'use client';

import { StepState } from '@/lib/types';

const LABEL_STYLES: Record<string, string> = {
  done: 'text-slate-700',
  running: 'text-blue-700 font-medium',
  error: 'text-red-700',
  queued: 'text-slate-400',
};

function StepIcon({ status, index }: { status: StepState['status']; index: number }) {
  if (status === 'queued') {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs text-slate-400">
        {index + 1}
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse-dot flex items-center justify-center text-xs text-white font-bold">
        {index + 1}
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    );
  }
  // error
  return (
    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

export function StepItem({ step, index }: { step: StepState; index: number }) {
  return (
    <div className="flex items-start gap-2.5">
      <StepIcon status={step.status} index={index} />
      <div className="min-w-0">
        <p className={`text-sm leading-tight ${LABEL_STYLES[step.status] ?? 'text-slate-400'}`}>
          {step.label}
        </p>
        {step.completedAt && (
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(step.completedAt).toLocaleTimeString()}
          </p>
        )}
        {step.error && (
          <p className="text-xs text-red-500 mt-0.5">{step.error}</p>
        )}
      </div>
    </div>
  );
}
