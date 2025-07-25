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

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Use bun build to create ESM bundle
const tempFile = outputPath + '.tmp';
execSync(`bun build src/webfinger.ts --target=browser --format=esm --outfile=${tempFile} --banner="console.log('webfinger.js v${version} loaded');"`, { stdio: 'inherit' });

// Read the ESM output and wrap for browser compatibility
const esmCode = fs.readFileSync(tempFile, 'utf8');
const cleanCode = esmCode.replace(/export \{\s*WebFinger as default\s*\};?\s*$/, '');

const umdWrapper = `(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.WebFinger = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

${cleanCode}

return WebFinger;

}));`;

// Write the final bundle
fs.writeFileSync(outputPath, umdWrapper);

// Clean up temp file
fs.unlinkSync(tempFile);

console.log(`✓ Built ${outputPath} with UMD wrapper and version ${version}`);