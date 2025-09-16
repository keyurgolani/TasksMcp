#!/usr/bin/env node

/**
 * Script to update test files to use the new error message format
 * Changes "Validation error" expectations to "❌" format
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function findTestFiles(dir) {
  const files = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function updateTestFiles() {
  console.log('🔄 Updating test files to use new error message format...');
  
  // Find all test files
  const testsDir = join(projectRoot, 'tests');
  const testFiles = findTestFiles(testsDir);
  
  let totalUpdates = 0;
  
  for (const filePath of testFiles) {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply the main pattern replacement
    content = content.replace(/\.toContain\(['"`]Validation error['"`]\)/g, ".toContain('❌')");
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      const fileUpdates = (originalContent.match(/\.toContain\(['"`]Validation error['"`]\)/g) || []).length;
      totalUpdates += fileUpdates;
      const relativePath = filePath.replace(projectRoot + '/', '');
      console.log(`✅ Updated ${relativePath}: ${fileUpdates} replacements`);
    }
  }
  
  console.log(`\n🎉 Completed! Updated ${totalUpdates} test assertions across ${testFiles.length} files.`);
}

// Run the update
updateTestFiles();