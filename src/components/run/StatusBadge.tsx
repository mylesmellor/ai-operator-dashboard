'use client';

const STATUS_STYLES: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  finalised: 'bg-purple-100 text-purple-700',
  error: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  const label =
    status === 'finalised'
      ? 'Finalised'
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  );
}
