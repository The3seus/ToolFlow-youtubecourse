import { z } from 'zod';
import { ToolDescriptor } from '../protocol/types';
import { chatOpenAI } from '../llm/openaiAdapter';
import { chatOllama } from '../llm/ollamaAdapter';

export const inputSchema = z.object({
  prompt: z.string(),
  provider: z.enum(['openai', 'ollama']).optional()
});
export const outputSchema = z.object({ completion: z.string() });

export const descriptor: ToolDescriptor = {
  toolId: 'llm.chat',
  name: 'LLM Chat',
  description: 'Single‑turn chat completion via OpenAI or Ollama.',
  version: '1.0.0',
  inputSchema,
  outputSchema,
  tags: ['llm']
};

export async function handler({ prompt, provider }: z.infer<typeof inputSchema>) {
  const completion =
    provider === 'ollama'
      ? await chatOllama(prompt)
      : await chatOpenAI(prompt);
  return { completion };
}
