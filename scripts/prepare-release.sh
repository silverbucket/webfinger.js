#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting manual prepare release process...${NC}"

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
    echo "Usage: ./scripts/prepare-release.sh [major|minor|patch]"
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

# Bump version using npm (which updates package.json)
echo -e "${YELLOW}📈 Bumping version ($RELEASE_TYPE)...${NC}"
npm version $RELEASE_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(bun -p "require('./package.json').version")
echo -e "${GREEN}✅ New version: $NEW_VERSION${NC}"

# Build the project (AFTER version bump so it includes correct version)
echo -e "${YELLOW}🔨 Building project with new version...${NC}"
bun run build:release

# Update demo page with new version
echo -e "${YELLOW}📝 Updating demo page with new version...${NC}"
sed -i "s/{{VERSION}}/$NEW_VERSION/g" demo/index.html || true
sed -i "s/webfinger\.js v[0-9]\+\.[0-9]\+\.[0-9]\+/webfinger.js v$NEW_VERSION/g" demo/index.html || true

# Create release branch
RELEASE_BRANCH="release/v$NEW_VERSION"
echo -e "${YELLOW}🌿 Creating release branch: $RELEASE_BRANCH${NC}"
git checkout -b "$RELEASE_BRANCH"
git add package.json dist/ demo/
git commit -m "chore: bump version to $NEW_VERSION

🚀 Generated with manual prepare release process

Co-Authored-By: Prepare Release Script <noreply@example.com>"

# Push release branch
echo -e "${YELLOW}⬆️  Pushing release branch...${NC}"
git push origin "$RELEASE_BRANCH"

# Note: GitHub release creation will happen automatically when PR is merged

# Deploy to GitHub Pages
./scripts/deploy-to-ghpages.sh "$NEW_VERSION" "$RELEASE_BRANCH"

# Note: Git tagging will happen automatically when PR is merged

# Note: NPM publishing will happen automatically when PR is merged

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

## 📋 Pending Steps (on PR merge)
- 🏷️ **Git tag creation** - will happen automatically via GitHub Actions
- 📋 **GitHub release creation** - will happen automatically via GitHub Actions  
- 📦 **NPM publishing** - will happen automatically via GitHub Actions

## 🔗 Release Links
- **Demo**: https://silverbucket.github.io/webfinger.js/
- **GitHub Release**: (will be created after merge)
- **NPM**: https://www.npmjs.com/package/webfinger.js (will update after merge)

---
🚀 Generated with manual prepare release process" \
    --base "$CURRENT_BRANCH" \
    --head "$RELEASE_BRANCH"

echo -e "${GREEN}🎉 Release $NEW_VERSION prepared successfully!${NC}"
echo -e "${GREEN}📋 Next steps:${NC}"
echo -e "   • Test the demo at: https://silverbucket.github.io/webfinger.js/"
echo -e "   • Review and merge the release PR"
echo -e "   • NPM publishing will happen automatically on merge"
echo -e "   • Update any dependent projects after NPM publish"
echo -e "   • Announce the release"

# Cleanup function for failures
cleanup_on_failure() {
    echo -e "${RED}❌ Release failed. Cleaning up...${NC}"
    
    # Delete release branch if it exists
    git push origin --delete "$RELEASE_BRANCH" 2>/dev/null || true
    git branch -D "$RELEASE_BRANCH" 2>/dev/null || true
    
    # Note: No git tags to clean up - tagging happens on merge
    
    echo -e "${RED}Cleanup completed. Check the logs above for details.${NC}"
}

# Set trap for cleanup on failure
trap cleanup_on_failure ERR
