
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { ToolDescriptor } from '../protocol/types';

export const inputSchema = z.object({
  text: z.string()
});

export const outputSchema = z.object({
  echoed: z.string()
});

export const descriptor: ToolDescriptor = {
  toolId: 'echo.v1',
  name: 'Echo',
  description: 'Returns the same text sent in the input.',
  version: '1.0.0',
  inputSchema,
  outputSchema,
  tags: ['utility']
};

// ---- Handler ----
export async function handler(input: z.infer<typeof inputSchema>) {
  return { echoed: input.text };
}
