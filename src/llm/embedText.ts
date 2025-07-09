import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(
  text: string,
  provider: 'openai' | 'ollama' = 'openai'
): Promise<{ vector: number[]; tokens: number }> {
  if (provider === 'openai') {
    const model  = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
    const res    = await openai.embeddings.create({ model, input: text });
    const tokens = res.usage?.total_tokens ?? Math.ceil(text.length / 4);
    return { vector: res.data[0].embedding, tokens };
  }

  /* --- Ollama fallback ---------------------------------------------- */
  const base  = process.env.OLLAMA_BASE_URL  || 'http://localhost:11434';
  const model = process.env.OLLAMA_EMBED_MODEL || 'llama3';
  const resp  = await fetch(`${base}/api/embeddings`, {
    method : 'POST',
    headers: { 'Content-Type':'application/json' },
    body   : JSON.stringify({ model, prompt: text })
  });
  const json  = await resp.json();
  return { vector: json.embedding, tokens: Math.ceil(text.length / 4) };
}
