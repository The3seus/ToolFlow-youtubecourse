import { z } from 'zod';
import { ToolDescriptor } from '../protocol/types';
import { embedOpenAI } from '../llm/openaiAdapter';
import { embedOllama } from '../llm/ollamaAdapter';
import { topK, Doc } from '../rag/vectorStore';
import { chatOpenAI } from '../llm/openaiAdapter';
import { chatOllama } from '../llm/ollamaAdapter';

export const inputSchema = z.object({
  query: z.string(),
  provider: z.enum(['openai', 'ollama']).optional(),
  topK: z.number().int().min(1).max(10).optional()
});
export const outputSchema = z.object({
  answer: z.string(),
  docs: z.array(z.object({ id: z.string(), text: z.string() }))
});

export const descriptor: ToolDescriptor = {
  toolId: 'rag.search',
  name: 'RAG Search',
  description: 'Retrieves top‑K similar docs then answers with the LLM.',
  version: '1.0.0',
  inputSchema,
  outputSchema,
  tags: ['rag', 'search']
};

export async function handler({ query, provider = 'openai', topK: k = 3 }: z.infer<typeof inputSchema>) {
  const embed = provider === 'ollama' ? embedOllama : embedOpenAI;
  const chat = provider === 'ollama' ? chatOllama : chatOpenAI;

  const queryEmb = await embed(query);
  const docs: Doc[] = await topK(queryEmb, k);

  const context = docs.map(d => `• ${d.text}`).join('\n');
  const prompt = `Answer the user question using ONLY the context below.\n\nContext:\n${context}\n\nQuestion: ${query}`;

  const answer = await chat(prompt);

  return { answer, docs: docs.map(({ id, text }) => ({ id, text })) };
}
