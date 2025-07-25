# Release Setup Guide

## Required GitHub Secrets

To enable automated releases via GitHub Actions, you need to configure these secrets in your repository settings:

### 1. NPM_TOKEN

1. Go to [npm.com](https://www.npmjs.com/) and log in
2. Click your profile picture → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" (or "Publish" if you prefer more restricted access)
5. Copy the generated token
6. In GitHub: Settings → Secrets and variables → Actions → New repository secret
7. Name: `NPM_TOKEN`
8. Value: Your npm token

### 2. GITHUB_TOKEN (Automatic)

The `GITHUB_TOKEN` is automatically provided by GitHub Actions. No setup required.

## Workflow Permissions

The release workflow requires these permissions (already configured in the workflow file):
- `contents: write` - To create releases and push tags
- `id-token: write` - For secure npm publishing

## How to Use

### Option 1: GitHub Actions UI (Recommended)
1. Go to the [Actions tab](https://github.com/silverbucket/webfinger.js/actions/workflows/release.yml)
2. Click "Run workflow"
3. Select your release type:
   - **patch**: Bug fixes (2.7.1 → 2.7.2)
   - **minor**: New features (2.7.1 → 2.8.0)  
   - **major**: Breaking changes (2.7.1 → 3.0.0)
4. Click "Run workflow"

### Option 2: Local Script
```bash
bun run release:patch   # or minor/major
```

## What the Automation Does

1. ✅ Runs all tests and linting
2. ✅ Builds the project
3. ✅ Bumps version in package.json
4. ✅ Creates release commit
5. ✅ Creates and pushes git tag
6. ✅ Publishes to npm
7. ✅ Creates GitHub release with auto-generated notes
8. ✅ Provides summary with links

## Troubleshooting

### NPM Publish Fails
- Check your NPM_TOKEN is valid and has publish permissions
- Ensure you're not trying to publish a version that already exists

### Permission Denied
- Verify the workflow has `contents: write` permission
- Check that branch protection rules allow the action to push

### Build Fails
- The workflow will stop if tests fail or linting errors exist
- Fix issues and re-run the workflow

## Manual Fallback

If GitHub Actions is unavailable, you can still use the local release script:
```bash
./scripts/release.sh patch  # or minor/major
```

This provides the same functionality but runs locally instead of in GitHub Actions.