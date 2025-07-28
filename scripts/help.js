#!/usr/bin/env bun

/**
 * Development help and command reference for webfinger.js
 */

console.log(`
🧪 WebFinger.js Development Commands:

📋 Testing:
   bun run test           - Complete test suite (unit + integration + browser)
   bun run test:unit      - Unit tests only (TypeScript + JavaScript)
   bun run test:browser   - Browser tests only  
   bun run test:integration - Integration tests only
   
🔧 Development:
   bun run build          - Build development version (.tmp/webfinger.js)
   bun run build:release  - Build release version (dist/webfinger.js)
   bun run build:clean    - Clean build and rebuild release
   bun run lint           - Run ESLint code linting
   
🚀 Demo:
   bun run demo:serve     - Serve demo locally at http://localhost:3000
   
📚 Documentation:
   bun run docs:generate  - Generate API documentation from TypeScript
   bun run docs:watch     - Watch mode for documentation generation
   
🎁 Release (see docs/RELEASE.md):
   bun run prepare-release:patch  - Prepare patch release (manual fallback)
   bun run prepare-release:minor  - Prepare minor release (manual fallback)
   bun run prepare-release:major  - Prepare major release (manual fallback)

⚠️  IMPORTANT NOTES:

   • "bun test" only runs unit tests by design
     For complete testing, always use "bun run test"
     
   • Always use Bun commands, never npm or node
   
   • Always run "bun run lint" and "bun run test" before commits
   
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