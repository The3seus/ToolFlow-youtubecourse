import fs from 'fs/promises';

/* ---------- Types ---------- */
export interface Doc {
  id: string;
  text: string;
  embedding: number[];
  provider: 'openai' | 'ollama';
}

/* ---------- Storage ---------- */
const storePath = process.env.VECTOR_STORE_PATH || 'vectorStore.json';
let cache: Doc[] = [];   // never null

async function load(): Promise<Doc[]> {
  if (cache.length) return cache;
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed: any[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    cache = parsed.filter(
      (d: any): d is Doc =>
        d &&
        typeof d.id === 'string' &&
        typeof d.text === 'string' &&
        Array.isArray(d.embedding) &&
        (d.provider === 'openai' || d.provider === 'ollama')
    );
  } catch {
    cache = [];
  }
  return cache;
}

async function save(docs: Doc[]) {
  await fs.writeFile(storePath, JSON.stringify(docs, null, 2), 'utf8');
  cache = docs;
}

/* ---------- Public helpers ---------- */
export async function addDoc(doc: Doc) {
  const docs = await load();
  docs.push(doc);
  await save(docs);
  return doc;
}

function cosine(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

/* ----- Function overloads for topK ----- */
export async function topK(
  queryEmb: number[],
  provider: 'openai' | 'ollama',
  k?: number
): Promise<Doc[]>;
export async function topK(
  queryEmb: number[],
  provider: 'openai' | 'ollama',
  k: number,
  returnScores: true
): Promise<{ doc: Doc; score: number }[]>;

/* ----- Implementation ----- */
export async function topK(
  queryEmb: number[],
  provider: 'openai' | 'ollama',
  k = 3,
  returnScores: boolean = false
): Promise<any[]> {
  const docs = (await load()).filter(d => d.provider === provider);
  const scored = docs
    .map(doc => ({ doc, score: cosine(queryEmb, doc.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return returnScores ? scored : scored.map(({ doc }) => doc);
}
