#!/usr/bin/env bun

/**
 * Simple static file server for the webfinger.js demo
 * Serves the demo directory with proper MIME types
 */

import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = process.env.PORT || 3000;
const DEMO_DIR = join(import.meta.dir, '../demo');
const TMP_DIR = join(import.meta.dir, '../.tmp');

// MIME type mapping
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'text/plain';
}

function serveFile(filePath) {
  try {
    const content = readFileSync(filePath);
    return new Response(content, {
      headers: {
        'Content-Type': getMimeType(filePath),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}

const server = Bun.serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Default to index.html
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Handle webfinger.js requests - serve from .tmp (development build)
    if (pathname === '/webfinger.js') {
      const tmpFile = join(TMP_DIR, 'webfinger.js');
      if (existsSync(tmpFile)) {
        return serveFile(tmpFile);
      } else {
        return new Response('Development build not found. Run "bun run build" first.', { 
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }

    // Serve files from demo directory
    const filePath = join(DEMO_DIR, pathname);
    
    // Security check - ensure file is within demo directory
    if (!filePath.startsWith(DEMO_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (existsSync(filePath)) {
      return serveFile(filePath);
    } else {
      return new Response('Not found', { status: 404 });
    }
  },
});

console.log(`🚀 Demo server running at http://localhost:${PORT}`);
console.log(`📂 Serving: demo/ directory`);
console.log(`📦 Using: .tmp/webfinger.js (development build)`);
console.log(`\n💡 Open http://localhost:${PORT} in your browser`);
console.log(`   Press Ctrl+C to stop\n`);