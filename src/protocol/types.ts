
import { z } from 'zod';

// ---- Core Zod schemas ----
export const ToolDescriptorSchema = z.object({
  toolId: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),                       // semver
  inputSchema: z.any(),                      // will be refined per‑tool
  outputSchema: z.any(),
  tags: z.array(z.string()).optional()
});

export type ToolDescriptor = z.infer<typeof ToolDescriptorSchema>;

export const CallToolRequestSchema = z.object({
  requestId: z.string(),                     // uuid
  toolId: z.string(),
  input: z.any()
});

export const CallToolSuccessSchema = z.object({
  requestId: z.string(),
  toolId: z.string(),
  output: z.any(),
  metadata: z.object({
    durationMs: z.number(),
    timestamp: z.string(),
    status: z.literal('success')
  })
});

export const CallToolErrorSchema = z.object({
  requestId: z.string(),
  toolId: z.string(),
  metadata: z.object({
    timestamp: z.string(),
    status: z.literal('error')
  }),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  })
});

export type CallToolRequest = z.infer<typeof CallToolRequestSchema>;
export type CallToolSuccess = z.infer<typeof CallToolSuccessSchema>;
export type CallToolError = z.infer<typeof CallToolErrorSchema>;
