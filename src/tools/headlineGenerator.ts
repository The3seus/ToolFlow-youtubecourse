import { z } from 'zod';
import { ToolDescriptor } from '../protocol/types';
import OpenAI from 'openai';

// 1. Input schema: source text + optional tone
export const inputSchema = z.object({
  text: z.string(),
  tone: z.string().optional()
});

// 2. Output schema: generated headline
export const outputSchema = z.object({
  headline: z.string()
});

// 3. Descriptor to register with TFP
export const descriptor: ToolDescriptor = {
  toolId: 'headline.generator.v1',
  name: 'Headline Generator',
  description: 'Creates a catchy marketing headline from input text.',
  version: '1.0.0',
  inputSchema,
  outputSchema,
  tags: ['ai', 'prompt-engineering', 'marketing']
};

// 4. OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 5. Handler: system+user messages, call GPT, return headline
export async function handler(input: z.infer<typeof inputSchema>) {
  // a) System message to set the AI’s role/personality
  const systemMessage = {
    role: 'system' as const,
    content: 'You are a creative marketing copywriter. Generate punchy, concise headlines.'
  };

  // b) Build the user prompt dynamically
  const userPrompt = [
    `Here is some text:\n\n"${input.text}"`,
    input.tone ? `\n\nWrite a headline in a ${input.tone} tone.` : '',
    '\n\nHeadline:'
  ].join('');

  const userMessage = { role: 'user' as const, content: userPrompt };

  // c) Call the ChatCompletion API using GPT-4o-mini by default
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [systemMessage, userMessage],
    temperature: 0.8
  });

  // d) Safely extract the content, defaulting to an empty string if null
  const raw = completion.choices?.[0]?.message?.content ?? '';

  // e) Trim and return the headline
  return { headline: raw.trim() };
}
