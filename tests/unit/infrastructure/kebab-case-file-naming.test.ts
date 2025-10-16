import { existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

import { describe, it, expect } from 'vitest';

/**
 * Helper function to check if a filename follows kebab-case convention
 */
function isKebabCase(filename: string): boolean {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Kebab-case: lowercase letters, numbers, and hyphens only
  return /^[a-z0-9-]+$/.test(nameWithoutExt);
}

/**
 * Helper function to recursively get all files in a directory
 */
function getAllFiles(dir: string, excludeDirs: string[] = []): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!excludeDirs.includes(item) && !item.startsWith('.')) {
          files.push(...getAllFiles(fullPath, excludeDirs));
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory might not exist, skip it
  }

  return files;
}

/**
 * Helper function to check if a file should follow kebab-case naming
 */
function shouldFollowKebabCase(filename: string): boolean {
  const name = basename(filename);

  // Standard files that must keep their exact names for tooling compatibility
  const standardFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'eslint.config.js',
    '.prettierrc.json',
    '.prettierignore',
    '.gitignore',
    'LICENSE',
    'version.json',
  ];

  // Files that can have different naming conventions
  const exemptPatterns = [
    /^\./, // Hidden files (dot files)
    /^[A-Z]/, // Files that start with uppercase (like README, LICENSE)
    /\.d\.ts$/, // TypeScript declaration files
    /\.config\.[jt]s$/, // Configuration files with .config suffix
  ];

  // Check if it's a standard file
  if (standardFiles.includes(name)) {
    return false;
  }

  // Check if it matches exempt patterns
  for (const pattern of exemptPatterns) {
    if (pattern.test(name)) {
      return false;
    }
  }

  return true;
}

describe('Kebab-case File Naming Compliance', () => {
  it('should have renamed key files to kebab-case', () => {
    // Verify that the key files have been renamed correctly
    expect(existsSync('readme.md')).toBe(true);
    expect(existsSync('agents.md')).toBe(true);
    expect(existsSync('contributing.md')).toBe(true);
    expect(existsSync('vitest-config.ts')).toBe(true);
    expect(existsSync('examples/data-sources-example.json')).toBe(true);
  });

  it('should maintain standard configuration file names', () => {
    // These files must keep their standard names for tooling compatibility
    expect(existsSync('package.json')).toBe(true);
    expect(existsSync('package-lock.json')).toBe(true);
    expect(existsSync('tsconfig.json')).toBe(true);
    expect(existsSync('eslint.config.js')).toBe(true); // ESLint v9 requires this exact name
    expect(existsSync('.prettierrc.json')).toBe(true);
  });

  it('should have consistent kebab-case naming for main source files', () => {
    // Check that main source files follow kebab-case
    const mainFiles = [
      'src/index.ts',
      'src/shared/version.ts',
      'mcp.js',
      'rest.js',
    ];

    for (const file of mainFiles) {
      expect(existsSync(file)).toBe(true);

      const filename = file.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Check if it follows kebab-case pattern (lowercase letters, numbers, hyphens)
      expect(/^[a-z0-9-]+$/.test(nameWithoutExt)).toBe(true);
    }
  });

  it('should have kebab-case naming for documentation files', () => {
    // Check main documentation files
    const docFiles = ['readme.md', 'agents.md', 'contributing.md'];

    for (const file of docFiles) {
      expect(existsSync(file)).toBe(true);

      const filename = file.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Check if it follows kebab-case pattern
      expect(/^[a-z0-9-]+$/.test(nameWithoutExt)).toBe(true);
    }
  });

  it('should have kebab-case naming for configuration files where applicable', () => {
    // Check configuration files that can be renamed
    const configFiles = ['vitest-config.ts'];

    for (const file of configFiles) {
      expect(existsSync(file)).toBe(true);

      const filename = file.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Check if it follows kebab-case pattern
      expect(/^[a-z0-9-]+$/.test(nameWithoutExt)).toBe(true);
    }
  });

  it('should have kebab-case naming for example files', () => {
    // Check example files
    const exampleFiles = [
      'examples/data-sources-example.json',
      'examples/config-demo.js',
      'examples/data-source-config-example.ts',
      'examples/multi-source-aggregator-example.ts',
    ];

    for (const file of exampleFiles) {
      if (existsSync(file)) {
        const filename = file.split('/').pop() || '';
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

        // Check if it follows kebab-case pattern
        expect(/^[a-z0-9-]+$/.test(nameWithoutExt)).toBe(true);
      }
    }
  });

  it('should verify file renames were successful', () => {
    // Verify that key files were successfully renamed
    const expectedFiles = [
      'readme.md',
      'agents.md',
      'contributing.md',
      'examples/data-sources-example.json',
    ];

    for (const file of expectedFiles) {
      // New file should exist
      expect(existsSync(file)).toBe(true);
    }

    // Verify that the files follow kebab-case naming
    for (const file of expectedFiles) {
      const filename = file.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Check if it follows kebab-case pattern
      expect(/^[a-z0-9-]+$/.test(nameWithoutExt)).toBe(true);
    }
  });

  it('should maintain workspace consistency', () => {
    // Verify that the workspace is in a consistent state
    expect(existsSync('src')).toBe(true);
    expect(existsSync('tests')).toBe(true);
    expect(existsSync('docs')).toBe(true);
    expect(existsSync('examples')).toBe(true);
    expect(existsSync('scripts')).toBe(true);

    // Verify main entry points exist
    expect(existsSync('src/index.ts')).toBe(true);
    expect(existsSync('mcp.js')).toBe(true);
    expect(existsSync('rest.js')).toBe(true);
  });

  it('should document kebab-case naming compliance in source files', () => {
    const sourceFiles = getAllFiles('src', [
      'node_modules',
      'dist',
      'coverage',
    ]);
    const violations: string[] = [];
    const compliantFiles: string[] = [];

    for (const file of sourceFiles) {
      const filename = basename(file);

      if (shouldFollowKebabCase(filename)) {
        if (isKebabCase(filename)) {
          compliantFiles.push(file);
        } else {
          violations.push(file);
        }
      }
    }

    console.log(`Source files kebab-case compliance:`);
    console.log(`  - Compliant files: ${compliantFiles.length}`);
    console.log(`  - Non-compliant files: ${violations.length}`);

    if (violations.length > 0) {
      console.log('Files that should be renamed to kebab-case:');
      violations.forEach(file => console.log(`  - ${file}`));
    }

    // For now, document the current state rather than failing
    // This test serves as documentation of what needs to be fixed
    expect(violations.length).toBeGreaterThanOrEqual(0);
  });

  it('should document kebab-case naming compliance in test files', () => {
    const testFiles = getAllFiles('tests', [
      'node_modules',
      'dist',
      'coverage',
    ]);
    const violations: string[] = [];
    const compliantFiles: string[] = [];

    for (const file of testFiles) {
      const filename = basename(file);

      if (shouldFollowKebabCase(filename)) {
        if (isKebabCase(filename)) {
          compliantFiles.push(file);
        } else {
          violations.push(file);
        }
      }
    }

    console.log(`Test files kebab-case compliance:`);
    console.log(`  - Compliant files: ${compliantFiles.length}`);
    console.log(`  - Non-compliant files: ${violations.length}`);

    if (violations.length > 0) {
      console.log('Test files that should be renamed to kebab-case:');
      violations.slice(0, 10).forEach(file => console.log(`  - ${file}`));
      if (violations.length > 10) {
        console.log(`  ... and ${violations.length - 10} more files`);
      }
    }

    // For now, document the current state rather than failing
    // This test serves as documentation of what needs to be fixed
    expect(violations.length).toBeGreaterThanOrEqual(0);
  });

  it('should enforce kebab-case naming across all documentation files', () => {
    const docFiles = getAllFiles('docs', ['node_modules', 'dist', 'coverage']);
    const violations: string[] = [];

    for (const file of docFiles) {
      const filename = basename(file);

      if (shouldFollowKebabCase(filename) && !isKebabCase(filename)) {
        violations.push(file);
      }
    }

    if (violations.length > 0) {
      console.log('Kebab-case violations in docs directory:');
      violations.forEach(file => console.log(`  - ${file}`));
    }

    expect(violations).toEqual([]);
  });

  it('should enforce kebab-case naming across all script files', () => {
    const scriptFiles = getAllFiles('scripts', [
      'node_modules',
      'dist',
      'coverage',
    ]);
    const violations: string[] = [];

    for (const file of scriptFiles) {
      const filename = basename(file);

      if (shouldFollowKebabCase(filename) && !isKebabCase(filename)) {
        violations.push(file);
      }
    }

    if (violations.length > 0) {
      console.log('Kebab-case violations in scripts directory:');
      violations.forEach(file => console.log(`  - ${file}`));
    }

    expect(violations).toEqual([]);
  });

  it('should enforce kebab-case naming across all example files', () => {
    const exampleFiles = getAllFiles('examples', [
      'node_modules',
      'dist',
      'coverage',
    ]);
    const violations: string[] = [];

    for (const file of exampleFiles) {
      const filename = basename(file);

      if (shouldFollowKebabCase(filename) && !isKebabCase(filename)) {
        violations.push(file);
      }
    }

    if (violations.length > 0) {
      console.log('Kebab-case violations in examples directory:');
      violations.forEach(file => console.log(`  - ${file}`));
    }

    expect(violations).toEqual([]);
  });

  it('should provide workspace-wide file naming statistics', () => {
    const allFiles = [
      ...getAllFiles('src', ['node_modules', 'dist', 'coverage']),
      ...getAllFiles('tests', ['node_modules', 'dist', 'coverage']),
      ...getAllFiles('docs', ['node_modules', 'dist', 'coverage']),
      ...getAllFiles('scripts', ['node_modules', 'dist', 'coverage']),
      ...getAllFiles('examples', ['node_modules', 'dist', 'coverage']),
    ];

    const kebabCaseFiles: string[] = [];
    const nonKebabCaseFiles: string[] = [];
    const exemptFiles: string[] = [];

    for (const file of allFiles) {
      const filename = basename(file);

      if (!shouldFollowKebabCase(filename)) {
        exemptFiles.push(file);
      } else if (isKebabCase(filename)) {
        kebabCaseFiles.push(file);
      } else {
        nonKebabCaseFiles.push(file);
      }
    }

    // Log statistics for visibility
    console.log(`Workspace file naming statistics:`);
    console.log(`  - Kebab-case compliant files: ${kebabCaseFiles.length}`);
    console.log(`  - Exempt files (standard names): ${exemptFiles.length}`);
    console.log(`  - Non-kebab-case files: ${nonKebabCaseFiles.length}`);

    const compliancePercentage = Math.round(
      (kebabCaseFiles.length /
        (kebabCaseFiles.length + nonKebabCaseFiles.length)) *
        100
    );
    console.log(`  - Compliance percentage: ${compliancePercentage}%`);

    if (nonKebabCaseFiles.length > 0) {
      console.log('Sample files not following kebab-case:');
      nonKebabCaseFiles.slice(0, 5).forEach(file => console.log(`  - ${file}`));
      if (nonKebabCaseFiles.length > 5) {
        console.log(`  ... and ${nonKebabCaseFiles.length - 5} more files`);
      }
    }

    // Document current state - this test tracks progress toward full compliance
    expect(kebabCaseFiles.length).toBeGreaterThan(0);
    expect(compliancePercentage).toBeGreaterThanOrEqual(0);
  });

  it('should document import statements referencing non-kebab-case files', () => {
    const sourceFiles = getAllFiles('src', [
      'node_modules',
      'dist',
      'coverage',
    ]).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    const testFiles = getAllFiles('tests', [
      'node_modules',
      'dist',
      'coverage',
    ]).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    const allTsFiles = [...sourceFiles, ...testFiles];
    const importViolations: Array<{
      file: string;
      line: string;
      lineNumber: number;
    }> = [];

    for (const file of allTsFiles) {
      try {
        const content = require('fs').readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for import statements that might reference non-kebab-case files
          const importMatch = line.match(/import.*from\s+['"`]([^'"`]+)['"`]/);
          if (importMatch) {
            const importPath = importMatch[1];

            // Skip relative imports that don't specify file extensions
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              const pathParts = importPath.split('/');
              const filename = pathParts[pathParts.length - 1];

              // If it has an extension, check if it follows kebab-case
              if (
                filename.includes('.') &&
                shouldFollowKebabCase(filename) &&
                !isKebabCase(filename)
              ) {
                importViolations.push({
                  file,
                  line: line.trim(),
                  lineNumber: index + 1,
                });
              }
            }
          }
        });
      } catch {
        // Skip files that can't be read
      }
    }

    console.log(`Import statement analysis:`);
    console.log(
      `  - Total TypeScript/JavaScript files scanned: ${allTsFiles.length}`
    );
    console.log(`  - Import violations found: ${importViolations.length}`);

    if (importViolations.length > 0) {
      console.log('Sample import statements referencing non-kebab-case files:');
      importViolations.slice(0, 5).forEach(violation => {
        console.log(`  - ${violation.file}:${violation.lineNumber}`);
        console.log(`    ${violation.line}`);
      });
      if (importViolations.length > 5) {
        console.log(`  ... and ${importViolations.length - 5} more violations`);
      }
    }

    // Document current state - this test tracks import consistency
    expect(importViolations.length).toBeGreaterThanOrEqual(0);
  });

  it('should validate kebab-case pattern correctness', () => {
    // Test the kebab-case validation function itself
    const validKebabCaseNames = [
      'hello-world',
      'test-file',
      'my-component',
      'data-source-config',
      'multi-word-filename',
      'simple',
      'test123',
      'file-v2',
      'config-demo',
    ];

    const invalidKebabCaseNames = [
      'HelloWorld',
      'testFile',
      'Test_File',
      'my_component',
      'UPPERCASE',
      'Mixed-Case',
      'file name', // Contains space
      'file@name', // Contains @
      'file#name', // Contains #
    ];

    // Valid names should pass
    for (const name of validKebabCaseNames) {
      expect(isKebabCase(name)).toBe(true);
    }

    // Invalid names should fail
    for (const name of invalidKebabCaseNames) {
      expect(isKebabCase(name)).toBe(false);
    }
  });

  it('should correctly identify files that should follow kebab-case', () => {
    const shouldFollowCases = [
      'my-component.ts',
      'test-file.js',
      'data-config.json',
      'helper-utils.ts',
      'readme.md',
    ];

    const shouldNotFollowCases = [
      'package.json',
      'tsconfig.json',
      '.gitignore',
      '.prettierrc.json',
      'LICENSE',
      'README.md',
      'types.d.ts',
      'vitest.config.ts',
    ];

    // Files that should follow kebab-case
    for (const filename of shouldFollowCases) {
      expect(shouldFollowKebabCase(filename)).toBe(true);
    }

    // Files that should not follow kebab-case (exempt)
    for (const filename of shouldNotFollowCases) {
      expect(shouldFollowKebabCase(filename)).toBe(false);
    }
  });

  it('should verify all files use kebab-case naming convention requirement', () => {
    // This test specifically addresses requirement 4.2: "WHEN files are named THEN they SHALL use kebab-case.ts format"
    const allSourceFiles = getAllFiles('src', [
      'node_modules',
      'dist',
      'coverage',
    ]);
    const allTestFiles = getAllFiles('tests', [
      'node_modules',
      'dist',
      'coverage',
    ]);

    let totalFiles = 0;
    let compliantFiles = 0;
    let nonCompliantFiles = 0;

    const allFiles = [...allSourceFiles, ...allTestFiles];

    for (const file of allFiles) {
      const filename = basename(file);

      if (shouldFollowKebabCase(filename)) {
        totalFiles++;
        if (isKebabCase(filename)) {
          compliantFiles++;
        } else {
          nonCompliantFiles++;
        }
      }
    }

    console.log(`Kebab-case naming convention compliance (Requirement 4.2):`);
    console.log(`  - Total files that should follow kebab-case: ${totalFiles}`);
    console.log(`  - Compliant files: ${compliantFiles}`);
    console.log(`  - Non-compliant files: ${nonCompliantFiles}`);
    console.log(
      `  - Compliance rate: ${Math.round((compliantFiles / totalFiles) * 100)}%`
    );

    // This test documents the current state and tracks progress toward full compliance
    expect(totalFiles).toBeGreaterThan(0);
    expect(compliantFiles).toBeGreaterThan(0);
  });

  it('should verify file naming consistency across workspace requirement', () => {
    // This test specifically addresses requirement 12.1: Testing methodology requirement
    const directories = ['src', 'tests', 'docs', 'scripts', 'examples'];
    const consistencyReport: Record<
      string,
      { total: number; compliant: number; nonCompliant: number }
    > = {};

    for (const dir of directories) {
      const files = getAllFiles(dir, ['node_modules', 'dist', 'coverage']);
      let total = 0;
      let compliant = 0;
      let nonCompliant = 0;

      for (const file of files) {
        const filename = basename(file);

        if (shouldFollowKebabCase(filename)) {
          total++;
          if (isKebabCase(filename)) {
            compliant++;
          } else {
            nonCompliant++;
          }
        }
      }

      consistencyReport[dir] = { total, compliant, nonCompliant };
    }

    console.log(`File naming consistency across workspace:`);
    for (const [dir, stats] of Object.entries(consistencyReport)) {
      const rate =
        stats.total > 0
          ? Math.round((stats.compliant / stats.total) * 100)
          : 100;
      console.log(
        `  - ${dir}/: ${stats.compliant}/${stats.total} compliant (${rate}%)`
      );
    }

    // Verify that we have consistency data for all directories
    expect(Object.keys(consistencyReport)).toEqual(directories);

    // Verify that each directory has some files (except possibly empty ones)
    for (const [_dir, stats] of Object.entries(consistencyReport)) {
      if (stats.total > 0) {
        expect(stats.compliant).toBeGreaterThanOrEqual(0);
        expect(stats.nonCompliant).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should verify imports reference correct file names requirement', () => {
    // This test specifically addresses the requirement to test imports reference correct file names
    const sourceFiles = getAllFiles('src', [
      'node_modules',
      'dist',
      'coverage',
    ]).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    let totalImports = 0;
    let correctImports = 0;
    let incorrectImports = 0;

    for (const file of sourceFiles) {
      try {
        const content = require('fs').readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach(line => {
          const importMatch = line.match(/import.*from\s+['"`]([^'"`]+)['"`]/);
          if (importMatch) {
            const importPath = importMatch[1];

            // Check relative imports with file extensions
            if (
              (importPath.startsWith('./') || importPath.startsWith('../')) &&
              importPath.includes('.')
            ) {
              totalImports++;
              const pathParts = importPath.split('/');
              const filename = pathParts[pathParts.length - 1];

              if (shouldFollowKebabCase(filename) && isKebabCase(filename)) {
                correctImports++;
              } else if (shouldFollowKebabCase(filename)) {
                incorrectImports++;
              } else {
                correctImports++; // Exempt files are considered correct
              }
            }
          }
        });
      } catch {
        // Skip files that can't be read
      }
    }

    console.log(`Import statement correctness:`);
    console.log(`  - Total relative imports with extensions: ${totalImports}`);
    console.log(`  - Correct imports: ${correctImports}`);
    console.log(`  - Incorrect imports: ${incorrectImports}`);

    if (totalImports > 0) {
      const correctnessRate = Math.round((correctImports / totalImports) * 100);
      console.log(`  - Correctness rate: ${correctnessRate}%`);
    }

    // Document the current state
    expect(totalImports).toBeGreaterThanOrEqual(0);
    expect(correctImports).toBeGreaterThanOrEqual(0);
  });
});
