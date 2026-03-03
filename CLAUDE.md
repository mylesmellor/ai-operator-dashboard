# CLAUDE.md — Developer Reference

## What this project is
A local Next.js 14 web app that runs a 5-step Claude-powered sales workflow.
Given a lead's details it generates a follow-up email, a proposal draft, a QA review with actionable suggestions, and a pre-send checklist. Nothing is sent automatically — all outputs are drafts for human review.

## Commands
```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm start          # Run production build
npm test           # Run vitest unit tests (24 tests)
npm run test:watch # Watch mode
npm run lint       # ESLint + TypeScript check
```

## Key files
| File | Purpose |
|------|---------|
| `src/lib/prompts.ts` | All 5 AI step prompts (system + user) — edit here to change AI behaviour |
| `src/lib/workflow.ts` | Orchestrates the 5 steps; steps 2 & 3 run in parallel |
| `src/lib/workspace.ts` | All file-system I/O, lock management, state read/write |
| `src/lib/anthropic.ts` | Singleton Anthropic client, `callAnthropic()` helper |
| `src/lib/suggestions.ts` | Regex parser for QA suggestion extraction |
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/app/page.tsx` | Lead intake form (home page) |
| `src/app/run/[id]/page.tsx` | Run results dashboard with polling |
| `src/components/run/` | Sub-components: StatusBadge, StepItem, SuggestionsPanel, etc. |
| `src/app/api/run/` | API routes: POST create, GET status, finalise, regenerate, save-draft, accept-suggestion |
| `sales-workflow/style_guide.md` | Tone/brand guide used by the QA Reviewer step |
| `src/__tests__/` | Vitest unit tests for suggestions parser and workspace helpers |

## Architecture
- **State**: File-based (`sales-workflow/runs/<ID>/state.json`). No database.
- **Locking**: A `.lock` file in `sales-workflow/` prevents concurrent workflow runs. Auto-expires after 1 hour to recover from crashes.
- **Polling**: The results page polls `GET /api/run/:id` every 1 second while the workflow is running, then stops automatically.
- **Parallelism**: Steps 2 (email) and 3 (proposal) both depend only on step 1's output and run in parallel via `Promise.all`.

## Environment variables
```
ANTHROPIC_API_KEY   # Required — your Anthropic API key
ANTHROPIC_MODEL     # Optional — defaults to claude-sonnet-4-20250514
WORKSPACE_DIR       # Optional — defaults to ./sales-workflow
```
Copy `.env.example` to `.env.local` and fill in your key.
