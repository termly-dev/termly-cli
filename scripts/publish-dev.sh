#!/bin/bash

# Publish @termly-dev/cli-dev package
# This script temporarily swaps package.json to publish the dev version

set -e

echo "Publishing @termly-dev/cli-dev..."

# Backup package.json
cp package.json package.json.backup

# Use dev package.json
cp package.dev.json package.json

# Publish
npm publish --access public

# Restore original package.json
mv package.json.backup package.json

echo "✓ Published successfully!"
