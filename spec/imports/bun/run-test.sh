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

echo "=== Testing Bun ES Module Import ==="
echo ""

echo "📁 Working directory: $(pwd)"
echo ""

# Check if Bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed."
    exit 1
fi

echo "🔗 Linking parent webfinger package..."
pushd ../../../
bun link
popd

echo "📦 Installing dependencies..."
bun install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""


echo "🚀 Running TypeScript with Bun..."
bun index.ts
BUN_RESULT=$?
echo ""

if [ $BUN_RESULT -eq 0 ]; then
    echo "✅ Bun execution succeeded"
    exit 0
else
    echo "🔍 Bun execution failed!"
    exit 1
fi
