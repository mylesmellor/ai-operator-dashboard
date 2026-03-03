import { NextRequest, NextResponse } from 'next/server';
import { readState, writeRunFile, appendLog, copyToLatest } from '@/lib/workspace';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
    const { type, content } = (await req.json()) as { type: 'email' | 'proposal'; content: string };

    const state = await readState(runId);
    if (state.status === 'finalised') {
      return NextResponse.json({ error: 'Cannot edit a finalised run.' }, { status: 400 });
    }

    const draftPath = type === 'email'
      ? 'drafts/02_followup_email_draft.md'
      : 'drafts/03_proposal_draft.md';

    await writeRunFile(runId, draftPath, content);
    await copyToLatest(runId);

    const timestamp = new Date().toISOString();
    await appendLog(runId, {
      timestamp,
      step: 'manual_edit',
      message: `${type === 'email' ? 'Email' : 'Proposal'} draft manually edited.`,
      level: 'info',
    });

    return NextResponse.json({ success: true, savedAt: timestamp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
