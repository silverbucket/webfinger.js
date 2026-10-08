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
opened automatically. Fix the cause (usually the npm Trusted Publisher configuration)
and re-run the failed job; the rerun publishes, then tags and releases.

### 5. Verification

After merge, verify:
- ✅ [NPM package](https://www.npmjs.com/package/webfinger.js) shows new version
- ✅ [GitHub release](https://github.com/silverbucket/webfinger.js/releases) created
- ✅ [Demo page](https://silverbucket.github.io/webfinger.js/) shows new version
- ✅ Demo functionality works correctly


## Setup Requirements

**First-time setup only:**

1. **npm Trusted Publishing**: publishing uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so no long-lived npm token is stored in the repository. Register the publisher once on npmjs.com: open the `webfinger.js` package → Settings → Trusted Publisher → GitHub Actions, and enter:
   - Organization or user: `silverbucket`
   - Repository: `webfinger.js`
   - Workflow filename: `publish-on-merge.yml`
   - Environment: leave blank

   The workflow requests `id-token: write`, upgrades npm to 11.5.1 or newer, and publishes with `--provenance`. npm is [phasing out 2FA-bypass tokens](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) for direct publishing (January 2027), so a token-based setup would stop working anyway. If an `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret still exists in the repository, delete it.

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
- `E404`/`E403`/`ENEEDAUTH` on `PUT https://registry.npmjs.org/webfinger.js` is almost always an auth problem: the Trusted Publisher on npmjs.com is missing or does not match the repo (`silverbucket/webfinger.js`) and workflow filename (`publish-on-merge.yml`), or the runner's npm is older than 11.5.1. `EOTP` means a token (not OIDC) was used and the account requires 2FA; remove any leftover `NPM_TOKEN`/`NODE_AUTH_TOKEN` secrets. Fix the cause, then `gh run rerun <run-id> --failed`
- Trusted Publishing only works for the workflow file on the default branch, so a workflow change must be merged to `master` before it takes effect
- Verify no uncommitted changes

**Demo not updating?**
- GitHub Pages may take a few minutes to deploy
- Check the gh-pages branch was updated

