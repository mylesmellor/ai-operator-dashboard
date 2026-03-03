import { LeadInput, RunState, StepState, LogLine } from './types';
import { callAnthropic } from './anthropic';
import * as prompts from './prompts';
import {
  ensureDirs,
  writeState,
  appendLog,
  writeRunFile,
  copyToLatest,
  releaseLock,
  readStyleGuide,
  writeSuggestions,
} from './workspace';
import { parseSuggestions } from './suggestions';

const STEPS: { name: string; label: string }[] = [
  { name: 'lead_analyzer', label: 'Lead Analyser' },
  { name: 'email_writer', label: 'Follow-up Writer' },
  { name: 'proposal_drafter', label: 'Proposal Drafter' },
  { name: 'qa_reviewer', label: 'Quality Reviewer' },
  { name: 'checklist_compiler', label: 'Checklist Compiler' },
];

function now() {
  return new Date().toISOString();
}

async function log(runId: string, step: string, message: string, level: LogLine['level'] = 'info') {
  await appendLog(runId, { timestamp: now(), step, message, level });
}

export async function runWorkflow(runId: string, input: LeadInput) {
  await ensureDirs(runId);

  const state: RunState = {
    runId,
    status: 'running',
    createdAt: now(),
    steps: STEPS.map((s) => ({ ...s, status: 'queued' as const })),
  };

  await writeState(runId, state);
  await log(runId, 'system', `Workflow started: ${runId}`);

  let leadSummary = '';
  let emailDraft = '';
  let proposalDraft = '';
  let qaReview = '';

  try {
    // Step 1: Lead Analyser
    await updateStep(state, runId, 0, 'running');
    await log(runId, 'lead_analyzer', 'Analysing lead information...');
    leadSummary = await callAnthropic(
      prompts.leadAnalyzerSystem(),
      prompts.leadAnalyzerUser(input)
    );
    await writeRunFile(runId, 'context/01_lead_summary.md', leadSummary);
    await copyToLatest(runId);
    await updateStep(state, runId, 0, 'done');
    await log(runId, 'lead_analyzer', 'Lead summary generated.');

    // Steps 2 & 3: Follow-up Writer + Proposal Drafter — run in parallel.
    // Both depend only on leadSummary so there is no ordering constraint.
    // State writes are sequential to avoid concurrent state.json overwrites;
    // the actual Claude calls are parallelised where the time saving occurs.
    await updateStep(state, runId, 1, 'running');
    await updateStep(state, runId, 2, 'running');
    await log(runId, 'email_writer', 'Drafting follow-up email...');
    await log(runId, 'proposal_drafter', 'Drafting proposal...');

    [emailDraft, proposalDraft] = await Promise.all([
      callAnthropic(prompts.emailWriterSystem(), prompts.emailWriterUser(leadSummary, input)),
      callAnthropic(prompts.proposalDrafterSystem(), prompts.proposalDrafterUser(leadSummary, input)),
    ]);

    await Promise.all([
      writeRunFile(runId, 'drafts/02_followup_email_draft.md', emailDraft),
      writeRunFile(runId, 'drafts/03_proposal_draft.md', proposalDraft),
    ]);
    await copyToLatest(runId);
    await updateStep(state, runId, 1, 'done');
    await updateStep(state, runId, 2, 'done');
    await log(runId, 'email_writer', 'Email draft generated.');
    await log(runId, 'proposal_drafter', 'Proposal draft generated.');

    // Step 4: Quality Reviewer
    await updateStep(state, runId, 3, 'running');
    await log(runId, 'qa_reviewer', 'Reviewing quality...');
    const styleGuide = await readStyleGuide();
    qaReview = await callAnthropic(
      prompts.qaReviewerSystem(styleGuide),
      prompts.qaReviewerUser(leadSummary, emailDraft, proposalDraft)
    );
    await writeRunFile(runId, 'context/04_qa_review.md', qaReview);
    await copyToLatest(runId);
    await updateStep(state, runId, 3, 'done');
    const suggestions = parseSuggestions(qaReview);
    await writeSuggestions(runId, suggestions);
    await log(runId, 'qa_reviewer', `QA review complete. Extracted ${suggestions.length} suggestions.`);

    // Step 5: Checklist Compiler
    await updateStep(state, runId, 4, 'running');
    await log(runId, 'checklist_compiler', 'Compiling send checklist...');
    const checklist = await callAnthropic(
      prompts.checklistCompilerSystem(),
      prompts.checklistCompilerUser(leadSummary, emailDraft, proposalDraft, qaReview)
    );
    await writeRunFile(runId, 'context/05_send_checklist.md', checklist);
    await copyToLatest(runId);
    await updateStep(state, runId, 4, 'done');
    await log(runId, 'checklist_compiler', 'Send checklist compiled.');

    // Complete
    state.status = 'completed';
    state.completedAt = now();
    await writeState(runId, state);
    await copyToLatest(runId);
    await log(runId, 'system', 'Workflow completed successfully.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Mark ALL running steps as error — handles both sequential and parallel
    // failure modes (e.g. if steps 2 & 3 were running concurrently).
    for (const s of state.steps) {
      if (s.status === 'running') {
        s.status = 'error';
        s.error = message;
        s.completedAt = now();
      }
    }
    state.status = 'error';
    await writeState(runId, state);
    await log(runId, 'system', `Workflow error: ${message}`, 'error');
  } finally {
    await releaseLock();
  }
}

async function updateStep(
  state: RunState,
  runId: string,
  index: number,
  status: StepState['status']
) {
  const step = state.steps[index];
  step.status = status;
  if (status === 'running') step.startedAt = now();
  if (status === 'done' || status === 'error') step.completedAt = now();
  await writeState(runId, state);
}
