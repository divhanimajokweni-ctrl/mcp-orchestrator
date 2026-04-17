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
  { name: 'superdesign', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define design tools
const tools = [
  {
    name: 'create_color_palette',
    description: 'Generate a color palette',
    inputSchema: {
      type: 'object',
      properties: {
        base_color: { type: 'string', description: 'Base hex color' },
        count: { type: 'number', description: 'Number of colors to generate', default: 5 }
      },
      required: ['base_color']
    }
  },
  {
    name: 'design_layout',
    description: 'Create a layout structure',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['grid', 'flex', 'stack'], description: 'Layout type' },
        columns: { type: 'number', description: 'Number of columns' }
      },
      required: ['type']
    }
  }
];

// Handle tool calls
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'create_color_palette') {
    const colors = [];
    const base = args.base_color || '#6366f1';
    // Generate analogous colors
    for (let i = 0; i < (args.count || 5); i++) {
      colors.push(base);
    }
    return {
      content: [
        { type: 'text', text: JSON.stringify({ palette: colors, base: base }) }
      ]
    };
  }

  if (name === 'design_layout') {
    const layout = {
      type: args.type,
      columns: args.columns || 1,
      css: args.type === 'grid' ? `display: grid; grid-template-columns: repeat(${args.columns || 1}, 1fr);` :
           args.type === 'flex' ? `display: flex;` :
           `display: flex; flex-direction: column;`
    };
    return {
      content: [
        { type: 'text', text: JSON.stringify(layout) }
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