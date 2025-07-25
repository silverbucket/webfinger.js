# Release v{VERSION}

## 📋 Pre-Release Checklist

### 🚀 Release Commands

#### Option 1: GitHub Actions (Recommended)
1. Go to [Actions tab](https://github.com/silverbucket/webfinger.js/actions/workflows/release.yml)
2. Click "Run workflow"
3. Select release type (patch/minor/major)
4. Click "Run workflow" button

#### Option 2: Local Release Script
```bash
# Patch release (bug fixes)
bun run release:patch

# Minor release (new features)
bun run release:minor

# Major release (breaking changes)
bun run release:major

# Or use the script directly
./scripts/release.sh [patch|minor|major]
```

### ✅ Automated Steps (handled by release script)
- [ ] Clean working directory verified (`git status --porcelain`)
- [ ] On main/master branch confirmed (`git branch --show-current`)
- [ ] Latest changes pulled from origin (`git pull origin main`)
- [ ] Dependencies installed (`bun install`)
- [ ] All tests passing (`bun test`)
- [ ] Linting checks passed (`bun run lint`)
- [ ] Project built successfully (`bun run build`)
- [ ] Version bumped in package.json (`npm version [type]`)
- [ ] Release commit created (`git commit`)
- [ ] Git tag created and pushed (`git tag`, `git push`)
- [ ] Published to npm (`npm publish`)

### 📝 Manual Steps
- [ ] GitHub release created with notes
  ```bash
  # The script provides a direct link to create the release
  # Or use GitHub CLI: gh release create v{VERSION} --generate-notes
  ```
- [ ] Release notes reviewed and updated
- [ ] Demo site updated (if applicable)
  ```bash
  # Update demo if needed
  git checkout gh-pages
  git merge master
  git push origin gh-pages
  ```
- [ ] Documentation updated for new features
- [ ] Dependent projects notified
- [ ] Community announcement made

### 🔍 Verification Commands
```bash
# Verify release was published
npm view webfinger.js@{VERSION}

# Check GitHub release
gh release view v{VERSION}

# Verify git tag
git tag -l | grep v{VERSION}

# Test installation
npm install webfinger.js@{VERSION}
```

## 🚀 What's New

### ✨ Features
- 

### 🐛 Bug Fixes
- 

### 🔒 Security
- 

### 📚 Documentation
- 

### 🔧 Development
- 

## 📦 Installation

```bash
# Using bun (recommended)
bun add webfinger.js@{VERSION}

# Using npm
npm install webfinger.js@{VERSION}

# Using yarn
yarn add webfinger.js@{VERSION}
```

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/webfinger.js)
- [Documentation](https://github.com/silverbucket/webfinger.js#readme)
- [Live Demo](https://silverbucket.github.io/webfinger.js/demo/)

## 🙏 Contributors

Special thanks to all contributors who made this release possible!

---

**Full Changelog**: https://github.com/silverbucket/webfinger.js/compare/v{PREVIOUS_VERSION}...v{VERSION}