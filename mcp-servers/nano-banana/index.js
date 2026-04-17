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

    // === BACKGROUND ===
    // Dark blue gradient
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const r = Math.round(26 + t * 10);   // 26 → 36
      const g = Math.round(26 + t * 15);   // 26 → 41
      const b = Math.round(46 + t * 20);   // 46 → 66
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }

    // === DECORATIVE CORNERS ===
    drawCorner(png, width, height, 30, 30, 120, 120, 201, 166, 39); // gold L
    drawCorner(png, width, height, width-30, 30, -120, 120, 201, 166, 39);
    drawCorner(png, width, height, 30, height-30, 120, -120, 201, 166, 39);
    drawCorner(png, width, height, width-30, height-30, -120, -120, 201, 166, 39);

    // === HEADER SECTION ===
    // Top bar with gradient
    for (let y = 50; y < 180; y++) {
      for (let x = 50; x < width - 50; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = 15;      // #0f3460
        png.data[idx + 1] = 52;
        png.data[idx + 2] = 96;
      }
    }
    // Gold top border line
    for (let x = 50; x < width - 50; x++) {
      const idx1 = (width * 50 + x) << 2;
      const idx2 = (width * 51 + x) << 2;
      [idx1, idx2].forEach(idx => {
        png.data[idx] = 201; png.data[idx + 1] = 166; png.data[idx + 2] = 39;
        png.data[idx + 3] = 255;
      });
    }

    // === TITLE ===
    ctxFillText(png, width, "MUSAH", width / 2, 110, 56, 240, 230, 210); // cream
    ctxFillText(png, width, "PRODUCTION", width / 2, 155, 20, 201, 166, 39); // gold
    ctxFillText(png, width, "DOSSIER", width / 2, 180, 20, 201, 166, 39);

    // === CHARACTER SILHOUETTE (Epic Warrior) ===
    const cx = width / 2, cy = height / 2 + 50;

    // Body (trapezoid shape)
    fillPoly(png, width,
      [cx - 70, cy + 60],   // bottom-left
      [cx + 70, cy + 60],   // bottom-right
      [cx + 50, cy - 80],   // top-right
      [cx - 50, cy - 80],   // top-left
      45, 45, 67
    );

    // Head
    fillEllipse(png, width, cx, cy - 140, 45, 55, 240, 230, 210);

    // Shoulder pads (armor)
    fillEllipse(png, width, cx - 85, cy - 50, 35, 45, 201, 166, 39);
    fillEllipse(png, width, cx + 85, cy - 50, 35, 45, 201, 166, 39);

    // Arms
    fillRectRounded(png, width, cx - 120, cy - 20, 30, 100, 15, 70, 70, 70);
    fillRectRounded(png, width, cx + 90, cy - 20, 30, 100, 15, 70, 70, 70);

    // Spear shaft
    drawThickLine(png, width, cx + 60, cy - 220, cx + 60, cy + 30, 8, 201, 166, 39);
    // Spearhead
    fillTriangle(png, width,
      cx + 60, cy - 250,
      cx + 45, cy - 210,
      cx + 75, cy - 210,
      240, 230, 180
    );

    // Cape/Cloth flowing behind
    fillPoly(png, width,
      [cx - 65, cy + 60],
      [cx + 65, cy + 60],
      [cx + 80, cy + 180],
      [cx - 80, cy + 180],
      60, 60, 120, 0.7);

    // === INFO PANELS ===
    const panelY = 600;
    // Left panel
    drawPanel(png, width, 50, panelY, 250, 180, 15, 52, 96, 201, 166, 39);
    // Right panel  
    drawPanel(png, width, 300, panelY, 250, 180, 15, 52, 96, 201, 166, 39);

    // Panel text labels
    ctxFillText(png, width, "CLASS: WARRIOR", 65, panelY + 35, 16, 240, 230, 210);
    ctxFillText(png, width, "ORIGIN: DOSSIER", 65, panelY + 65, 16, 240, 230, 210);
    ctxFillText(png, width, "STATUS: ACTIVE", 65, panelY + 95, 16, 240, 230, 210);
    ctxFillText(png, width, "WEAPON: SPEAR", 65, panelY + 125, 14, 180, 180, 200);

    ctxFillText(png, width, "THREAT: HIGH", 315, panelY + 35, 16, 240, 230, 210);
    ctxFillText(png, width, "AFFIL: NONE", 315, panelY + 65, 16, 240, 230, 210);
    ctxFillText(png, width, "LAST: 2077.04.17", 315, panelY + 95, 16, 240, 230, 210);
    ctxFillText(png, width, "ID: MUSAH-001", 315, panelY + 125, 14, 180, 180, 200);

    // === FOOTER ===
    ctxFillText(png, width, "nano-banana MCP server", width / 2, height - 50, 14, 120, 120, 120);
    ctxFillText(png, width, "MUSAH VISUAL DRAFT v1.0", width / 2, height - 30, 14, 201, 166, 39);

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

// Helper: fill convex polygon (simple scanline for n vertices)
function fillPoly(png, width, ...points) {
  if (points.length < 3) return;
  const color = points.pop(); // last 3 args are r,g,b
  const r = color[0], g = color[1], b = color[2];
  const alpha = color[3] !== undefined ? color[3] : 255;
  const verts = points.flat(); // flatten [[x,y],...] to [x,y,...]
  const n = verts.length / 2;
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { xs.push(verts[i*2]); ys.push(verts[i*2+1]); }

  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  for (let y = ymin; y <= ymax; y++) {
    const intxs = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if ((ys[i] <= y && y < ys[j]) || (ys[j] <= y && y < ys[i])) {
        const x = xs[i] + (y - ys[i]) * (xs[j] - xs[i]) / (ys[j] - ys[i]);
        intxs.push(Math.round(x));
      }
    }
    intxs.sort((a,b) => a-b);
    for (let k = 0; k < intxs.length; k += 2) {
      if (k+1 < intxs.length) {
        for (let x = intxs[k]; x <= intxs[k+1]; x++) {
          if (x >= 0 && x < width && y >= 0 && y < png.height) {
            const idx = (width * y + x) << 2;
            png.data[idx] = r; png.data[idx+1] = g; png.data[idx+2] = b; png.data[idx+3] = alpha;
          }
        }
      }
    }
  }
}

// Helper: draw thick line
function drawThickLine(png, width, x0, y0, x1, y1, thick, r, g, b) {
  for (let t = -thick/2; t < thick/2; t++) {
    drawLine(png, width, x0+t, y0, x1+t, y1, r, g, b);
  }
}

function drawLine(png, width, x0, y0, x1, y1, r, g, b) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < png.height) {
      const idx = (width * y0 + x0) << 2;
      png.data[idx] = r; png.data[idx + 1] = g; png.data[idx + 2] = b; png.data[idx + 3] = 255;
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function fillRectRounded(png, width, x, y, w, h, r, red, green, blue) {
  // Simple rect (no round corners)
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0 && py < png.height) {
        const idx = (width * py + px) << 2;
        png.data[idx] = red; png.data[idx+1] = green; png.data[idx+2] = blue; png.data[idx+3] = 255;
      }
    }
  }
}

function drawCorner(png, width, height, x, y, dx, dy, r, g, b) {
  // Draw L-shaped corner decoration
  const len = 50;
  for (let i = 0; i < len; i++) {
    const ix = x + (dx > 0 ? i : -i);
    const iy = y + (dy > 0 ? i : -i);
    if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
      const idx1 = (width * iy + ix) << 2;
      png.data[idx1] = r; png.data[idx1+1] = g; png.data[idx1+2] = b;
    }
  }
  for (let i = 0; i < len; i++) {
    const ix = x + (dx > 0 ? i : -i);
    const iy = y + (dy > 0 ? len - i : -(len - i));
    if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
      const idx2 = (width * iy + ix) << 2;
      png.data[idx2] = r; png.data[idx2+1] = g; png.data[idx2+2] = b;
    }
  }
}

function drawPanel(png, width, x, y, w, h, br, bg, bb, tr, tg, tb) {
  // Panel background with rounded corners omitted for simplicity
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0 && py < png.height) {
        const idx = (width * py + px) << 2;
        png.data[idx] = br; png.data[idx+1] = bg; png.data[idx+2] = bb;
      }
    }
  }
  // Border
  for (let i = 0; i < w; i++) {
    const top = (width * y + x + i) << 2;
    const bottom = (width * (y + h - 1) + x + i) << 2;
    [top, bottom].forEach(idx => { png.data[idx] = tr; png.data[idx+1] = tg; png.data[idx+2] = tb; });
  }
  for (let i = 0; i < h; i++) {
    const left = (width * (y + i) + x) << 2;
    const right = (width * (y + i) + x + w - 1) << 2;
    [left, right].forEach(idx => { png.data[idx] = tr; png.data[idx+1] = tg; png.data[idx+2] = tb; });
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