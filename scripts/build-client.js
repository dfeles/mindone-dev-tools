#!/usr/bin/env node

/**
 * Build client-agent.js as a standalone IIFE bundle
 * Simple approach: just copy and wrap the file
 */

const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '../src/client-agent.js');
const distFile = path.join(__dirname, '../dist/client-agent.global.js');
const distDir = path.dirname(distFile);

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read source file
const source = fs.readFileSync(srcFile, 'utf8');

// Wrap in IIFE and expose to window
const wrapped = `(function(window) {
${source}
})(typeof window !== 'undefined' ? window : globalThis);`;

// Write to dist
fs.writeFileSync(distFile, wrapped, 'utf8');
console.log('✓ Built client-agent.global.js');

