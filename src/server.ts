
import express, { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { ToolDescriptor, CallToolRequestSchema, CallToolSuccessSchema, CallToolErrorSchema } from './protocol/types';
import { descriptor as echoDescriptor, handler as echoHandler } from './tools/echo';
import { descriptor as chatDesc, handler as chatHandler } from './tools/llmChat';
import { descriptor as ragDesc, handler as ragHandler } from './tools/ragSearch';
import { descriptor as addDocDesc, handler as addDocHandler } from './tools/ragAddDoc';
import { descriptor as headlineDesc, handler as headlineHandler } from './tools/headlineGenerator';
import { descriptor as imageDesc, handler as imageHandler } from './tools/imageGenerator';



const app = express();
app.use(express.json());

/* ---------------- Tool Registry ----------------- */
type ToolEntry = {
  descriptor: ToolDescriptor;
  handler: (input: any) => Promise<any>;
};

const registry: Record<string, ToolEntry> = {};

function registerTool(desc: ToolDescriptor, handler: (input: any) => Promise<any>) {
  registry[desc.toolId] = { descriptor: desc, handler };
}

registerTool(echoDescriptor, echoHandler);
registerTool(chatDesc, chatHandler);   
registerTool(ragDesc, ragHandler);
registerTool(addDocDesc, addDocHandler);
registerTool(headlineDesc, headlineHandler);
registerTool(imageDesc, imageHandler);


/* ---------------- Endpoints ----------------- */

// List tools
app.get('/tfp/tools', (_req: Request, res: Response) => {

  res.json(Object.values(registry).map(r => r.descriptor));
});

// Invoke tool
app.post('/tfp/invoke', async (req: Request, res: Response) => {
  try {
    const parsedReq = CallToolRequestSchema.parse({
      ...req.body,
      requestId: req.body.requestId ?? uuid()
    });

    const toolEntry = registry[parsedReq.toolId];
    if (!toolEntry) {
      res.status(404).json({
        requestId: parsedReq.requestId,
        toolId: parsedReq.toolId,
        metadata: { timestamp: new Date().toISOString(), status: 'error' },
        error: { code: 'ToolNotFound', message: 'Unknown tool', details: null }
      });
      return;
    }

    // Validate input
    const validInput = toolEntry.descriptor.inputSchema.parse(parsedReq.input);

    const start = Date.now();
    const output = await toolEntry.handler(validInput);
    // Validate output
    toolEntry.descriptor.outputSchema.parse(output);

    const successBody = {
      requestId: parsedReq.requestId,
      toolId: parsedReq.toolId,
      output,
      metadata: {
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        status: 'success' as const
      }
    };
    res.json(successBody);
  } catch (err: any) {
    res.status(400).json({
      requestId: req.body?.requestId ?? uuid(),
      toolId: req.body?.toolId ?? 'unknown',
      metadata: { timestamp: new Date().toISOString(), status: 'error' as const },
      error: {
        code: err.name ?? 'ValidationError',
        message: err.message ?? 'Invalid request',
        details: err.stack
      }
    });
  }
});

export function start(port = 3000) {
  app.listen(port, () => {
    console.log(`[TFP] Server listening on http://localhost:${port}`);
  });
}
