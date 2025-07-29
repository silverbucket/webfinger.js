#!/usr/bin/env bun

/* eslint-env node */
/* eslint-disable no-undef */

// Test that the demo page can actually load and use WebFinger

console.log('Testing demo page WebFinger functionality...');

const DEMO_URL = 'https://silverbucket.github.io/webfinger.js/';

// First, download the demo page HTML
const demoResponse = await fetch(DEMO_URL);
if (!demoResponse.ok) {
  console.error('❌ Failed to download demo page');
  process.exit(1);
}

const demoHtml = await demoResponse.text();

// Check if the demo page references webfinger.js correctly
if (!demoHtml.includes('src="webfinger.js"')) {
  console.error('❌ Demo page does not reference webfinger.js correctly');
  console.error('Expected: src="webfinger.js"');
  console.error('Found in HTML:', demoHtml.match(/src="[^"]*webfinger[^"]*"/g) || 'No webfinger references found');
  process.exit(1);
}
console.log('✅ Demo page references webfinger.js correctly');

// Now try to fetch the webfinger.js file from the same base URL as the demo
const jsUrl = new URL('webfinger.js', DEMO_URL).href;
const jsResponse = await fetch(jsUrl);

if (!jsResponse.ok) {
  console.error(`❌ Failed to download webfinger.js from demo site: ${jsResponse.status} ${jsResponse.statusText}`);
  console.error(`Tried URL: ${jsUrl}`);
  process.exit(1);
}
console.log('✅ webfinger.js file loads correctly from demo site');

const webfingerCode = await jsResponse.text();

// Extract version from demo page
const demoVersionMatch = demoHtml.match(/v(\d+\.\d+\.\d+)/);
const demoVersion = demoVersionMatch ? demoVersionMatch[1] : null;

// Extract version from JS file  
const jsVersionMatch = webfingerCode.match(/webfinger\.js v(\d+\.\d+\.\d+)/);
const jsVersion = jsVersionMatch ? jsVersionMatch[1] : null;

if (!demoVersion || !jsVersion) {
  console.error('❌ Could not extract versions');
  console.error('Demo version:', demoVersion);
  console.error('JS version:', jsVersion);
  process.exit(1);
}

if (demoVersion !== jsVersion) {
  console.error('❌ Version mismatch between demo page and JS file');
  console.error('Demo page version:', demoVersion);
  console.error('JS file version:', jsVersion);
  process.exit(1);
}

console.log(`✅ Version consistency check passed (${demoVersion})`);

// Test that we can execute the code in browser environment
try {
  // Create a minimal browser-like environment (no CommonJS exports)
  global.window = {};
  global.self = global.window;
  
  // Execute the webfinger code
  eval(webfingerCode);
  
  // Get WebFinger from the window global (set by the webfinger.js file)
  const WebFinger = global.window.WebFinger;
  
  if (typeof WebFinger !== 'function') {
    console.error('❌ WebFinger is not available on window object');
    process.exit(1);
  }
  
  // Try to create an instance
  new WebFinger({
    uri_fallback: true
  });
  
  console.log('✅ WebFinger constructor works correctly');
  
} catch (error) {
  console.error('❌ Failed to execute webfinger.js from demo site:', error.message);
  process.exit(1);
}

console.log('✅ Demo page WebFinger functionality test passed!');