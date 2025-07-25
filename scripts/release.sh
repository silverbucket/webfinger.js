#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting release process...${NC}"

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
CURRENT_VERSION=$(node -p "require('./package.json').version")
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
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ New version: $NEW_VERSION${NC}"

# Create release commit
echo -e "${YELLOW}📝 Creating release commit...${NC}"
git add package.json
git commit -m "chore: bump version to $NEW_VERSION

🚀 Generated with automated release process

Co-Authored-By: Claude <noreply@anthropic.com>"

# Create git tag
echo -e "${YELLOW}🏷️  Creating git tag...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes and tags
echo -e "${YELLOW}⬆️  Pushing changes and tags...${NC}"
git push origin $CURRENT_BRANCH
git push origin "v$NEW_VERSION"

# Publish to npm
echo -e "${YELLOW}📢 Publishing to npm...${NC}"
npm publish

echo -e "${GREEN}🎉 Release $NEW_VERSION completed successfully!${NC}"
echo -e "${GREEN}📋 Next steps:${NC}"
echo -e "   • Create GitHub release notes at: https://github.com/silverbucket/webfinger.js/releases/new?tag=v$NEW_VERSION"
echo -e "   • Update any dependent projects"
echo -e "   • Announce the release"