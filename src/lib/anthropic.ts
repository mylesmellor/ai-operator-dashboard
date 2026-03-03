import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Please add it to your .env.local file.');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
  const c = getClient();
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  const response = await c.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}
