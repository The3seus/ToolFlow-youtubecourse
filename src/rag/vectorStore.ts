import fs from 'fs/promises';
import path from 'path';

export interface Doc {
  id: string;
  text: string;
  embedding: number[];
}

const storePath = process.env.VECTOR_STORE_PATH || 'vectorStore.json';

async function load(): Promise<Doc[]> {
  try { return JSON.parse(await fs.readFile(storePath, 'utf8')); }
  catch { return []; }
}

async function save(docs: Doc[]) {
  await fs.writeFile(storePath, JSON.stringify(docs, null, 2), 'utf8');
}

export async function addDoc(doc: Doc) {
  const docs = await load();
  docs.push(doc);
  await save(docs);
}

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (magA * magB);
}

export async function topK(queryEmb: number[], k = 3): Promise<Doc[]> {
  const docs = await load();
  return docs
    .map(d => ({ doc: d, score: cosine(queryEmb, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ doc }) => doc);
}
