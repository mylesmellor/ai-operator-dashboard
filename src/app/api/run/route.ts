import { NextRequest, NextResponse } from 'next/server';
import { LeadInput } from '@/lib/types';
import { generateRunId, acquireLock, writeInput } from '@/lib/workspace';
import { runWorkflow } from '@/lib/workflow';

export async function POST(req: NextRequest) {
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured. Please add it to .env.local.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const input = body as LeadInput;

    // Basic validation
    if (!input.name || !input.company || !input.email) {
      return NextResponse.json(
        { error: 'Name, Company, and Email are required.' },
        { status: 400 }
      );
    }
    if (!input.context && !input.painPoints) {
      return NextResponse.json(
        { error: 'At least one of Context or Pain Points is required.' },
        { status: 400 }
      );
    }

    // Limit input sizes
    for (const key of Object.keys(input) as (keyof LeadInput)[]) {
      if (typeof input[key] === 'string' && input[key].length > 5000) {
        return NextResponse.json(
          { error: `Field "${key}" exceeds maximum length of 5000 characters.` },
          { status: 400 }
        );
      }
    }

    // Acquire lock
    const locked = await acquireLock();
    if (!locked) {
      return NextResponse.json(
        { error: 'Run already in progress. Please wait for the current run to finish.' },
        { status: 409 }
      );
    }

    const runId = generateRunId();
    await writeInput(runId, input);

    // Fire and forget - run workflow in background
    runWorkflow(runId, input).catch((err) => {
      console.error('Workflow error:', err);
    });

    return NextResponse.json({ runId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
