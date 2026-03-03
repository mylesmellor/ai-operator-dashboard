import { NextRequest, NextResponse } from 'next/server';
import { readState, writeState, readRunFile, writeRunFile, appendLog, copyToLatest } from '@/lib/workspace';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
    const state = await readState(runId);

    if (state.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only finalise a completed run.' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const header = `> Finalised on ${timestamp}\n\n`;

    // Copy email draft to final
    const emailDraft = await readRunFile(runId, 'drafts/02_followup_email_draft.md');
    if (emailDraft) {
      await writeRunFile(runId, 'final/02_followup_email.md', header + emailDraft);
    }

    // Copy proposal draft to final
    const proposalDraft = await readRunFile(runId, 'drafts/03_proposal_draft.md');
    if (proposalDraft) {
      await writeRunFile(runId, 'final/03_proposal.md', header + proposalDraft);
    }

    state.status = 'finalised';
    state.finalisedAt = timestamp;
    await writeState(runId, state);
    await appendLog(runId, {
      timestamp,
      step: 'system',
      message: `Run finalised at ${timestamp}`,
      level: 'info',
    });
    await copyToLatest(runId);

    return NextResponse.json({ success: true, finalisedAt: timestamp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
