# Development Guide

Guide for contributing to and developing webfinger.js.

## Getting Started

This project uses [Bun](https://bun.sh) for development and package management.

### Prerequisites

- [Bun](https://bun.sh) (latest version)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/silverbucket/webfinger.js.git
cd webfinger.js

# Install dependencies
bun install
```

## Development Workflow

### Available Scripts

For a complete list of development commands with descriptions, run:

```bash
bun run help
```

### Development Commands

**Always use Bun** - This project uses Bun as the runtime and package manager. Never use `npm` or `node` commands.

```bash
# ✅ Correct
bun run test
bun run build
bun install some-package

# ❌ Incorrect  
npm test
node build.js
npm install some-package
```

## Project Structure

```
webfinger.js/
├── src/
│   └── webfinger.ts          # Main TypeScript source
├── dist/
│   ├── webfinger.js          # Compiled UMD bundle
│   ├── webfinger.d.ts        # TypeScript definitions
│   └── webfinger.js.map      # Source map
├── docs/
│   ├── api/
│   │   └── API.md            # Auto-generated API docs (DO NOT EDIT)
│   ├── EXAMPLES.md           # Usage examples
│   ├── DEVELOPMENT.md        # This file
│   ├── RELEASE.md            # Release process guide
│   └── SECURITY.md           # Security information
├── demo/
│   └── index.html            # Live demo page
├── test/                     # Test files
├── scripts/                  # Build and release scripts
└── .github/workflows/        # GitHub Actions
```

## Build System

The project uses a custom build system powered by Bun:

1. **TypeScript Compilation**: `tsc` compiles TypeScript with type checking
2. **Bundle Creation**: `bun build` creates optimized ESM bundle
3. **UMD Wrapping**: Custom script wraps ESM for universal compatibility
4. **Browser Testing**: Built files work in both Node.js and browsers

### Build Process

```bash
# The build process:
bun run tsc                    # TypeScript compilation
bun scripts/build.js           # Bundle creation with UMD wrapper
```

## Testing

Tests are organized into two tiers:

### Dev loop — `bun run test`

Fast feedback while editing source. Runs unit, integration, and browser tests against source and `.tmp/` build output.

```bash
bun run test             # unit + integration + browser
bun run test:unit        # Unit tests (TypeScript + JavaScript)
bun run test:integration # Integration tests with real servers
bun run test:browser     # Browser environment tests
```

### Release gate — `bun run test:release`

The authoritative check before shipping. Builds `dist/` and runs the full import matrix against the built artifacts, so any regression in `package.json` exports, bundler output, or module wrappers is caught before release.

```bash
bun run test:release     # build:release + test + test:imports
bun run test:imports     # Bun ESM + Node ESM + Node CJS smoke tests
bun run test:imports:bun      # Bun ES module import (spec/imports/bun)
bun run test:imports:node     # Node.js ES module import (spec/imports/node)
bun run test:imports:node-cjs # Node.js CommonJS require (spec/imports/node-cjs)
```

Run `test:release` whenever you touch `package.json` `exports`, `scripts/build.js`, `tsconfig*.json`, or anything that affects `dist/`. It mutates `dist/` locally — the dist policy still applies, so discard those changes (`git checkout -- dist/`) before committing.

### Test Structure

- **Unit tests**: `src/webfinger.test.ts` — Core functionality testing
- **Integration tests**: `spec/integration/` — Real server and local server tests
- **Browser tests**: `spec/browser/` — Browser environment compatibility
- **Import smoke tests**: `spec/imports/{bun,node,node-cjs}/` — Verify the published package imports cleanly in each supported runtime via `file:`/`link:` against `dist/`
- Uses Bun testing framework with comprehensive test coverage

### Supported import matrix

| Runtime | Module system | Test |
|---------|--------------|------|
| Bun | ES modules | `test:imports:bun` |
| Node.js | ES modules | `test:imports:node` |
| Node.js | CommonJS (`require`) | `test:imports:node-cjs` |

CI runs the full matrix on every pull request via `.github/workflows/compliance.yml`; `prepare-release.yml` runs it again before creating a release PR.

## Documentation System

Documentation is auto-generated from TypeScript source code using TypeDoc.

### Important: Never Edit API.md Manually

The `docs/API.md` file is **auto-generated** from JSDoc comments in the TypeScript source. 

```bash
# ✅ To update documentation:
# 1. Edit JSDoc comments in src/webfinger.ts
# 2. Run: bun run docs:generate

# ❌ Never do this:
# Edit docs/API.md directly
```

### Documentation Files

- **`docs/api/API.md`** - Auto-generated API reference (DO NOT EDIT)
- **`docs/EXAMPLES.md`** - Usage examples and patterns
- **`docs/DEVELOPMENT.md`** - This development guide
- **`README.md`** - Main project documentation

### Updating Documentation

1. **API Documentation**: Edit JSDoc comments in `src/webfinger.ts`
2. **Examples**: Edit `docs/EXAMPLES.md`
3. **Development Guide**: Edit `docs/DEVELOPMENT.md`
4. **README**: Edit main project info in `README.md`

## Code Style and Quality

### Linting

The project uses ESLint with TypeScript support:

```bash
bun run lint
```

**Always lint before committing** - The CI pipeline will fail if linting errors exist.

### TypeScript

- Full TypeScript implementation with strict type checking
- All public interfaces must be properly typed and documented
- JSDoc comments required for all public methods and classes

### Code Conventions

- Use TypeScript for all source code
- Comprehensive JSDoc documentation
- Prefer `async/await` over callbacks
- Export types for better developer experience

## Release Process

For release instructions, see **[RELEASE.md](RELEASE.md)** - the complete guide to creating releases using GitHub Actions or manual methods.

## Contributing Guidelines

### Before Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Install dependencies**: `bun install`
4. **Run tests**: `bun run test`

### Development Rules

- **Always use Bun** - Never use npm or node commands
- **Always lint and test** - Run `bun run lint` and `bun run test` before commits
- **Update documentation** - Edit JSDoc comments for API changes
- **Follow TypeScript conventions** - Proper typing and documentation required

### Pull Request Process

1. Ensure all tests pass: `bun run test`
2. Update JSDoc comments for any API changes
3. Add examples to `docs/EXAMPLES.md` if needed
4. Create clear commit messages
5. Submit pull request with description of changes

### Commit Messages

Use conventional commit format:

```
feat: add new WebFinger feature
fix: resolve lookup timeout issue
docs: update API documentation
refactor: improve error handling
test: add integration tests
chore: update dependencies
```

## Architecture Notes

### WebFinger Implementation

The library implements the [WebFinger RFC 7033](https://tools.ietf.org/rfc/rfc7033.txt) protocol with these features:

- **Fallback mechanisms** - Multiple endpoint discovery methods
- **Error handling** - Comprehensive error types and status codes
- **Type safety** - Full TypeScript implementation
- **Universal compatibility** - Works in browsers and Node.js

### Key Design Decisions

- **Single file architecture** - All code in `src/webfinger.ts`
- **UMD compatibility** - Works with CommonJS, AMD, and browser globals
- **Zero dependencies** - Self-contained with no runtime dependencies
- **TypeScript-first** - Built for modern development with full type support

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
- Run `bun run lint` to see specific issues
- Check TypeScript configuration in `tsconfig.json`

**Tests fail**
- Ensure you're using Bun, not Node.js
- Run `bun install` to update dependencies
- Check test environment variables

**Documentation not updating**
- Run `bun run docs:generate` manually
- Check JSDoc comments in TypeScript source
- Verify TypeDoc configuration in `typedoc.json`

### Getting Help

- Check existing [GitHub Issues](https://github.com/silverbucket/webfinger.js/issues)
- Review the [WebFinger RFC](https://tools.ietf.org/rfc/rfc7033.txt)
- Look at usage examples in `docs/EXAMPLES.md`
