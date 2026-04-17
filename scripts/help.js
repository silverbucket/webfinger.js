#!/usr/bin/env bun

/**
 * Development help and command reference for webfinger.js
 */

console.log(`
🧪 WebFinger.js Development Commands:

📋 Testing (dev loop):
   bun run test           - Dev suite (unit + integration + browser)
   bun run test:unit      - Unit tests only (TypeScript + JavaScript)
   bun run test:browser   - Browser tests only
   bun run test:integration - Integration tests only

🎯 Testing (release gate):
   bun run test:release   - Full gate: build:release + test + test:imports
   bun run test:imports   - All import smoke tests (Bun ESM, Node ESM, Node CJS)
   bun run test:imports:bun      - Bun ES module import smoke test
   bun run test:imports:node     - Node.js ES module import smoke test
   bun run test:imports:node-cjs - Node.js CommonJS require() smoke test

🔧 Development:
   bun run build          - Build development version (.tmp/)
   bun run build:release  - Build release version (dist/)
   bun run build:clean    - Clean build and rebuild release
   bun run lint           - Run ESLint code linting
   
🚀 Demo:
   bun run demo:serve     - Serve demo locally at http://localhost:3000
   
📚 Documentation:
   bun run docs:generate  - Generate API documentation from TypeScript
   bun run docs:watch     - Watch mode for documentation generation
   
🎁 Release (see docs/RELEASE.md):

⚠️  IMPORTANT NOTES:

   • "bun test" only runs unit tests by design
     For the dev suite, use "bun run test"
     For the full release gate, use "bun run test:release"

   • Always use Bun commands, never npm or node

   • Always run "bun run lint" and "bun run test" before commits
     Run "bun run test:release" if you touch package.json exports,
     build config, or anything affecting dist/ — then discard the
     resulting dist/ changes with "git checkout -- dist/"

   • The dist/ directory should only contain the latest RELEASED version
     Never update dist/ during development - use .tmp/ for testing

🔗 Key Files:
   • src/webfinger.ts     - Main source code
   • demo/index.html      - Interactive demo page
   • docs/DEVELOPMENT.md  - Complete development guide
   • docs/RELEASE.md      - Release process guide

💡 Quick Start:
   bun install           # Install dependencies
   bun run build         # Build development version
   bun run demo:serve    # Test the demo locally
   bun run test          # Run all tests
`);