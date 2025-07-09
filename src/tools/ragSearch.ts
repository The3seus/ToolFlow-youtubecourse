import { z } from 'zod';
import { ToolDescriptor } from '../protocol/types';
import { embedOpenAI, chatOpenAI } from '../llm/openaiAdapter';
import { embedOllama, chatOllama } from '../llm/ollamaAdapter';
import { topK, Doc } from '../rag/vectorStore';

/* ---------- Schemas & Descriptor ---------- */
export const inputSchema = z.object({
  query: z.string(),
  provider: z.enum(['openai', 'ollama']).optional(),
  topK: z.number().int().min(1).max(20).optional()
});
export const outputSchema = z.object({
  answer: z.string(),
  docs: z.array(z.object({ id: z.string(), text: z.string(), score: z.number() }))
});

export const descriptor: ToolDescriptor = {
  toolId: 'rag.search',
  name: 'RAG Search',
  description: 'Retrieves top-K similar docs then answers with the LLM.',
  version: '2.0.0',
  inputSchema,
  outputSchema,
  tags: ['rag', 'search']
};

/* ---------- Handler ---------- */
export async function handler({
  query,
  provider = 'openai',
  topK: k = 6
}: z.infer<typeof inputSchema>) {
  /* 1. Embed query */
  const embed   = provider === 'ollama' ? embedOllama : embedOpenAI;
  const chat    = provider === 'ollama' ? chatOllama  : chatOpenAI;
  const queryEmb = await embed(query);

  /* 2. Retrieve scored chunks */
  const scored = await topK(queryEmb, provider, k, true); // typed via overload

  /* 3. Handle no results */
  if (!scored.length) {
    return { answer: "No relevant information found in your documents.", docs: [] };
  }

  /* 4. Build context */
  const context = scored.map((s, i) =>
    `Document Chunk #${i + 1} (Score: ${s.score.toFixed(3)}):\n${s.doc.text.slice(0, 2000)}`
  ).join('\n\n');

  /* 5. Prompt LLM */
  const prompt = `You are a helpful AI assistant with access to document excerpts below.
When possible, answer the user's question using the provided context. If relevant information is present, answer as best you can. If not, say "Sorry, I couldn't find the answer in the supplied context."

Context:
${context}

User Question: ${query}
Answer:`;

  const answerRaw = await chat(prompt);
  const answer = answerRaw?.trim() || "Sorry, I couldn't find the answer in the supplied context.";

  /* 6. Return answer and docs */
  return {
    answer,
    docs: scored.map(({ doc, score }) => ({ id: doc.id, text: doc.text, score }))
  };
}
