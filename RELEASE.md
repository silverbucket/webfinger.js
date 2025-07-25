# Release Guide

## Quick Release (Recommended)

**GitHub Actions - One-Click Release:**

1. Go to [Actions → Release Workflow](https://github.com/silverbucket/webfinger.js/actions/workflows/release.yml)
2. Click **"Run workflow"**
3. Select release type:
   - **patch**: Bug fixes (2.7.1 → 2.7.2)
   - **minor**: New features (2.7.1 → 2.8.0)  
   - **major**: Breaking changes (2.7.1 → 3.0.0)
4. Click **"Run workflow"**

✅ **That's it! Everything happens automatically:**
- Tests & linting
- Build & version bump
- NPM publish
- GitHub release
- Demo page update
- All verification checks

## Manual Release (Fallback)

If GitHub Actions is unavailable:

```bash
# Patch release (recommended)
bun run release:patch

# Or minor/major
bun run release:minor
bun run release:major
```

## Setup Requirements

**First-time setup only:**

1. **NPM Token**: Add `NPM_TOKEN` secret in [repository settings](https://github.com/silverbucket/webfinger.js/settings/secrets/actions)
   - Get token from [npmjs.com](https://www.npmjs.com/settings/tokens)
   - Use "Automation" token type

2. **Done!** `GITHUB_TOKEN` is provided automatically.

## Release Verification

After release, check:
- ✅ [NPM package](https://www.npmjs.com/package/webfinger.js) shows new version
- ✅ [GitHub release](https://github.com/silverbucket/webfinger.js/releases) created
- ✅ [Demo page](https://silverbucket.github.io/webfinger.js/) shows new version
- ✅ Demo functionality works correctly

## Troubleshooting

**Release fails?**
- Check the Actions log for specific error
- Ensure NPM_TOKEN is valid
- Verify no uncommitted changes

**Demo not updating?**
- GitHub Pages may take a few minutes to deploy
- Check the gh-pages branch was updated

**Manual release needed?**
- Use local release scripts as fallback
- All the same automation runs locally