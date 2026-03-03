'use client';

import { LogLine } from '@/lib/types';

const LEVEL_STYLES: Record<LogLine['level'], string> = {
  info: 'text-slate-600',
  error: 'text-red-600',
  warn: 'text-amber-600',
};

export function LogEntry({ line }: { line: LogLine }) {
  const time = new Date(line.timestamp).toLocaleTimeString();
  return (
    <div className={`text-xs ${LEVEL_STYLES[line.level] ?? 'text-slate-600'}`}>
      <span className="text-slate-400 font-mono">{time}</span>{' '}
      <span>{line.message}</span>
    </div>
  );
}
