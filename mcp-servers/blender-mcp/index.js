#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
// Helper: simple text rendering (bitmap-style)
function ctxFillText(png, width, text, x, y, size, r, g, b) {
  const startY = y - size;
  const charWidth = size * 0.6;
  let cursorX = Math.floor(x - text.length * charWidth / 2);
  for (let i = 0; i < text.length; i++) {
    drawChar(png, width, text[i], cursorX, startY, size, r, g, b);
    cursorX += charWidth;
  }
}

function drawChar(png, width, char, x, y, size, r, g, b) {
  const patterns = {
    'M': [0x3E,0x22,0x22,0x36,0x22,0x22,0x22],
    'U': [0x22,0x22,0x22,0x22,0x22,0x22,0x1C],
    'S': [0x1E,0x20,0x20,0x1C,0x02,0x02,0x3C],
    'H': [0x22,0x22,0x22,0x3E,0x22,0x22,0x22],
    'A': [0x1C,0x22,0x22,0x3E,0x22,0x22,0x22],
    'E': [0x3E,0x20,0x20,0x3E,0x20,0x20,0x3E],
    'R': [0x3E,0x22,0x22,0x3E,0x24,0x22,0x22],
    'P': [0x3E,0x22,0x22,0x3E,0x20,0x20,0x20],
    'V': [0x22,0x22,0x22,0x14,0x14,0x0C,0x08],
    ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    'I': [0x1C,0x08,0x08,0x08,0x08,0x08,0x1C],
    'N': [0x22,0x32,0x2A,0x26,0x22,0x22,0x22],
    'C': [0x1C,0x22,0x20,0x20,0x20,0x22,0x1C],
    'L': [0x20,0x20,0x20,0x20,0x20,0x20,0x3E],
    'G': [0x1C,0x22,0x20,0x26,0x22,0x22,0x1D],
    'O': [0x1C,0x22,0x22,0x22,0x22,0x22,0x1C],
    'D': [0x3E,0x22,0x22,0x22,0x22,0x22,0x3E],
    'J': [0x0E,0x04,0x04,0x04,0x24,0x24,0x18],
    'K': [0x22,0x22,0x24,0x38,0x24,0x22,0x22],
    'T': [0x3E,0x08,0x08,0x08,0x08,0x08,0x08],
    'X': [0x22,0x22,0x14,0x08,0x14,0x22,0x22],
    'Z': [0x3E,0x02,0x04,0x18,0x20,0x20,0x3E],
    'Y': [0x22,0x22,0x14,0x08,0x08,0x08,0x08],
    'B': [0x3E,0x22,0x22,0x3E,0x22,0x22,0x3E],
    'F': [0x3E,0x20,0x20,0x3E,0x20,0x20,0x20],
    'Q': [0x1C,0x22,0x22,0x22,0x2A,0x12,0x0C],
    'W': [0x22,0x22,0x22,0x2A,0x2A,0x36,0x22],
  };
  const pat = patterns[char.toUpperCase()] || patterns[' '];
  const scale = Math.max(1, Math.floor(size / 7));
  for (let row = 0; row < 7; row++) {
    let rowBits = pat[row];
    for (let col = 0; col < 5; col++) {
      if (rowBits & (1 << (4 - col))) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = x + col * scale + dx;
            const py = y + row * scale + dy;
            if (px >= 0 && px < width && py >= 0 && py < png.height) {
              const idx = (width * py + px) << 2;
              png.data[idx] = r;
              png.data[idx + 1] = g;
              png.data[idx + 2] = b;
              png.data[idx + 3] = 255;
            }
          }
        }
      }
    }
  }
}

// Direct CLI mode: if --prompt is provided, execute create_mesh directly and exit
const args = process.argv.slice(1);
const promptIndex = args.indexOf('--prompt');
if (promptIndex !== -1 && args.length > promptIndex + 1) {
  const prompt = args[promptIndex + 1];
  const colonPos = prompt.indexOf(':');
  const tool = colonPos > -1 ? prompt.slice(0, colonPos).trim() : prompt.trim();

  (async () => {
    if (tool === 'create_mesh') {
      const fs = await import('fs');
      const path = await import('path');
      const { PNG } = await import('pngjs');
      const outDir = path.join(process.cwd(), 'output');
      await fs.promises.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, 'musah_mesh_render.png');

      // Generate simple cube preview
      const width = 400;
      const height = 400;
      const png = new PNG({ width, height });

      // Fill dark background
      for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 30;     // R
        png.data[i + 1] = 30; // G
        png.data[i + 2] = 50; // B
        png.data[i + 3] = 255;// A
      }

      // Helper to draw line (Bresenham)
      const drawLine = (x0, y0, x1, y1, r, g, b) => {
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        while (true) {
          if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
            const idx = (width * y0 + x0) << 2;
            png.data[idx] = r; png.data[idx + 1] = g; png.data[idx + 2] = b; png.data[idx + 3] = 255;
          }
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      };

      // Cube vertices (centered, perspective-ish)
      const cx = width / 2, cy = height / 2;
      const size = 80;
      // Simple orthographic projection: front face
      const vFront = [
        [cx - size, cy - size], // top-left
        [cx + size, cy - size], // top-right
        [cx + size, cy + size], // bottom-right
        [cx - size, cy + size], // bottom-left
      ];
      const vBack = [
        [cx - size - 40, cy - size - 40], // back top-left
        [cx + size - 40, cy - size - 40], // back top-right
        [cx + size - 40, cy + size - 40], // back bottom-right
        [cx - size - 40, cy + size - 40], // back bottom-left
      ];
      const vertices = [...vFront, ...vBack];

      // Draw edges
      const edges = [
        [0,1],[1,2],[2,3],[3,0], // front
        [4,5],[5,6],[6,7],[7,4], // back
        [0,4],[1,5],[2,6],[3,7]  // connecting
      ];
      edges.forEach(e => drawLine(vertices[e[0]][0], vertices[e[0]][1], vertices[e[1]][0], vertices[e[1]][1], 201, 166, 39)); // gold

      // Fill front face with semi-transparent color (PNG doesn't support alpha blending simply; skip)
      // Instead draw a simple "MUSAH" label
      ctxFillText(png, width, 'MUSAH', cx, cy + 120, 24, 201, 166, 39);
      ctxFillText(png, width, 'MESH PREVIEW', cx, cy + 150, 14, 180, 180, 200);

      // Write PNG
      const buffer = PNG.sync.write(png);
      await fs.promises.writeFile(outPath, Buffer.from(buffer));

      console.log(outPath);
      process.exit(0);
    }

    console.error(`Unknown tool: ${tool}`);
    process.exit(1);
  })().catch(err => {
    console.error('[blender-mcp] Error:', err);
    process.exit(1);
  });
}

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