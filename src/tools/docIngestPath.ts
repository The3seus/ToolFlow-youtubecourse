/**
 * Document-Ingest-Path Agent (word-based chunking version)
 * --------------------------------------------------------
 * - Reads a local PDF or DOCX from a file path.
 * - Extracts all text and previews what was parsed.
 * - Warns if extraction looks suspiciously short.
 * - Splits text into overlapping chunks of up to 500 words (default).
 * - Embeds each chunk with OpenAI or Ollama.
 * - Stores all vectors in your ToolFlow vector store (with provider!).
 * - Returns a clear "added" message with stats.
 * - Console logs every major step for transparency and debugging.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { ToolDescriptor } from '../protocol/types';
import { addDoc } from '../rag/vectorStore';
import { embedText } from '../llm/embedText';

/* ---------- 1. Input & Output Schemas ---------- */
export const inputSchema = z.object({
  filePath: z.string(),                                        
  provider: z.enum(['openai', 'ollama']).default('openai'),    
  chunkSize: z.number().int().min(50).max(1000).default(500),  // Max words per chunk (default: 500)
  overlap: z.number().int().min(0).max(500).default(50),       // Overlap in words (default: 50)
});

export const outputSchema = z.object({
  id: z.string(),                
  tokens: z.number(),            
  chunks: z.number(),            
  status: z.enum(['added', 'failed'])
});

/* ---------- 2. Tool Descriptor ---------- */
export const descriptor: ToolDescriptor = {
  toolId: 'doc.ingestPath.v1',
  name: 'Document Ingest (Path, 500-word chunks)',
  description: 'Reads a local PDF or DOCX, splits into 500-word overlapping chunks for RAG search.',
  version: '1.3.1',
  inputSchema,
  outputSchema,
  tags: ['rag', 'pdf', 'docx', 'filesystem', 'ai', 'chunking']
};

/* ---------- 3. Handler (main ingest logic) ---------- */
export async function handler(input: z.infer<typeof inputSchema>) {
  // 1. Load the file from the given path
  const absPath = path.resolve(input.filePath);
  const buf = await fs.readFile(absPath);

  // 2. Extract text using the correct parser
  let rawText = '';
  const ext = absPath.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buf);
    rawText = result.text;
    console.log(`[doc.ingestPath] Extracted PDF text length: ${rawText.length}`);
    if (rawText.length < 1000) {
      console.warn('[doc.ingestPath] WARNING: PDF extract is suspiciously short.');
      console.log('[doc.ingestPath] PDF preview:', rawText.slice(0, 2000));
    } else {
      console.log('[doc.ingestPath] PDF preview:', rawText.slice(0, 500));
    }
  } else if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: buf });
    rawText = result.value;
    console.log(`[doc.ingestPath] Extracted DOCX text length: ${rawText.length}`);
    if (rawText.length < 1000) {
      console.warn('[doc.ingestPath] WARNING: DOCX extract is very short.');
      console.log('[doc.ingestPath] DOCX preview:', rawText.slice(0, 2000));
    } else {
      console.log('[doc.ingestPath] DOCX preview:', rawText.slice(0, 500));
    }
  } else {
    throw new Error('Unsupported file type – only PDF or DOCX allowed.');
  }

  if (!rawText.trim()) throw new Error('Document contained no extractable text!');

  // 3. Word-based chunking (with overlap)
  const words = rawText.replace(/\s+/g, ' ').trim().split(' ');
  const { chunkSize, overlap, provider } = input;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(' '));
    }
  }
  console.log(`[doc.ingestPath] 🟦 Split into ${chunks.length} word-based chunks (chunkSize=${chunkSize} words, overlap=${overlap} words)`);

  // 4. Embed each chunk and store with provider in the vector store
  const id = uuid();
  let totalTokens = 0;
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const { vector, tokens } = await embedText(chunk, provider);
    // Store provider info with each chunk for search compatibility!
    await addDoc({ id, text: chunk, embedding: vector, provider });
    totalTokens += tokens;
    if (idx % 10 === 0 || idx === chunks.length - 1) {
      console.log(`[doc.ingestPath] ...embedded chunk ${idx + 1}/${chunks.length}`);
    }
  }

  // 5. Return a detailed summary
  const result = { id, tokens: totalTokens, chunks: chunks.length, status: 'added' };
  console.log('[doc.ingestPath] ✅', result);
  return result;
}
