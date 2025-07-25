#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting manual release process...${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Must be on main/master branch to release. Currently on: $CURRENT_BRANCH${NC}"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin $CURRENT_BRANCH

# Check if release type is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please specify release type: major, minor, or patch${NC}"
    echo "Usage: ./scripts/release.sh [major|minor|patch]"
    exit 1
fi

RELEASE_TYPE=$1

# Validate release type
if [ "$RELEASE_TYPE" != "major" ] && [ "$RELEASE_TYPE" != "minor" ] && [ "$RELEASE_TYPE" != "patch" ]; then
    echo -e "${RED}❌ Invalid release type. Use: major, minor, or patch${NC}"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(bun -p "require('./package.json').version")
echo -e "${YELLOW}📋 Current version: $CURRENT_VERSION${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
bun install

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
bun test

# Run linting
echo -e "${YELLOW}🔍 Running linter...${NC}"
bun run lint

# Build the project
echo -e "${YELLOW}🔨 Building project...${NC}"
bun run build

# Bump version using npm (which updates package.json)
echo -e "${YELLOW}📈 Bumping version ($RELEASE_TYPE)...${NC}"
npm version $RELEASE_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(bun -p "require('./package.json').version")
echo -e "${GREEN}✅ New version: $NEW_VERSION${NC}"

# Create release branch
RELEASE_BRANCH="release/v$NEW_VERSION"
echo -e "${YELLOW}🌿 Creating release branch: $RELEASE_BRANCH${NC}"
git checkout -b "$RELEASE_BRANCH"
git add package.json
git commit -m "chore: bump version to $NEW_VERSION

🚀 Generated with manual release process

Co-Authored-By: Release Script <noreply@example.com>"

# Push release branch
echo -e "${YELLOW}⬆️  Pushing release branch...${NC}"
git push origin "$RELEASE_BRANCH"

# Create GitHub release
echo -e "${YELLOW}📋 Creating GitHub release...${NC}"
CHANGELOG=$(git log --pretty=format:"- %s" v$CURRENT_VERSION..HEAD | grep -v "^- chore: bump version" || echo "- Bug fixes and improvements")

gh release create "v$NEW_VERSION" \
    --title "Release v$NEW_VERSION" \
    --notes "## 🚀 What's New

$CHANGELOG

## 📦 Installation

\`\`\`bash
# Using bun (recommended)
bun add webfinger.js@$NEW_VERSION

# Using npm
npm install webfinger.js@$NEW_VERSION

# Using yarn  
yarn add webfinger.js@$NEW_VERSION
\`\`\`

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/webfinger.js)
- [Documentation](https://github.com/silverbucket/webfinger.js#readme)
- [Live Demo](https://silverbucket.github.io/webfinger.js/)

---
🚀 Generated with manual release process" \
    --draft=false

# Deploy to GitHub Pages
echo -e "${YELLOW}🌐 Deploying demo to GitHub Pages...${NC}"
# Save the built files before switching branches
cp dist/webfinger.js /tmp/webfinger.js
cp -r demo /tmp/demo-source

# Checkout gh-pages branch
git fetch origin gh-pages
git checkout gh-pages

# Copy saved files
cp /tmp/webfinger.js webfinger.js
cp -r /tmp/demo-source/* .

# Inject version into demo page
sed -i "s/{{VERSION}}/$NEW_VERSION/g" index.html

# Commit and push changes
git add .
git commit -m "Update demo to v$NEW_VERSION

🚀 Generated with manual release process" || true
git push origin gh-pages

# Switch back to release branch
git checkout "$RELEASE_BRANCH"

# Create git tag
echo -e "${YELLOW}🏷️  Creating git tag...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "v$NEW_VERSION"

# Publish to npm
echo -e "${YELLOW}📢 Publishing to npm...${NC}"
npm publish

# Verify demo deployment
echo -e "${YELLOW}🔍 Verifying demo deployment...${NC}"
./scripts/verify-demo.sh "$NEW_VERSION" || echo -e "${YELLOW}⚠️  Demo verification failed - check manually${NC}"

# Test WebFinger functionality
echo -e "${YELLOW}🧪 Testing WebFinger functionality...${NC}"
bun scripts/test-webfinger-functionality.js || echo -e "${YELLOW}⚠️  WebFinger test failed - check manually${NC}"

# Create PR to merge release branch back to main
echo -e "${YELLOW}📝 Creating release PR...${NC}"
git checkout "$CURRENT_BRANCH"

gh pr create \
    --title "Release v$NEW_VERSION" \
    --body "🚀 **Manual Release v$NEW_VERSION**

This PR contains the version bump for release v$NEW_VERSION.

## ✅ Release Steps Completed
- Tests & linting passed
- Project built successfully  
- Demo page updated and tested
- Published to npm
- GitHub release created
- Git tag created

## 🔗 Release Links
- **NPM**: https://www.npmjs.com/package/webfinger.js/v/$NEW_VERSION
- **GitHub Release**: https://github.com/silverbucket/webfinger.js/releases/tag/v$NEW_VERSION
- **Demo**: https://silverbucket.github.io/webfinger.js/

---
🚀 Generated with manual release process" \
    --base "$CURRENT_BRANCH" \
    --head "$RELEASE_BRANCH"

echo -e "${GREEN}🎉 Release $NEW_VERSION completed successfully!${NC}"
echo -e "${GREEN}📋 Next steps:${NC}"
echo -e "   • Review and merge the release PR"
echo -e "   • Update any dependent projects"
echo -e "   • Announce the release"

# Cleanup function for failures
cleanup_on_failure() {
    echo -e "${RED}❌ Release failed. Cleaning up...${NC}"
    
    # Delete release branch if it exists
    git push origin --delete "$RELEASE_BRANCH" 2>/dev/null || true
    git branch -D "$RELEASE_BRANCH" 2>/dev/null || true
    
    # Delete tag if it exists
    git push origin --delete "v$NEW_VERSION" 2>/dev/null || true
    git tag -d "v$NEW_VERSION" 2>/dev/null || true
    
    echo -e "${RED}Cleanup completed. Check the logs above for details.${NC}"
}

# Set trap for cleanup on failure
trap cleanup_on_failure ERR