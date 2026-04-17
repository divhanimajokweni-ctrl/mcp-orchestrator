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
  { name: 'blender-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define Blender tools
const tools = [
  {
    name: 'create_mesh',
    description: 'Create a 3D mesh primitive',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['cube', 'sphere', 'cylinder', 'plane'], description: 'Mesh type' },
        size: { type: 'number', description: 'Size of the mesh', default: 1.0 },
        location: { type: 'array', description: 'X, Y, Z coordinates' }
      },
      required: ['type']
    }
  },
  {
    name: 'set_material',
    description: 'Apply material to an object',
    inputSchema: {
      type: 'object',
      properties: {
        object_name: { type: 'string', description: 'Name of the object' },
        color: { type: 'string', description: 'Hex color code' },
        roughness: { type: 'number', description: 'Surface roughness (0-1)', default: 0.5 }
      },
      required: ['object_name', 'color']
    }
  }
];

// Handle tool calls
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'create_mesh') {
    const meshInfo = {
      type: args.type,
      size: args.size || 1.0,
      location: args.location || [0, 0, 0],
      vertices: 8,
      edges: 12,
      faces: 6
    };
    return {
      content: [
        { type: 'text', text: JSON.stringify({ action: 'create_mesh', ...meshInfo }) }
      ]
    };
  }

  if (name === 'set_material') {
    const materialInfo = {
      object: args.object_name,
      color: args.color,
      roughness: args.roughness || 0.5
    };
    return {
      content: [
        { type: 'text', text: JSON.stringify({ action: 'set_material', ...materialInfo }) }
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