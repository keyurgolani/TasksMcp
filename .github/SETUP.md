# GitHub Actions Setup Guide

This document outlines the required setup for the CI/CD pipelines in this repository.

## Required Secrets

To enable full CI/CD functionality, the following secrets must be configured in your GitHub repository settings:

### 1. NPM_TOKEN (Required for publishing)

**Purpose**: Allows GitHub Actions to publish packages to npm registry

**Setup Steps**:

1. Go to [npmjs.com](https://www.npmjs.com) and log in to your account
2. Click on your profile → "Access Tokens"
3. Click "Generate New Token" → "Automation" (for CI/CD)
4. Copy the generated token
5. In your GitHub repository, go to Settings → Secrets and variables → Actions
6. Click "New repository secret"
7. Name: `NPM_TOKEN`
8. Value: Paste your npm token
9. Click "Add secret"

**Verification**:

```bash
# Test the token locally (optional)
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" > ~/.npmrc
npm whoami
```

### 2. GITHUB_TOKEN (Automatically provided)

**Purpose**: Allows workflows to create releases, PRs, and interact with GitHub API

**Setup**: This is automatically provided by GitHub Actions - no manual setup required.

**Permissions**: Ensure your repository has the following permissions enabled:

- Actions: Read and write
- Contents: Read and write
- Issues: Read and write
- Pull requests: Read and write
- Metadata: Read

## Workflow Overview

### 1. Continuous Integration (`ci.yml`)

**Triggers**: Push to main/develop, Pull requests
**Purpose**: Build validation, security audit, performance checks
**Requirements**: None (uses GITHUB_TOKEN only)

### 2. Pull Request Validation (`pr-validation.yml`)

**Triggers**: Pull request events
**Purpose**: Validate PRs, auto-assign reviewers, check for breaking changes
**Requirements**: None (uses GITHUB_TOKEN only)

### 3. Auto Release (`auto-release.yml`)

**Triggers**: Push to main with source changes, Manual dispatch
**Purpose**: Automatic version bumping and release triggering
**Requirements**: GITHUB_TOKEN (automatic)

### 4. Release and Publish (`publish.yml`)

**Triggers**: Git tags (v\*), Manual dispatch
**Purpose**: Create GitHub releases and publish to npm
**Requirements**: NPM_TOKEN, GITHUB_TOKEN

### 5. Maintenance (`maintenance.yml`)

**Triggers**: Weekly schedule, Manual dispatch
**Purpose**: Dependency updates, security audits, cleanup
**Requirements**: GITHUB_TOKEN (automatic)

## Repository Settings

### Branch Protection Rules

Recommended settings for the `main` branch:

1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 minimum)
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators

### Required Status Checks

Add these status checks to branch protection:

- `build-and-validate`
- `security-audit`
- `performance-check`
- `documentation-check`

## Manual Release Process

### Option 1: Automatic (Recommended)

Push changes to main branch - the system will automatically:

1. Detect source code changes
2. Run CI validation
3. Bump patch version
4. Create git tag
5. Trigger release workflow
6. Publish to npm

### Option 2: Manual Version Control

1. Update version in `package.json`
2. Commit and push to main
3. System detects version change and creates release

### Option 3: Manual Workflow Dispatch

1. Go to Actions → "Auto Release"
2. Click "Run workflow"
3. Select release type (patch/minor/major)
4. Click "Run workflow"

## Troubleshooting

### NPM Publish Fails

```
Error: 403 Forbidden - PUT https://registry.npmjs.org/task-list-mcp
```

**Solution**: Check NPM_TOKEN is valid and has publish permissions

### GitHub Release Creation Fails

```
Error: Resource not accessible by integration
```

**Solution**: Check repository permissions for Actions

### Build Fails on Different Node Versions

**Solution**: Ensure code is compatible with Node.js 18+ (specified in engines)

### Security Audit Fails

**Solution**: Review and fix security vulnerabilities, or use `npm audit fix`

## Monitoring

### Workflow Status

- Check Actions tab for workflow runs
- Failed workflows will show red X
- Click on failed runs to see detailed logs

### Release Status

- Releases appear in the "Releases" section
- npm packages appear at: https://www.npmjs.com/package/task-list-mcp
- Check package installation: `npx task-list-mcp@latest --version`

### Maintenance

- Weekly maintenance runs automatically
- Check for security issues in Issues tab
- Dependency update PRs created automatically

## Best Practices

1. **Always test locally** before pushing to main
2. **Use feature branches** for development
3. **Write descriptive commit messages** for better changelogs
4. **Review auto-generated PRs** (dependency updates) before merging
5. **Monitor security alerts** and address promptly
6. **Keep documentation updated** when making changes

## Support

If you encounter issues with the CI/CD pipeline:

1. Check the workflow logs in the Actions tab
2. Verify all required secrets are configured
3. Ensure repository permissions are correct
4. Review this setup guide for missing steps
5. Create an issue in the repository for additional help
