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

When you merge the release PR, in this order:
1. ✅ **NPM publishing happens automatically**
2. ✅ **Git tag is created** (only after npm publish succeeds)
3. ✅ **GitHub release is created** with changelog (only after npm publish succeeds)
4. ✅ **Demo page is updated** with new version

If the npm publish fails, no tag or GitHub release is created. A tracking issue is
opened automatically. Fix the cause (usually an expired `NPM_TOKEN`) and re-run the
failed job; the rerun publishes, then tags and releases.

### 5. Verification

After merge, verify:
- ✅ [NPM package](https://www.npmjs.com/package/webfinger.js) shows new version
- ✅ [GitHub release](https://github.com/silverbucket/webfinger.js/releases) created
- ✅ [Demo page](https://silverbucket.github.io/webfinger.js/) shows new version
- ✅ Demo functionality works correctly


## Setup Requirements

**First-time setup only:**

1. **NPM Token**: Add `NPM_TOKEN` secret in the webfinger.js repository settings (Settings→Secrets and variables→Actions)
   - Get a granular access token from npmjs.com (Profile→Access Tokens) with read/write on `webfinger.js`
   - **Granular tokens expire (90 days by default).** Set the longest expiry you are comfortable with and note the date; an expired token makes `npm publish` fail with `E404 ... PUT https://registry.npmjs.org/webfinger.js`
   - Alternative: configure [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) for `publish-on-merge.yml`; the workflow already requests `id-token: write` and publishes with `--provenance`, so no long-lived token is required

2. **Done!** `GITHUB_TOKEN` is provided automatically.

## Release Verification

After merging the release PR and NPM publish completes, check:
- ✅ [NPM package](https://www.npmjs.com/package/webfinger.js) shows new version
- ✅ [GitHub release](https://github.com/silverbucket/webfinger.js/releases) created
- ✅ [Demo page](https://silverbucket.github.io/webfinger.js/) shows new version
- ✅ Demo functionality works correctly

## Troubleshooting

**Release fails?**
- Check the Actions log for the specific error
- `E404`/`E403` on `PUT https://registry.npmjs.org/webfinger.js` means `NPM_TOKEN` is expired, revoked, or lacks publish rights. Rotate it, then `gh run rerun <run-id> --failed`
- Verify no uncommitted changes

**Demo not updating?**
- GitHub Pages may take a few minutes to deploy
- Check the gh-pages branch was updated

