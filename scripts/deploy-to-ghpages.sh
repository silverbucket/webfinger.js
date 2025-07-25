#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check parameters
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}❌ Usage: $0 <version> <release-branch>${NC}"
    echo "Example: $0 2.8.0 release/v2.8.0"
    exit 1
fi

VERSION=$1
RELEASE_BRANCH=$2

echo -e "${GREEN}🌐 Deploying demo v$VERSION to GitHub Pages...${NC}"

# Remember current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}📍 Current branch: $CURRENT_BRANCH${NC}"

# Function to return to original branch on exit
cleanup() {
    echo -e "${YELLOW}🔄 Returning to branch: $CURRENT_BRANCH${NC}"
    git checkout "$CURRENT_BRANCH" 2>/dev/null || true
}
trap cleanup EXIT

# Deploy to GitHub Pages
echo -e "${YELLOW}📥 Fetching gh-pages branch...${NC}"
git fetch origin gh-pages

echo -e "${YELLOW}🌿 Switching to gh-pages branch...${NC}"
git checkout gh-pages

echo -e "${YELLOW}📦 Copying pre-built files from $RELEASE_BRANCH...${NC}"
# Copy pre-built files from release branch
git checkout "$RELEASE_BRANCH" -- dist/webfinger.js demo/
cp dist/webfinger.js webfinger.js
cp -r demo/* .

echo -e "${YELLOW}📝 Committing changes...${NC}"
# Commit and push changes
git add .
git commit -m "Update demo to v$VERSION

🚀 Generated with prepare release process" || {
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
}

echo -e "${YELLOW}⬆️  Pushing to gh-pages...${NC}"
git push origin gh-pages

echo -e "${GREEN}✅ Demo deployed successfully to GitHub Pages${NC}"