#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

// Direct CLI mode: if --prompt is provided, execute tool directly and exit
const args = process.argv.slice(1);
const promptIndex = args.indexOf('--prompt');
if (promptIndex !== -1 && args.length > promptIndex + 1) {
  const prompt = args[promptIndex + 1];
  // Parse "tool_name: target"
  const colonPos = prompt.indexOf(':');
  const tool = colonPos > -1 ? prompt.slice(0, colonPos).trim() : prompt.trim();
  const target = colonPos > -1 ? prompt.slice(colonPos + 1).trim() : '';

  (async () => {
    const fs = await import('fs');
    const path = await import('path');
    const outDir = path.join(process.cwd(), 'output');
    await fs.promises.mkdir(outDir, { recursive: true });

    if (tool === 'create_color_palette') {
      // Generate grounded palette
      const base = inferBaseColor(target) || '#6366f1';
      const count = 5;
      const palette = generatePalette(base, count);
      
      const outPath = path.join(outDir, 'musah_palette.json');
      await fs.promises.writeFile(outPath, JSON.stringify({
        palette,
        base,
        name: target || 'Musah Character Palette',
        description: 'Grounded character color palette'
      }, null, 2));
      console.log(outPath);
      process.exit(0);
    }
    if (tool === 'design_layout') {
      const outPath = path.join(outDir, 'layout.json');
      await fs.promises.writeFile(outPath, JSON.stringify({
        type: target.toLowerCase().includes('grid') ? 'grid' : 'flex',
        columns: 1,
        css: 'display: flex; flex-direction: column;'
      }, null, 2));
      console.log(outPath);
      process.exit(0);
    }

    console.error(`Unknown tool: ${tool}`);
    process.exit(1);
  })().catch(err => {
    console.error('[superdesign] Error:', err);
    process.exit(1);
  });
}

// Helper: infer base color from description text (very simple)
function inferBaseColor(desc) {
  const d = desc.toLowerCase();
  if (d.includes('blue')) return '#3b82f6';
  if (d.includes('red')) return '#ef4444';
  if (d.includes('green')) return '#22c55e';
  if (d.includes('gold') || d.includes('yellow')) return '#eab308';
  if (d.includes('purple')) return '#a855f7';
  if (d.includes('orange')) return '#f97316';
  return null;
}

// Helper: generate grounded palette (5 colors + ground)
function generatePalette(baseHex, count) {
  const hex = baseHex.replace('#', '');
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  const palette = [];
  for (let i = 0; i < count - 1; i++) {
    const t = i / (count - 2);
    const factor = 0.5 + t * 0.5; // 0.5-1.0
    const nr = Math.min(255, Math.round(r * factor));
    const ng = Math.min(255, Math.round(g * factor));
    const nb = Math.min(255, Math.round(b * factor));
    palette.push(`#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`);
  }
  palette.push('#2d2d44'); // ground
  return palette;
}

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

const server = new Server(
  { name: 'superdesign', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handle tool calls
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'create_color_palette') {
    const base = args.base_color || '#6366f1';
    const count = args.count || 5;
    const hex = base.replace('#', '');
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    const palette = [];
    for (let i = 0; i < count - 1; i++) {
      const t = i / Math.max(1, count - 2);
      const factor = 0.5 + t * 0.5;
      const nr = Math.min(255, Math.round(r * factor));
      const ng = Math.min(255, Math.round(g * factor));
      const nb = Math.min(255, Math.round(b * factor));
      palette.push(`#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`);
    }
    palette.push('#2d2d44'); // ground
    return {
      content: [{ type: 'text', text: JSON.stringify({ palette, base, name: 'Musah Palette' }) }]
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
      content: [{ type: 'text', text: JSON.stringify(layout) }]
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