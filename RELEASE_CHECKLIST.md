# Release Checklist

## Pre-release Testing
- [ ] Run tests: `npm test`
- [ ] Run linting: `npm run lint`

## Build and Version
- [ ] Build TypeScript to JavaScript (includes version logging and browser compatibility): `npm run build`
- [ ] Update version in `package.json`
- [ ] Verify version appears correctly in `dist/webfinger.js` console log

## Git Operations
- [ ] Commit changes (including updated `dist/`)
- [ ] Tag release: `git tag vX.X.X`
- [ ] Push code and tags: `git push && git push --tags`

## Publication
- [ ] Go to GitHub and create release from tag
- [ ] Publish to npm: `npm publish`

## Verification
- [ ] Verify demo works at https://silverbucket.github.io/webfinger.js/demo/
- [ ] Check console shows correct version in demo
- [ ] Verify npm package is available
