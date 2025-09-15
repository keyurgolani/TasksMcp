#!/bin/bash

# Project Cleanup Script
# Removes temporary files, logs, and development artifacts

set -e

echo "🧹 Cleaning up MCP Task Manager project..."

# Remove log files
echo "📝 Removing log files..."
find . -name "*.log" -not -path "./node_modules/*" -not -path "./.git/*" -delete 2>/dev/null || true

# Remove temporary files
echo "🗑️ Removing temporary files..."
find . -name "*.tmp" -o -name "*.temp" -not -path "./node_modules/*" -not -path "./.git/*" -delete 2>/dev/null || true

# Remove OS generated files
echo "🖥️ Removing OS generated files..."
find . -name ".DS_Store" -not -path "./node_modules/*" -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "Thumbs.db" -not -path "./node_modules/*" -not -path "./.git/*" -delete 2>/dev/null || true

# Clean data directory (keep structure, remove content)
echo "📁 Cleaning data directory..."
if [[ -d "data/lists" ]]; then
    rm -f data/lists/*.json 2>/dev/null || true
fi
if [[ -d "data/indexes" ]]; then
    rm -f data/indexes/*.json 2>/dev/null || true
fi
if [[ -d "data/backups" ]]; then
    rm -f data/backups/* 2>/dev/null || true
fi

# Remove development artifacts
echo "🔧 Removing development artifacts..."
rm -rf .kiro 2>/dev/null || true
rm -rf config 2>/dev/null || true

# Clean npm cache
echo "📦 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Remove node_modules if requested
if [[ "$1" == "--deep" ]]; then
    echo "🗂️ Performing deep clean (removing node_modules)..."
    rm -rf node_modules
    rm -f package-lock.json
    echo "💡 Run 'npm install' to reinstall dependencies"
fi

# Remove build artifacts if requested
if [[ "$1" == "--build" || "$1" == "--deep" ]]; then
    echo "🏗️ Removing build artifacts..."
    rm -rf dist
    echo "💡 Run 'npm run build' to rebuild the project"
fi

echo ""
echo "✨ Cleanup completed successfully!"
echo "🎯 Project is now clean and ready for development"

if [[ "$1" == "--deep" ]]; then
    echo "📋 Next steps:"
    echo "  1. Run 'npm install' to reinstall dependencies"
    echo "  2. Run 'npm run build' to rebuild the project"
    echo "  3. Run './scripts/validate-project.sh' to validate structure"
fi