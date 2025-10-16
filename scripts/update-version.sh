#!/bin/bash

# Update Version Script
# This script updates the version across all files in the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if version argument is provided
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <new_version>"
    print_error "Example: $0 2.1.0"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (basic semver check)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "Invalid version format. Please use semantic versioning (e.g., 2.1.0)"
    exit 1
fi

print_status "Updating version to $NEW_VERSION"

# Update version.json
print_status "Updating version.json..."
if [ -f "version.json" ]; then
    # Use jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
        jq ".version = \"$NEW_VERSION\"" version.json > version.json.tmp && mv version.json.tmp version.json
    else
        sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" version.json
        rm -f version.json.bak
    fi
    print_status "✓ version.json updated"
else
    print_error "version.json not found!"
    exit 1
fi

# Update package.json
print_status "Updating package.json..."
if [ -f "package.json" ]; then
    if command -v jq &> /dev/null; then
        jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp && mv package.json.tmp package.json
    else
        sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json
        rm -f package.json.bak
    fi
    print_status "✓ package.json updated"
else
    print_warning "package.json not found, skipping..."
fi

# Update documentation files
print_status "Updating documentation files..."

# Function to update version in markdown files
update_markdown_version() {
    local file="$1"
    if [ -f "$file" ]; then
        sed -i.bak "s/\*\*Version\*\*: [0-9]\+\.[0-9]\+\.[0-9]\+/\*\*Version\*\*: $NEW_VERSION/" "$file"
        sed -i.bak "s/- \*\*Current Version\*\*: [0-9]\+\.[0-9]\+\.[0-9]\+/- \*\*Current Version\*\*: $NEW_VERSION/" "$file"
        sed -i.bak "s/- \*\*API Version\*\*: [0-9]\+\.[0-9]\+\.[0-9]\+/- \*\*API Version\*\*: $NEW_VERSION/" "$file"
        sed -i.bak "s/\*\*Current Version ([0-9]\+\.[0-9]\+\.[0-9]\+)\*\*/\*\*Current Version ($NEW_VERSION)\*\*/" "$file"
        rm -f "$file.bak"
        print_status "✓ Updated $file"
    fi
}

# Update main documentation files
update_markdown_version "readme.md"
update_markdown_version "agents.md"

# Update docs directory
find docs -name "*.md" -type f | while read -r file; do
    update_markdown_version "$file"
done

# Update examples directory
find examples -name "*.md" -type f | while read -r file; do
    update_markdown_version "$file"
done

# Update package-lock.json if it exists
if [ -f "package-lock.json" ]; then
    print_status "Updating package-lock.json..."
    if command -v jq &> /dev/null; then
        jq ".version = \"$NEW_VERSION\" | .packages.\"\".version = \"$NEW_VERSION\"" package-lock.json > package-lock.json.tmp && mv package-lock.json.tmp package-lock.json
    else
        sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package-lock.json
        rm -f package-lock.json.bak
    fi
    print_status "✓ package-lock.json updated"
fi

print_status "Version update completed successfully!"
print_status "All files have been updated to version $NEW_VERSION"

# Offer to commit changes
echo
read -p "Do you want to commit these changes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Committing changes..."
    git add .
    git commit -m "chore: bump version to $NEW_VERSION

- Updated version.json to $NEW_VERSION
- Synchronized package.json version
- Updated all documentation files
- Updated package-lock.json

This commit updates the version across all project files using the centralized version management system."
    print_status "✓ Changes committed"
    
    echo
    read -p "Do you want to create a git tag for this version? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
        print_status "✓ Git tag v$NEW_VERSION created"
        
        echo
        read -p "Do you want to push changes and tags to remote? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push origin main
            git push origin "v$NEW_VERSION"
            print_status "✓ Changes and tags pushed to remote"
        fi
    fi
fi

print_status "Version update process completed!"