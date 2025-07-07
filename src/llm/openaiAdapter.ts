import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chatOpenAI(prompt: string, model = process.env.OPENAI_MODEL || 'gpt-4o-mini'): Promise<string> {
  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });
  return res.choices[0].message.content ?? '';
}

export async function embedOpenAI(text: string, model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'): Promise<number[]> {
  const e = await openai.embeddings.create({ model, input: text });
  return e.data[0].embedding;
}
