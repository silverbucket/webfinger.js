#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_DIR="$(pwd)"

# Check if we're running from the script's directory
if [ "$SCRIPT_DIR" != "$CURRENT_DIR" ]; then
    echo "❌ This script must be run from its own directory: $SCRIPT_DIR"
    echo "   Current directory: $CURRENT_DIR"
    echo "   Please run: cd $SCRIPT_DIR && ./run-test.sh"
    exit 1
fi

echo "=== Testing Node.js CommonJS require() ==="
echo ""

echo "📁 Working directory: $(pwd)"
echo ""

# Build the package first so dist/webfinger.cjs exists for file: resolution
echo "🔨 Building parent package..."
pushd ../../.. > /dev/null
bun run build:release
if [ $? -ne 0 ]; then
    echo "❌ Failed to build parent package"
    exit 1
fi
popd > /dev/null
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "📦 Installing dependencies with npm..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

echo "🚀 Running CJS require test with Node.js..."
node index.cjs
NODE_RESULT=$?
echo ""

if [ $NODE_RESULT -eq 0 ]; then
    echo "✅ Node.js CJS require() test succeeded"
    exit 0
else
    echo "🔍 Node.js CJS require() test failed"
    exit 1
fi
