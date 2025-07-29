#!/usr/bin/env bun

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex !== -1 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : 'dist/webfinger.js';

// Read package.json to get version
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

console.log(`Building ${outputPath} with version ${version}...`);

// Ensure the output directory exists and is empty
const outputDir = path.dirname(outputPath);
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir, { recursive: true });

// Generate TypeScript declarations first
console.log('Generating TypeScript declarations...');
execSync('bun run tsc', { stdio: 'inherit' });

// Build ESM version
const esmFile = outputPath.replace('.js', '.mjs');
execSync(`bun build src/webfinger.ts --target=browser --format=esm --outfile=${esmFile} --banner="console.log('webfinger.js v${version} loaded');"`, { stdio: 'inherit' });

// Build CommonJS/UMD version
const tempFile = outputPath + '.tmp';
execSync(`bun build src/webfinger.ts --target=browser --format=esm --outfile=${tempFile} --banner="console.log('webfinger.js v${version} loaded');"`, { stdio: 'inherit' });

// Read the ESM output and wrap for CommonJS/UMD compatibility
const esmCode = fs.readFileSync(tempFile, 'utf8');
const cleanCode = esmCode.replace(/export \{[\s\S]*?\};?\s*$/m, '').trim();

const umdWrapper = `(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    // CommonJS/Node.js environment
    const result = factory();
    module.exports = result;
    module.exports.default = result;
  } else if (typeof define === 'function' && define.amd) {
    // AMD environment
    define([], factory);
  } else {
    // Browser environment
    root.WebFinger = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

${cleanCode}

// Return the WebFinger class (defined above)
return WebFinger;

}));`;

// Write the CommonJS/UMD bundle
fs.writeFileSync(outputPath, umdWrapper);

// Clean up temp file
fs.unlinkSync(tempFile);

console.log(`✓ Built ${outputPath} with UMD wrapper and version ${version}`);
