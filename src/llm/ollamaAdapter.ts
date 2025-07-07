import axios from 'axios';

const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const chatModel = process.env.OLLAMA_MODEL || 'llama3';
const embedModel = process.env.OLLAMA_EMBED_MODEL || 'llama3';

export async function chatOllama(prompt: string): Promise<string> {
  const { data } = await axios.post(`${base}/api/chat`, {
    model: chatModel,
    messages: [{ role: 'user', content: prompt }]
  });
  return data.message?.content ?? '';
}

export async function embedOllama(text: string): Promise<number[]> {
  const { data } = await axios.post(`${base}/api/embeddings`, {
    model: embedModel,
    prompt: text
  });
  return data.embedding;
}
