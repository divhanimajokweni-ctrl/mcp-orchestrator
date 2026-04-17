#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

// Direct CLI mode: if --prompt is provided, generate character sheet draft and exit
const args = process.argv.slice(1);
const promptIndex = args.indexOf('--prompt');
if (promptIndex !== -1 && args.length > promptIndex + 1) {
  (async () => {
    const prompt = args[promptIndex + 1];
    console.log(`[nano-banana] Received prompt: "${prompt}"`);
    console.log(`[nano-banana] Generating visual draft sketch...`);

    const fs = await import('fs');
    const path = await import('path');
    const pngjs = await import('pngjs');
    const PNG = pngjs.PNG;

    // Output setup
    const outputDir = path.join(process.cwd(), 'output');
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'musah_v01.png');

    const width = 600;
    const height = 800;
    const png = new PNG({ width, height });

    // ... [drawing code unchanged] ...

    // Write PNG
    const buffer = PNG.sync.write(png);
    await fs.promises.writeFile(outputPath, Buffer.from(buffer));

    console.log(`[nano-banana] Draft saved to: ${outputPath}`);
  })().catch(err => {
    console.error('[nano-banana] Error:', err);
    process.exit(1);
  });
}

// Helper: fill ellipse (approximate)
function fillEllipse(png, width, cx, cy, rx, ry, r, g, b) {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = x - cx;
      const dy = (y - cy) * (rx / ry);
      if (dx*dx + dy*dy <= rx*rx) {
        if (x >= 0 && x < width && y >= 0 && y < png.height) {
          const idx = (width * y + x) << 2;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        }
      }
    }
  }
}

// Helper: fill triangle (barycentric)
function fillTriangle(png, width, x1, y1, x2, y2, x3, y3, r, g, b) {
  const minX = Math.min(x1, x2, x3);
  const maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3);
  const maxY = Math.max(y1, y2, y3);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (barycentric(x, y, x1, y1, x2, y2, x3, y3) >= 0) {
        if (x >= 0 && x < width && y >= 0 && y < png.height) {
          const idx = (width * y + x) << 2;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        }
      }
    }
  }
}

function barycentric(px, py, x1, y1, x2, y2, x3, y3) {
  const area = 0.5 * (-y2*x3 + y1*(-x2 + x3) + x1*(y2 - y3) + x2*y3);
  const s = 1/(2*area) * (y1*x3 - x1*y3 + (x3 - x1)*py + (y1 - y3)*px);
  const t = 1/(2*area) * (x1*y2 - y1*x2 + (x1 - x2)*py + (y2 - y1)*px);
  return s >= 0 && t >= 0 && (1 - s - t) >= 0 ? s + t : -1;
}

// Simple text rendering (bitmap-style)
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
  // Simplified: draw a 5x7 pixel font pattern
  const patterns = {
    'A': [0x1C,0x22,0x22,0x3E,0x22,0x22,0x22],
    'B': [0x3E,0x22,0x22,0x3E,0x22,0x22,0x3E],
    'C': [0x1C,0x22,0x20,0x20,0x20,0x22,0x1C],
    'D': [0x3E,0x22,0x22,0x22,0x22,0x22,0x3E],
    'E': [0x3E,0x20,0x20,0x3E,0x20,0x20,0x3E],
    'F': [0x3E,0x20,0x20,0x3E,0x20,0x20,0x20],
    'G': [0x1C,0x22,0x20,0x26,0x22,0x22,0x1D],
    'H': [0x22,0x22,0x22,0x3E,0x22,0x22,0x22],
    'I': [0x1C,0x08,0x08,0x08,0x08,0x08,0x1C],
    'J': [0x0E,0x04,0x04,0x04,0x24,0x24,0x18],
    'K': [0x22,0x22,0x24,0x38,0x24,0x22,0x22],
    'L': [0x20,0x20,0x20,0x20,0x20,0x20,0x3E],
    'M': [0x22,0x36,0x2A,0x2A,0x22,0x22,0x22],
    'N': [0x22,0x32,0x2A,0x26,0x22,0x22,0x22],
    'O': [0x1C,0x22,0x22,0x22,0x22,0x22,0x1C],
    'P': [0x3E,0x22,0x22,0x3E,0x20,0x20,0x20],
    'Q': [0x1C,0x22,0x22,0x22,0x2A,0x12,0x0C],
    'R': [0x3E,0x22,0x22,0x3E,0x24,0x22,0x22],
    'S': [0x1E,0x20,0x20,0x1C,0x02,0x02,0x3C],
    'T': [0x3E,0x08,0x08,0x08,0x08,0x08,0x08],
    'U': [0x22,0x22,0x22,0x22,0x22,0x22,0x1C],
    'V': [0x22,0x22,0x22,0x14,0x14,0x0C,0x08],
    'W': [0x22,0x22,0x22,0x2A,0x2A,0x36,0x22],
    'X': [0x22,0x22,0x14,0x08,0x14,0x22,0x22],
    'Y': [0x22,0x22,0x14,0x08,0x08,0x08,0x08],
    'Z': [0x3E,0x02,0x04,0x18,0x20,0x20,0x3E],
    ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    ':': [0x00,0x0C,0x0C,0x00,0x0C,0x0C,0x00],
    '/': [0x02,0x04,0x08,0x10,0x20,0x40,0x80],
    '-': [0x00,0x00,0x00,0x3E,0x00,0x00,0x00],
  };
  const pat = patterns[char] || patterns[' '];
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