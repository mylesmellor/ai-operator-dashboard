import fs from 'fs/promises';
import path from 'path';
import { RunState, LogLine, QASuggestion } from './types';

const WORKSPACE = process.env.WORKSPACE_DIR || './sales-workflow';

// If a lock file is older than this threshold it is assumed to be stale
// (e.g. the process crashed before releasing the lock).
const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

function resolve(...parts: string[]) {
  return path.resolve(process.cwd(), WORKSPACE, ...parts);
}

export async function ensureDirs(runId: string) {
  const dirs = [
    resolve('latest'),
    resolve('runs', runId, 'context'),
    resolve('runs', runId, 'drafts'),
    resolve('runs', runId, 'final'),
  ];
  for (const d of dirs) {
    await fs.mkdir(d, { recursive: true });
  }
}

export function generateRunId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6);
  return `${date}-${time}-${rand}`;
}

// Lock management
export async function acquireLock(): Promise<boolean> {
  const lockPath = resolve('.lock');
  try {
    await fs.writeFile(lockPath, new Date().toISOString(), { flag: 'wx' });
    return true;
  } catch {
    // Lock file already exists — check whether it is stale.
    try {
      const stat = await fs.stat(lockPath);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > LOCK_TIMEOUT_MS) {
        // Stale lock from a crashed process — remove and re-acquire.
        await fs.unlink(lockPath);
        await fs.writeFile(lockPath, new Date().toISOString(), { flag: 'wx' });
        return true;
      }
    } catch {
      // Cannot stat / delete the lock — treat as locked.
    }
    return false;
  }
}

export async function releaseLock() {
  const lockPath = resolve('.lock');
  try {
    await fs.unlink(lockPath);
  } catch {
    // Ignore if already removed.
  }
}

export async function isLocked(): Promise<boolean> {
  const lockPath = resolve('.lock');
  try {
    const stat = await fs.stat(lockPath);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs > LOCK_TIMEOUT_MS) {
      // Stale — clean it up and report as unlocked.
      try { await fs.unlink(lockPath); } catch { /* ignore */ }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// State management
export async function writeState(runId: string, state: RunState) {
  const p = resolve('runs', runId, 'state.json');
  await fs.writeFile(p, JSON.stringify(state, null, 2));
}

export async function readState(runId: string): Promise<RunState> {
  const p = resolve('runs', runId, 'state.json');
  const data = await fs.readFile(p, 'utf-8');
  return JSON.parse(data);
}

// Log management
export async function appendLog(runId: string, line: LogLine) {
  const p = resolve('runs', runId, 'log.jsonl');
  await fs.appendFile(p, JSON.stringify(line) + '\n');
}

export async function readLog(runId: string, limit = 50): Promise<LogLine[]> {
  const p = resolve('runs', runId, 'log.jsonl');
  try {
    const data = await fs.readFile(p, 'utf-8');
    const lines = data.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    return lines.slice(-limit);
  } catch {
    return [];
  }
}

// File I/O helpers
export async function writeRunFile(runId: string, relativePath: string, content: string) {
  const p = resolve('runs', runId, relativePath);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content);
}

export async function readRunFile(runId: string, relativePath: string): Promise<string | null> {
  try {
    return await fs.readFile(resolve('runs', runId, relativePath), 'utf-8');
  } catch {
    return null;
  }
}

export async function writeInput(runId: string, input: unknown) {
  await writeRunFile(runId, 'input.json', JSON.stringify(input, null, 2));
}

export async function readInput(runId: string) {
  const raw = await readRunFile(runId, 'input.json');
  return raw ? JSON.parse(raw) : null;
}

// Copy to latest
export async function copyToLatest(runId: string) {
  const runDir = resolve('runs', runId);
  const latestDir = resolve('latest');

  // Clear latest
  try {
    const files = await fs.readdir(latestDir);
    for (const f of files) {
      const fp = path.join(latestDir, f);
      const stat = await fs.stat(fp);
      if (stat.isFile()) await fs.unlink(fp);
    }
  } catch { /* ignore */ }

  // Copy all relevant files
  const copyPairs = [
    ['input.json', 'input.json'],
    ['state.json', 'state.json'],
    ['log.jsonl', 'log.jsonl'],
    ['context/01_lead_summary.md', '01_lead_summary.md'],
    ['drafts/02_followup_email_draft.md', '02_followup_email_draft.md'],
    ['drafts/03_proposal_draft.md', '03_proposal_draft.md'],
    ['context/04_qa_review.md', '04_qa_review.md'],
    ['context/05_send_checklist.md', '05_send_checklist.md'],
    ['final/02_followup_email.md', '02_followup_email.md'],
    ['final/03_proposal.md', '03_proposal.md'],
  ];

  for (const [src, dest] of copyPairs) {
    try {
      await fs.copyFile(path.join(runDir, src), path.join(latestDir, dest));
    } catch { /* file may not exist yet */ }
  }
}

// Suggestions management
export async function writeSuggestions(runId: string, suggestions: QASuggestion[]) {
  await writeRunFile(runId, 'suggestions.json', JSON.stringify(suggestions, null, 2));
}

export async function readSuggestions(runId: string): Promise<QASuggestion[] | null> {
  const raw = await readRunFile(runId, 'suggestions.json');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Read style guide
export async function readStyleGuide(): Promise<string> {
  try {
    return await fs.readFile(resolve('style_guide.md'), 'utf-8');
  } catch {
    return 'Tone: professional, warm, direct. No hype, no buzzwords, no exaggerated claims.';
  }
}

// Check if run dir exists
export async function runExists(runId: string): Promise<boolean> {
  try {
    await fs.access(resolve('runs', runId));
    return true;
  } catch {
    return false;
  }
}
