#!/usr/bin/env bun

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex !== -1 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : 'dist/webfinger.cjs';

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

// Remove tsc JavaScript output (we only need the .d.ts declarations;
// the browser .js alias is created later from the UMD bundle)
const tscJsFile = path.join(outputDir, 'webfinger.js');
const tscMapFile = path.join(outputDir, 'webfinger.js.map');
if (fs.existsSync(tscJsFile)) fs.unlinkSync(tscJsFile);
if (fs.existsSync(tscMapFile)) fs.unlinkSync(tscMapFile);

// Build ESM version
const esmFile = outputPath.replace(/\.c?js$/, '.mjs');
execSync(`bun build src/webfinger.ts --target=browser --format=esm --outfile=${esmFile}`, { stdio: 'inherit' });

// Add version banner to ESM output
const esmContent = fs.readFileSync(esmFile, 'utf8');
fs.writeFileSync(esmFile, `// webfinger.js v${version}\n${esmContent}`);

// Shared ESM → UMD wrapper. Bun's minifier preserves the `WebFinger` default-export
// class name, so the same strip-and-wrap flow works for both regular and minified inputs.
function wrapUmd(esmCode) {
  const cleanCode = esmCode.replace(/export\s*\{[\s\S]*?\};?\s*$/m, '').trim();
  return `(function (root, factory) {
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
// webfinger.js v${version}

${cleanCode}

// Return the WebFinger class (defined above)
return WebFinger;

}));`;
}

// Build CommonJS/UMD version
const tempFile = outputPath + '.tmp';
execSync(`bun build src/webfinger.ts --target=browser --format=esm --outfile=${tempFile}`, { stdio: 'inherit' });
fs.writeFileSync(outputPath, wrapUmd(fs.readFileSync(tempFile, 'utf8')));
fs.unlinkSync(tempFile);

// Create browser-friendly .js alias (same UMD bundle, conventional extension for CDN/script tags)
const browserFile = path.join(outputDir, 'webfinger.js');
fs.copyFileSync(outputPath, browserFile);

// Build minified UMD bundle for CDN consumers (dist/webfinger.min.js)
const minTempFile = outputPath + '.min.tmp';
execSync(`bun build src/webfinger.ts --target=browser --format=esm --minify --outfile=${minTempFile}`, { stdio: 'inherit' });
const minFile = path.join(outputDir, 'webfinger.min.js');
fs.writeFileSync(minFile, wrapUmd(fs.readFileSync(minTempFile, 'utf8')));
fs.unlinkSync(minTempFile);

console.log(`✓ Built ${outputPath} with UMD wrapper and version ${version}`);
console.log(`✓ Built ${minFile} (minified)`);
