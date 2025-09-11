#!/bin/bash

# Setup script for npm publishing
# This script helps configure npm authentication for publishing

set -e

echo "🚀 MCP Task Manager - NPM Setup Script"
echo "======================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "✅ npm is installed: $(npm --version)"
echo ""

# Check if user is logged in to npm
if npm whoami &> /dev/null; then
    NPM_USER=$(npm whoami)
    echo "✅ Already logged in to npm as: $NPM_USER"
else
    echo "📝 You need to log in to npm first."
    echo "   Run: npm login"
    echo "   Or create an account at: https://www.npmjs.com/signup"
    exit 1
fi

echo ""
echo "🔑 Setting up npm token for GitHub Actions..."
echo ""

# Check if .npmrc exists
if [[ -f ~/.npmrc ]]; then
    echo "📄 Found existing ~/.npmrc file"
    if grep -q "//registry.npmjs.org/:_authToken" ~/.npmrc; then
        echo "✅ npm token already configured in ~/.npmrc"
        
        # Extract token for GitHub setup
        TOKEN=$(grep "//registry.npmjs.org/:_authToken" ~/.npmrc | cut -d'=' -f2)
        echo ""
        echo "🔐 Your npm token for GitHub Actions setup:"
        echo "   Token: $TOKEN"
        echo ""
        echo "📋 Next steps:"
        echo "   1. Go to your GitHub repository"
        echo "   2. Navigate to Settings → Secrets and variables → Actions"
        echo "   3. Click 'New repository secret'"
        echo "   4. Name: NPM_TOKEN"
        echo "   5. Value: $TOKEN"
        echo "   6. Click 'Add secret'"
        echo ""
    else
        echo "⚠️  No npm token found in ~/.npmrc"
        echo "   You may need to run 'npm login' again"
    fi
else
    echo "⚠️  No ~/.npmrc file found"
    echo "   Please run 'npm login' first"
fi

echo ""
echo "🧪 Testing npm access..."

# Test npm access
if npm access list packages 2>/dev/null | grep -q "task-list-mcp"; then
    echo "✅ You have access to publish task-list-mcp"
elif npm access list packages 2>/dev/null; then
    echo "⚠️  You can publish packages, but may need to create task-list-mcp first"
else
    echo "❌ Unable to check npm access. Please verify your npm login."
fi

echo ""
echo "📦 Package information:"
echo "   Name: task-list-mcp"
echo "   Current version: $(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")"
echo "   Registry: https://registry.npmjs.org/"
echo ""

echo "✅ Setup complete!"
echo ""
echo "🚀 To publish manually:"
echo "   npm run build"
echo "   npm publish"
echo ""
echo "🤖 For automated publishing:"
echo "   1. Configure NPM_TOKEN secret in GitHub"
echo "   2. Push changes to main branch"
echo "   3. GitHub Actions will handle the rest!"
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || ! grep -q "task-list-mcp" package.json; then
    echo "⚠️  Warning: Run this script from the task-list-mcp project root directory"
fi