import { z } from 'zod';
import { ToolDescriptor } from '../protocol/types';
import { embedOpenAI } from '../llm/openaiAdapter';
import { embedOllama } from '../llm/ollamaAdapter';
import { addDoc } from '../rag/vectorStore';
import { randomUUID } from 'crypto';

export const inputSchema = z.object({
  text: z.string().min(10),
  provider: z.enum(['openai', 'ollama']).optional()
});
export const outputSchema = z.object({
  id: z.string(),
  status: z.literal('added')
});

export const descriptor: ToolDescriptor = {
  toolId: 'rag.addDoc',
  name: 'RAG Add Doc',
  description: 'Adds a document to the local vector store for RAG.',
  version: '1.0.0',
  inputSchema,
  outputSchema,
  tags: ['rag', 'vector']
};

export async function handler({ text, provider = 'openai' }: z.infer<typeof inputSchema>) {
  const embed = provider === 'ollama' ? embedOllama : embedOpenAI;
  const embedding = await embed(text);
  const id = randomUUID();
  await addDoc({ id, text, embedding });
  return { id, status: 'added' };
}
