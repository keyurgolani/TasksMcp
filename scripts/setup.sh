#!/bin/bash

# Script Setup - Make all scripts executable
# This script ensures all scripts in the scripts directory have proper permissions

set -e

echo "🔧 Setting up script permissions..."

# Make all shell scripts executable
find scripts -name "*.sh" -exec chmod +x {} \;

# Make all JavaScript scripts executable
find scripts -name "*.js" -exec chmod +x {} \;

echo "✅ All scripts are now executable"
echo ""
echo "📋 Available script categories:"
echo "  • build    - Build and compilation"
echo "  • test     - Testing and validation"
echo "  • validate - Quality assurance"
echo "  • clean    - Cleanup and maintenance"
echo "  • version  - Version management"
echo "  • deploy   - Deployment and release"
echo "  • dev      - Development utilities"
echo ""
echo "🚀 Run 'npm run script help' to see all available scripts"