#!/usr/bin/env bun

/* eslint-env node */
/* eslint-disable no-undef */

// Test WebFinger functionality from the deployed demo

console.log('Testing WebFinger functionality...');

// Download the webfinger.js file from the demo
const response = await fetch('https://silverbucket.github.io/webfinger.js/webfinger.js');
if (!response.ok) {
  console.error('❌ Failed to download webfinger.js from demo');
  process.exit(1);
}

const webfingerCode = await response.text();

// Create a minimal browser-like environment
// Bun has built-in fetch and XMLHttpRequest support
global.window = {};

// Execute the webfinger code
eval(webfingerCode);

// Test WebFinger lookup
const wf = new WebFinger({
  webfist_fallback: true,
  uri_fallback: true
});

console.log('Testing WebFinger lookup for nick@silverbucket.net...');

const testPromise = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('WebFinger lookup timed out after 15 seconds'));
  }, 15000);
  
  wf.lookup('nick@silverbucket.net', (err, result) => {
    clearTimeout(timeout);
    if (err) {
      console.error('WebFinger lookup failed:', err.message);
      reject(err);
    } else if (result && result.idx && result.idx.properties) {
      console.log('✅ WebFinger lookup successful!');
      console.log('Profile name:', result.idx.properties.name || 'Not provided');
      console.log('Available links:', Object.keys(result.idx.links || {}));
      resolve(result);
    } else {
      reject(new Error('WebFinger returned unexpected result format'));
    }
  });
});

try {
  await testPromise;
  console.log('✅ WebFinger functionality test passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ WebFinger test failed:', error.message);
  process.exit(1);
}