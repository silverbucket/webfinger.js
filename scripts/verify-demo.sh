#!/bin/bash
set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Verifying demo deployment for version $VERSION..."
echo "Waiting for GitHub Pages to deploy..."
sleep 45

DEMO_URL="https://silverbucket.github.io/webfinger.js/"

# Test demo page is accessible
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEMO_URL" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Demo page is accessible at $DEMO_URL"
else
  echo "❌ Demo page returned HTTP $HTTP_STATUS"
  exit 1
fi

# Download the demo page for testing
curl -s "$DEMO_URL" > /tmp/demo.html

# Test that correct version is displayed
if grep -q "v$VERSION" /tmp/demo.html; then
  echo "✅ Demo page shows correct version: v$VERSION"
else
  echo "❌ Demo page missing version v$VERSION"
  exit 1
fi

# Test that webfinger.js file loads correctly
JS_URL="https://silverbucket.github.io/webfinger.js/webfinger.js"
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$JS_URL" || echo "000")

if [ "$JS_STATUS" = "200" ]; then
  echo "✅ webfinger.js file loads correctly"
else
  echo "❌ webfinger.js file failed to load (HTTP $JS_STATUS)"
  exit 1
fi

# Test that the JS file contains the correct version
curl -s "$JS_URL" > /tmp/webfinger.js
if grep -q "webfinger.js v$VERSION" /tmp/webfinger.js; then
  echo "✅ webfinger.js contains correct version logging"
else
  echo "⚠️ webfinger.js version logging may be missing (this might be OK)"
fi

echo "✅ Demo deployment verification passed!"