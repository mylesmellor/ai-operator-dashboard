import { NextRequest, NextResponse } from 'next/server';
import { readRunFile, writeRunFile, readSuggestions, writeSuggestions, appendLog, copyToLatest } from '@/lib/workspace';
import { callAnthropic } from '@/lib/anthropic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
    const { suggestionId } = (await req.json()) as { suggestionId: string };

    // Read current suggestions
    const suggestions = await readSuggestions(runId);
    if (!suggestions) {
      return NextResponse.json({ error: 'No suggestions found for this run.' }, { status: 404 });
    }

    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found.' }, { status: 404 });
    }

    if (suggestion.accepted) {
      return NextResponse.json({ error: 'Suggestion already applied.' }, { status: 400 });
    }

    // Read the relevant draft
    const draftPath = suggestion.type === 'email'
      ? 'drafts/02_followup_email_draft.md'
      : 'drafts/03_proposal_draft.md';
    const draftContent = await readRunFile(runId, draftPath);
    if (!draftContent) {
      return NextResponse.json({ error: `${suggestion.type} draft not found.` }, { status: 404 });
    }

    // Call Claude to apply the suggestion
    const draftLabel = suggestion.type === 'email' ? 'follow-up email' : 'proposal';
    const systemPrompt = `You are a precise editor. Apply ONLY the specific suggestion to the ${draftLabel} draft below. Keep all other content, formatting, and structure exactly the same. Output only the complete modified draft with no explanations, preamble, or commentary.`;
    const userPrompt = `Here is the current ${draftLabel} draft:\n\n${draftContent}\n\n---\n\nApply this suggestion:\n${suggestion.text}\n\nOutput the complete modified draft now.`;

    const modifiedDraft = await callAnthropic(systemPrompt, userPrompt);

    // Save the modified draft
    await writeRunFile(runId, draftPath, modifiedDraft);

    // Mark suggestion as accepted
    const timestamp = new Date().toISOString();
    const updatedSuggestions = suggestions.map((s) =>
      s.id === suggestionId ? { ...s, accepted: true, appliedAt: timestamp } : s
    );
    await writeSuggestions(runId, updatedSuggestions);
    await copyToLatest(runId);

    // Log
    await appendLog(runId, {
      timestamp,
      step: 'suggestion',
      message: `Applied ${suggestion.type} suggestion: ${suggestion.text.substring(0, 80)}${suggestion.text.length > 80 ? '...' : ''}`,
      level: 'info',
    });

    return NextResponse.json({ success: true, appliedAt: timestamp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
