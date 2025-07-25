#!/usr/bin/env node

const fs = require('fs');

// Read package.json to get version
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

console.log(`Post-processing dist/webfinger.js with version ${version}...`);

// Read the compiled JavaScript
const compiledJs = fs.readFileSync('dist/webfinger.js', 'utf8');

// Add version logging at the top (after "use strict" and comments)
const lines = compiledJs.split('\n');
let insertIndex = 0;

// Find where to insert the version log (after the license comment block)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('*/')) {
    insertIndex = i + 1;
    break;
  }
}

// Insert version logging
lines.splice(insertIndex, 0, `console.log('webfinger.js v${version} loaded');`);

// Convert to browser-compatible format by adding browser global export
const browserFooter = `
// Browser global export
if (typeof window !== 'undefined') {
  window.WebFinger = exports.default;
}`;

// Write back to dist directory
const enhancedJs = lines.join('\n') + browserFooter;
fs.writeFileSync('dist/webfinger.js', enhancedJs);

console.log('✓ Enhanced dist/webfinger.js with version logging and browser compatibility');