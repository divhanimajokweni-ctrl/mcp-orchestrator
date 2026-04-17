#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

// Direct CLI mode: if --prompt is provided, generate placeholder image and exit
const args = process.argv.slice(1);
const promptIndex = args.indexOf('--prompt');
if (promptIndex !== -1 && args.length > promptIndex + 1) {
  (async () => {
    const prompt = args[promptIndex + 1];
    console.log(`[nano-banana] Received prompt: "${prompt}`);
    console.log(`[nano-banana] Generating visual draft sketch...`);

    // Ensure output directory exists
    const fs = await import('fs');
    const path = await import('path');
    const outputDir = path.join(process.cwd(), 'output');
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'musah_v01.png');

    // Minimal 1x1 black pixel PNG (base64)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVQI12P4//8/AAX+Av7dzFtbAAAAAElFTkSuQmCC';
    const buffer = Buffer.from(pngBase64, 'base64');
    await fs.promises.writeFile(outputPath, buffer);

    console.log(`[nano-banana] Draft saved to: ${outputPath}`);
    // Print path for orchestrator extraction
    console.log(outputPath);
    process.exit(0);
  })().catch(err => {
    console.error('[nano-banana] Error:', err);
    process.exit(1);
  });
}

const server = new Server(
  { name: 'nano-banana', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define tools
const tools = [
  {
    name: 'nano_echo',
    description: 'Echo back a message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' }
      },
      required: ['message']
    }
  },
  {
    name: 'nano_transform',
    description: 'Transform text to uppercase',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to transform' }
      },
      required: ['text']
    }
  }
];

// Handle tool calls
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'nano_echo') {
    return {
      content: [
        { type: 'text', text: `Echo: ${args.message}` }
      ]
    };
  }

  if (name === 'nano_transform') {
    return {
      content: [
        { type: 'text', text: args.text.toUpperCase() }
      ]
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});