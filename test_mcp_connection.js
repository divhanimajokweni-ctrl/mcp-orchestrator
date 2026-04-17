#!/usr/bin/env node
// Direct MCP server connectivity test
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

console.error('Starting MCP server test...');

const server = new Server(
  { name: 'test-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

let initialized = false;

server.setRequestHandler(InitializeRequestSchema, async (request) => {
  initialized = true;
  console.error('✓ Initialize request handled');
  return {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'test-server', version: '1.0.0' }
  };
});

const tools = [
  { name: 'test_tool', description: 'A test tool', inputSchema: { type: 'object', properties: {} } }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('✓ ListTools request handled');
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error('✓ CallTool request handled');
  return { content: [{ type: 'text', text: 'Tool executed' }] };
});

async function main() {
  console.error('Connecting transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✓ Server connected and ready');
}

main().catch((error) => {
  console.error('✗ Server error:', error);
  process.exit(1);
});