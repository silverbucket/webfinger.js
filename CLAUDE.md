# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

webfinger.js is a WebFinger client library that runs in both browser and Node.js environments. It implements the WebFinger protocol for discovering user information across domains using email-like addresses.

## Development Commands

### Linting
```bash
bun run lint      # Run ESLint on the codebase
```

### TypeScript Compilation
```bash
bun run build     # Compile TypeScript to JavaScript (outputs to .tmp/)
```

### Testing
```bash
bun run test      # Run the test suite
```

### Documentation
```bash
bun run docs:generate  # Generate API documentation from TypeScript/JSDoc
bun run docs:watch     # Watch mode for documentation generation
```

### Package Management
- Uses `bun` as the package manager (configured in package.json)
- Run `bun install` to install dependencies

## Architecture

### Core Structure
- **Main source**: `src/webfinger.ts` - Single TypeScript file containing the WebFinger class
- **Output**: Compiles to `dist/webfinger.js` (UMD module for browser and Node.js)
- **Tests**: Located in `src/` directory
- **Documentation**: Auto-generated `docs/API.md` from TypeScript/JSDoc

### WebFinger Class Architecture
The main `WebFinger` class in `src/webfinger.ts` implements:

- **Constructor**: Takes configuration object with options for TLS, fallbacks, timeouts
- **Primary Methods**:
  - `lookup(address)`: Main WebFinger lookup functionality
  - `lookupLink(address, rel)`: Find specific link relations
- **Private Methods**:
  - `fetchJRD()`: HTTP request handler for JSON Resource Descriptor (JRD) responses
  - `processJRD()`: Processes and indexes WebFinger responses
- **Fallback Chain**: Supports multiple fallback mechanisms:
  1. Different URI endpoints (`webfinger`, `host-meta`, `host-meta.json`)
  2. HTTP fallback from HTTPS

### Key Constants
- `LINK_URI_MAPS`: Maps WebFinger relation URIs to property names
- `LINK_PROPERTIES`: Defines supported link types (avatar, blog, profile, etc.)
- `URIS`: Fallback endpoint order for discovery

## TypeScript Implementation

The project features:
- **Full TypeScript**: Source code with comprehensive type definitions
- **Exported Types**: `WebFingerConfig`, `WebFingerResult`, `LinkObject`, `JRD`, `WebFingerError`
- **JSDoc Documentation**: Comprehensive comments for IDE support and auto-generated docs
- **UMD Build System**: Uses bun build with custom wrapper for universal compatibility

## Documentation System

- **Auto-generated**: `docs/API.md` generated from TypeScript/JSDoc using TypeDoc
- **Single Source of Truth**: JSDoc comments in source drive both IDE support and documentation
- **Always Current**: Documentation regenerated during release process

## Build Process
- TypeScript compiles with full type checking
- Bun build creates optimized ESM bundle
- Custom UMD wrapper adds browser/Node.js compatibility  
- Build process adds version logging automatically
- Demo references `dist/webfinger.js` directly

## Dist Directory Policy
- **CRITICAL**: The `dist/` directory should ONLY contain the latest RELEASED version
- **NEVER update dist during development or testing** - it should only be updated during the official release process
- **Do not modify build system** to update dist when tests run - this pollutes the repository with development artifacts
- Tests should run against source TypeScript files, and compiled dist files

## Release Process
- **Prepare Release**: Creates release branch with version bump, build, docs generation
- **Release Notes**: Managed in `CHANGELOG.md` with manual curation in PR
- **GitHub Actions**: Automated workflows for both prepare and publish steps
- **NPM Publishing**: Automatic on release PR merge

## Testing
- Unit tests use Bun testing framework
- Other tests use mocha & chai
- Browser tests are run with web-test-runner
- Both TypeScript and compiled JavaScript are tested
- Tests run against development and release builds

# Important Instructions
- **ALWAYS USE BUN**: Never use npm or node commands, always use bun
- **ALWAYS LINT AND TEST BEFORE COMMITS**: CRITICAL - Run `bun run lint` and `bun run test` before ANY commit or push. This is non-negotiable.
- **NEVER UPDATE DIST DURING DEVELOPMENT**: The dist/ directory should only contain the latest released version
- **Documentation**: API docs are auto-generated - update JSDoc in source code
- **No proactive README/docs creation**: Only create documentation if explicitly requested
