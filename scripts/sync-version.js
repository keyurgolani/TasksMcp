#!/usr/bin/env node

/**
 * Version Synchronization Script
 * This script ensures version.json and package.json are in sync
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

try {
  // Check if we should use package.json as source (for npm version command)
  const usePackageAsSource = process.argv.includes('--from-package');

  // Read version.json
  const versionPath = join(process.cwd(), 'version.json');
  const versionContent = readFileSync(versionPath, 'utf-8');
  const versionInfo = JSON.parse(versionContent);

  // Read package.json
  const packagePath = join(process.cwd(), 'package.json');
  const packageContent = readFileSync(packagePath, 'utf-8');
  const packageInfo = JSON.parse(packageContent);

  // Check if versions match
  if (versionInfo.version === packageInfo.version) {
    logSuccess(`Versions are in sync: ${versionInfo.version}`);
    process.exit(0);
  }

  // Determine which version to use
  const targetVersion = usePackageAsSource ? packageInfo.version : versionInfo.version;
  const sourceFile = usePackageAsSource ? 'package.json' : 'version.json';
  
  logWarning(`Version mismatch detected:`);
  log(`  version.json: ${versionInfo.version}`);
  log(`  package.json: ${packageInfo.version}`);
  log(`  Using ${sourceFile} as source of truth: ${targetVersion}`);

  // Update version.json if package.json is source
  if (usePackageAsSource && versionInfo.version !== targetVersion) {
    versionInfo.version = targetVersion;
    writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2) + '\n');
    logSuccess(`Updated version.json to version ${targetVersion}`);
  }

  // Update package.json if version.json is source
  if (!usePackageAsSource && packageInfo.version !== targetVersion) {
    packageInfo.version = targetVersion;
    writeFileSync(packagePath, JSON.stringify(packageInfo, null, 2) + '\n');
    logSuccess(`Updated package.json to version ${targetVersion}`);
  }

  // Update package-lock.json if it exists
  try {
    const packageLockPath = join(process.cwd(), 'package-lock.json');
    const packageLockContent = readFileSync(packageLockPath, 'utf-8');
    const packageLockInfo = JSON.parse(packageLockContent);
    
    if (packageLockInfo.version !== targetVersion) {
      packageLockInfo.version = targetVersion;
      if (packageLockInfo.packages && packageLockInfo.packages[""]) {
        packageLockInfo.packages[""].version = targetVersion;
      }
      
      writeFileSync(packageLockPath, JSON.stringify(packageLockInfo, null, 2) + '\n');
      logSuccess(`Updated package-lock.json to version ${targetVersion}`);
    }
  } catch (error) {
    logWarning('package-lock.json not found or could not be updated');
  }

  logSuccess('Version synchronization completed!');

} catch (error) {
  logError(`Failed to synchronize versions: ${error.message}`);
  process.exit(1);
}