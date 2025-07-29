# Release Guide

## GitHub Actions Release Process

**All releases are handled through GitHub Actions and are fully automated from initiation to publication:**

### 1. Initiate Release

1. Go to [Actions → Prepare Release Workflow](https://github.com/silverbucket/webfinger.js/actions/workflows/prepare-release.yml)
2. Click **"Run workflow"**
3. Select release type:
   - **patch**: Bug fixes (2.7.1 → 2.7.2)
   - **minor**: New features (2.7.1 → 2.8.0)  
   - **major**: Breaking changes (2.7.1 → 3.0.0)
4. Click **"Run workflow"**

### 2. Automated Preparation

The workflow automatically:
- ✅ Runs all tests & linting
- ✅ Builds distribution files
- ✅ Bumps version in package.json
- ✅ Updates documentation
- ✅ Creates release branch (`release/v2.x.x`)
- ✅ **Creates pull request for review**

### 3. Review & Edit Release

1. **Review the generated PR** - check all changes look correct
2. **Edit CHANGELOG.md** in the PR if needed:
   - Add/refine release notes
   - Highlight breaking changes  
   - Credit contributors
3. **Test the demo** at [https://silverbucket.github.io/webfinger.js/](https://silverbucket.github.io/webfinger.js/)
4. **Approve and merge the PR** when ready

### 4. Automatic Publication

When you merge the release PR:
- ✅ **NPM publishing happens automatically**
- ✅ **GitHub release is created** with changelog
- ✅ **Demo page is updated** with new version
- ✅ **Git tags are created**

### 5. Verification

After merge, verify:
- ✅ [NPM package](https://www.npmjs.com/package/webfinger.js) shows new version
- ✅ [GitHub release](https://github.com/silverbucket/webfinger.js/releases) created
- ✅ [Demo page](https://silverbucket.github.io/webfinger.js/) shows new version
- ✅ Demo functionality works correctly


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

