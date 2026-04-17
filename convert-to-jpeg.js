#!/usr/bin/env node
// Convert PNG to JPEG for maximum compatibility
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const inputDir = path.join(__dirname, 'output');
const files = [
  'musah_v01.png',
  'musah_mesh_render.png'
];

files.forEach(file => {
  const pngPath = path.join(inputDir, file);
  const jpgPath = pngPath.replace('.png', '.jpg');

  try {
    const rawData = fs.readFileSync(pngPath);
    const png = PNG.sync.read(rawData);
    const jpegData = jpeg.encode(png, { quality: 90 });
    fs.writeFileSync(jpgPath, jpegData.data);
    console.log(`✓ Converted: ${file} -> ${path.basename(jpgPath)}`);
  } catch (e) {
    console.error(`✗ Failed: ${file} - ${e.message}`);
  }
});

console.log('\nJPEG files saved to output/ directory');
