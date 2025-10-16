#!/bin/bash

# Project Structure Validation Script
# Validates that the project structure is clean and correct

set -e

echo "🔍 Validating MCP Task Manager project structure..."

# Check required files exist
required_files=(
    "package.json"
    "readme.md" 
    "agents.md"
    "LICENSE"
    "tsconfig.json"
    ".gitignore"
)

echo "📋 Checking required files..."
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Missing required file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

# Check required directories exist
required_dirs=(
    "src"
    "docs"
    "examples"
    ".github"
    "scripts"
)

echo "📁 Checking required directories..."
for dir in "${required_dirs[@]}"; do
    if [[ ! -d "$dir" ]]; then
        echo "❌ Missing required directory: $dir"
        exit 1
    else
        echo "✅ Found: $dir"
    fi
done

# Check that unwanted directories are removed
unwanted_dirs=(
    "config"
)

echo "🧹 Checking unwanted directories are removed..."
for dir in "${unwanted_dirs[@]}"; do
    if [[ -d "$dir" ]]; then
        echo "❌ Unwanted directory still exists: $dir"
        exit 1
    else
        echo "✅ Removed: $dir"
    fi
done

# Check source code structure
echo "🔧 Checking source code structure..."
src_dirs=(
    "src/api"
    "src/app"
    "src/domain"
    "src/infrastructure"
    "src/shared"
)

for dir in "${src_dirs[@]}"; do
    if [[ ! -d "$dir" ]]; then
        echo "❌ Missing source directory: $dir"
        exit 1
    else
        echo "✅ Found: $dir"
    fi
done

# Check that build artifacts exist if built
if [[ -d "dist" ]]; then
    echo "📦 Checking build artifacts..."
    if [[ ! -f "dist/index.js" ]]; then
        echo "❌ Missing main build artifact: dist/index.js"
        exit 1
    fi
    if [[ ! -f "dist/app/cli.js" ]]; then
        echo "❌ Missing CLI build artifact: dist/app/cli.js"
        exit 1
    fi
    echo "✅ Build artifacts present"
fi

# Check package.json structure
echo "📋 Validating package.json..."
if ! node -e "
const pkg = require('./package.json');
if (!pkg.name || !pkg.version || !pkg.main || !pkg.bin) {
    console.error('❌ Missing required package.json fields');
    process.exit(1);
}
if (pkg.name !== 'task-list-mcp') {
    console.error('❌ Incorrect package name:', pkg.name);
    process.exit(1);
}
console.log('✅ Package.json structure valid');
"; then
    exit 1
fi

# Check TypeScript configuration
echo "⚙️ Validating TypeScript configuration..."
if ! npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
    echo "❌ TypeScript compilation errors found"
    exit 1
else
    echo "✅ TypeScript configuration valid"
fi

# Check documentation structure
echo "📚 Checking documentation structure..."
doc_files=(
    "docs/readme.md"
    "docs/api/readme.md"
    "docs/api/tools.md"
    "docs/api/dependency-management.md"
    "docs/api/errors.md"
    "docs/api/responses.md"
    "docs/api/schemas.md"
    "docs/guides/getting-started.md"
    "docs/guides/installation.md"
    "docs/guides/configuration.md"
    "docs/guides/multi-agent.md"
    "docs/guides/troubleshooting.md"
    "docs/reference/faq.md"
    "docs/reference/migration.md"
    "docs/reference/performance.md"
    "docs/examples/basic.md"
    "docs/examples/advanced.md"
)

for file in "${doc_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Missing documentation file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

# Check examples structure
echo "📖 Checking examples structure..."
example_files=(
    "examples/readme.md"
    "docs/examples/readme.md"
    "docs/examples/basic.md"
    "docs/examples/advanced.md"
    "docs/examples/configuration.md"
)

for file in "${example_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Missing example file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

# Check GitHub workflows
echo "🔄 Checking GitHub workflows..."
workflow_files=(
    ".github/workflows/ci.yml"
    ".github/workflows/publish.yml"
)

for file in "${workflow_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Missing workflow file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

# Check for common issues
echo "🔍 Checking for common issues..."

# Check for log files that shouldn't be committed
if find . -name "*.log" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
    echo "⚠️ Warning: Log files found in repository"
    find . -name "*.log" -not -path "./node_modules/*" -not -path "./.git/*"
fi

# Check for temporary files
if find . -name "*.tmp" -o -name "*.temp" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
    echo "⚠️ Warning: Temporary files found in repository"
    find . -name "*.tmp" -o -name "*.temp" -not -path "./node_modules/*" -not -path "./.git/*"
fi

# Check for .DS_Store files
if find . -name ".DS_Store" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
    echo "⚠️ Warning: .DS_Store files found in repository"
    find . -name ".DS_Store" -not -path "./node_modules/*" -not -path "./.git/*"
fi

echo ""
echo "🎉 Project structure validation completed successfully!"
echo "✅ All required files and directories are present"
echo "✅ Unwanted files and directories have been removed"
echo "✅ Project is ready for development and deployment"