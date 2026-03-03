import { NextRequest, NextResponse } from 'next/server';
import { readInput, acquireLock, writeInput, generateRunId } from '@/lib/workspace';
import { runWorkflow } from '@/lib/workflow';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
    const input = await readInput(runId);

    if (!input) {
      return NextResponse.json({ error: 'Original input not found.' }, { status: 404 });
    }

    const locked = await acquireLock();
    if (!locked) {
      return NextResponse.json(
        { error: 'Run already in progress. Please wait for the current run to finish.' },
        { status: 409 }
      );
    }

    const newRunId = generateRunId();
    await writeInput(newRunId, input);

    runWorkflow(newRunId, input).catch((err) => {
      console.error('Workflow error:', err);
    });

    return NextResponse.json({ runId: newRunId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
