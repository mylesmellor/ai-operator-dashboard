import { NextRequest, NextResponse } from 'next/server';
import { RunResponse } from '@/lib/types';
import { readState, readLog, readRunFile, runExists, readSuggestions } from '@/lib/workspace';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;

    if (!(await runExists(runId))) {
      return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
    }

    const state = await readState(runId);
    const log = await readLog(runId, 50);

    const outputs: RunResponse['outputs'] = {};
    outputs.leadSummary = (await readRunFile(runId, 'context/01_lead_summary.md')) || undefined;
    outputs.emailDraft = (await readRunFile(runId, 'drafts/02_followup_email_draft.md')) || undefined;
    outputs.proposalDraft = (await readRunFile(runId, 'drafts/03_proposal_draft.md')) || undefined;
    outputs.qaReview = (await readRunFile(runId, 'context/04_qa_review.md')) || undefined;
    outputs.sendChecklist = (await readRunFile(runId, 'context/05_send_checklist.md')) || undefined;
    outputs.emailFinal = (await readRunFile(runId, 'final/02_followup_email.md')) || undefined;
    outputs.proposalFinal = (await readRunFile(runId, 'final/03_proposal.md')) || undefined;

    const suggestions = await readSuggestions(runId) || undefined;
    const response: RunResponse = { state, outputs, suggestions, log };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
