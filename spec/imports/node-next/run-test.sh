#!/bin/bash

echo "=== Testing Node.js ES Module Import Issue (GitHub #106) ==="
echo ""

echo "📁 Working directory: $(pwd)"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. This test requires Node.js to reproduce the import issue."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. This test requires npm to install dependencies."
    exit 1
fi

echo "📦 Installing dependencies with npm..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

echo "🔨 Building TypeScript with moduleResolution: NodeNext..."
npm run build
BUILD_RESULT=$?
echo ""

if [ $BUILD_RESULT -eq 0 ]; then
    echo "✅ TypeScript compilation succeeded"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo "🚀 Running compiled JavaScript with Node.js..."
node dist/index.js
NODE_RESULT=$?
echo ""

if [ $NODE_RESULT -eq 0 ]; then
    echo "✅ Node.js execution succeeded - Import issue is FIXED!"
    echo ""
    echo "This confirms that the ES module import issue from GitHub #106 has been resolved:"
    echo "- TypeScript compiles successfully with moduleResolution: NodeNext" 
    echo "- Node.js runtime succeeds with proper ES module exports"
    exit 0
else
    echo "🔍 Node.js execution failed - Import issue reproduced!"
    echo ""
    echo "This demonstrates the bug from GitHub issue #106:"
    echo "- TypeScript compiles successfully with moduleResolution: NodeNext" 
    echo "- Node.js runtime fails due to ES module import incompatibility"
    exit 1
fi