# Scripts Directory

This directory contains essential project automation scripts organized into a unified framework. Scripts are categorized by their purpose and can be executed through workflows, the unified script runner, or directly via npm scripts.

## 🚀 Quick Start

### Using Workflows (Recommended)

```bash
# Show all available workflows
npm run workflow help

# Run a workflow
npm run workflow <workflow-name>

# Examples
npm run workflow quick-check   # Quick development check
npm run workflow pre-commit    # Before committing changes
npm run workflow pre-release   # Before releasing
```

### Using the Unified Script Runner

```bash
# Show all available scripts
npm run script help

# Run a specific script
npm run script <category> <action> [options]

# Examples
npm run script build prod
npm run script test all
npm run script clean deep
npm run script validate project
```

### Using Direct NPM Scripts

```bash
npm run build
npm run test:run
npm run clean
npm run validate
```

## 📁 Directory Structure

```
scripts/
├── run.js                    # Unified script runner
├── workflows.js              # Development workflow runner
├── setup.sh                  # Script setup and permissions
├── README.md                 # This file
├── clean.sh                  # Project cleanup script
├── validate.sh               # Project structure validation
├── deploy.sh                 # Deployment automation
├── sync-version.js           # Sync versions across files
└── update-version.sh         # Update project version
```

## 🔄 Development Workflows

### Available Workflows
- **quick-check**: Quick development check (lint + unit tests)
- **full-test**: Complete testing suite (all tests + validation)
- **pre-commit**: Pre-commit validation (lint + tests + validation)
- **pre-release**: Pre-release validation (clean + build + test + validation)
- **fresh-start**: Fresh development setup (deep clean + build + test)
- **maintenance**: Project maintenance (clean + validate + lint)

## 📋 Script Categories

### 🔨 Build Scripts
- **dev**: Build for development with source maps
- **prod**: Build for production with minification
- **clean**: Clean build artifacts

### 🧪 Test Scripts
- **all**: Run all tests (unit, integration, performance)
- **unit**: Run unit tests only
- **integration**: Run integration tests only
- **performance**: Run performance tests only
- **watch**: Run tests in watch mode

### ✅ Validation Scripts
- **project**: Validate project structure and configuration
- **lint**: Run TypeScript linting

### 🧹 Clean Scripts
- **basic**: Remove logs, temp files, OS artifacts
- **deep**: Deep cleanup including node_modules
- **build**: Clean build artifacts only

### 📦 Version Scripts
- **sync**: Synchronize version across all project files
- **update**: Update version and sync all files

### 🚀 Deploy Scripts
- **prepare**: Prepare project for deployment
- **staging**: Deploy to staging environment
- **production**: Deploy to production environment

### 🛠️ Development Scripts
- **start**: Start development server
- **health**: Check application health

## 🎯 Usage Examples

### Development Workflow
```bash
# Start development
npm run script dev start

# Run tests while developing
npm run script test watch

# Validate changes
npm run script validate project
npm run script validate lint
```

### Build and Test Workflow
```bash
# Clean previous build
npm run script clean build

# Build for production
npm run script build prod

# Run all tests
npm run script test all

# Final validation
npm run script validate final
```

### Release Workflow
```bash
# Update version
npm run script version update

# Final validation
npm run script validate final

# Deploy to staging
npm run script deploy staging

# Deploy to production (after testing)
npm run script deploy production
```

### Maintenance Workflow
```bash
# Deep cleanup
npm run script clean deep

# Update development tools
npm run script dev update-handlers
npm run script dev update-tests

# Validate everything
npm run script validate project
```

## 🔧 Adding New Scripts

### 1. Create the Script File
Place your script in the appropriate category directory:
```bash
# For a new test script
touch scripts/test/my-new-test.sh
chmod +x scripts/test/my-new-test.sh
```

### 2. Update the Script Runner
Add your script to the appropriate category in `scripts/run.js`:
```javascript
test: {
  description: 'Testing and validation scripts',
  actions: {
    // ... existing actions
    'my-new-test': {
      description: 'Description of my new test',
      script: 'test/my-new-test.sh'
    }
  }
}
```

### 3. Add NPM Script (Optional)
For frequently used scripts, add a direct npm script in `package.json`:
```json
{
  "scripts": {
    "my-test": "./scripts/test/my-new-test.sh"
  }
}
```

## 🎨 Script Conventions

### File Naming
- Use kebab-case for script files: `validate-project.sh`
- Use descriptive names that indicate purpose
- Include file extension (`.sh` for shell, `.js` for Node.js)

### Script Structure
All scripts should follow this structure:
```bash
#!/bin/bash
# Script Description
# Brief explanation of what the script does

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Main script logic here
echo "🚀 Starting script..."
```

### Error Handling
- Always use `set -e` to exit on errors
- Provide meaningful error messages
- Use colored output for better UX
- Return appropriate exit codes

### Documentation
- Include header comment explaining purpose
- Document any parameters or environment variables
- Provide usage examples in comments

## 🔍 Troubleshooting

### Permission Issues
```bash
# Make scripts executable
chmod +x scripts/**/*.sh
```

### Path Issues
- All script paths are relative to project root
- Use `__dirname` in Node.js scripts for reliable paths
- Test scripts from project root directory

### Environment Issues
- Ensure Node.js version compatibility (>=18.0.0)
- Check that all dependencies are installed
- Verify environment variables are set correctly

## 📚 Related Documentation

- [Getting Started Guide](../docs/guides/getting-started.md)
- [Configuration Guide](../docs/guides/configuration.md)
- [Troubleshooting Guide](../docs/guides/troubleshooting.md)
- [API Documentation](../docs/api/README.md)