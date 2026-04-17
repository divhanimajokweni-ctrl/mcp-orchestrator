#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

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