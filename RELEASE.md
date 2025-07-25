# Release Guide

## Quick Prepare Release (Recommended)

**GitHub Actions - One-Click Prepare Release:**

1. Go to [Actions → Prepare Release Workflow](https://github.com/silverbucket/webfinger.js/actions/workflows/prepare-release.yml)
2. Click **"Run workflow"**
3. Select release type:
   - **patch**: Bug fixes (2.7.1 → 2.7.2)
   - **minor**: New features (2.7.1 → 2.8.0)  
   - **major**: Breaking changes (2.7.1 → 3.0.0)
4. Click **"Run workflow"**

✅ **This creates a release branch and PR for you:**
- Tests & linting
- Build & version bump
- GitHub release
- Demo page update
- All verification checks
- **Creates PR for your review** (no auto-publish)

## Final Steps

After the prepare release workflow completes:

5. **Test the demo** at [https://silverbucket.github.io/webfinger.js/](https://silverbucket.github.io/webfinger.js/)
6. **Review and merge the release PR**
7. **NPM publishing happens automatically** when you merge the PR

## Manual Prepare Release (Fallback)

If GitHub Actions is unavailable:

```bash
# Patch release (recommended)
bun run prepare-release:patch

# Or minor/major
bun run prepare-release:minor
bun run prepare-release:major
```

## Setup Requirements

**First-time setup only:**

1. **NPM Token**: Add `NPM_TOKEN` secret in [repository settings](https://github.com/silverbucket/webfinger.js/settings/secrets/actions)
   - Get token from [npmjs.com](https://www.npmjs.com/settings/tokens)
   - Use "Automation" token type

2. **Done!** `GITHUB_TOKEN` is provided automatically.

## Release Verification

After merging the release PR and NPM publish completes, check:
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

**Manual prepare release needed?**
- Use local prepare release scripts as fallback
- All the same automation runs locally
- Still creates PR for review (no auto-publish)