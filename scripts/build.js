#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex !== -1 && args[outputIndex + 1] 
  ? args[outputIndex + 1] 
  : 'dist/webfinger.js';

// Read package.json to get version
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

console.log(`Post-processing ${outputPath} with version ${version}...`);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the compiled JavaScript (always from dist since that's where tsc outputs)
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

// Convert to browser-compatible format by wrapping in UMD pattern
const umdWrapper = `(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    // CommonJS
    factory(exports);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports'], factory);
  } else {
    // Browser globals
    var exports = {};
    factory(exports);
    root.WebFinger = exports.default || exports.WebFinger;
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {

${lines.join('\n')}

}));`;

// Write to specified output path
const enhancedJs = umdWrapper;
fs.writeFileSync(outputPath, enhancedJs);

console.log(`✓ Enhanced ${outputPath} with version logging and browser compatibility`);