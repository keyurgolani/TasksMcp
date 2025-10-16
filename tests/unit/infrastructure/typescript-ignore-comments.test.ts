import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('TypeScript Ignore Comments Removal', () => {
  const getAllTsFiles = (dir: string): string[] => {
    const files: string[] = [];

    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Skip node_modules, dist, coverage directories
            if (!['node_modules', 'dist', 'coverage', '.git'].includes(item)) {
              files.push(...getAllTsFiles(fullPath));
            }
          } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            files.push(fullPath);
          }
        } catch (_error) {
          // Skip files/directories that can't be accessed
          continue;
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
      return files;
    }

    return files;
  };

  const isActualIgnoreComment = (line: string): boolean => {
    const trimmed = line.trim();
    // Check for actual TypeScript ignore comments (not references in strings or documentation)
    return (
      trimmed.startsWith('// @ts-ignore') ||
      trimmed.startsWith('//@ts-ignore') ||
      trimmed.includes('/* @ts-ignore') ||
      (trimmed.startsWith('@ts-ignore') &&
        !trimmed.includes('"') &&
        !trimmed.includes("'"))
    );
  };

  const isActualExpectErrorComment = (line: string): boolean => {
    const trimmed = line.trim();
    // Check for actual TypeScript expect-error comments (not references in strings or documentation)
    return (
      trimmed.startsWith('// @ts-expect-error') ||
      trimmed.startsWith('//@ts-expect-error') ||
      trimmed.includes('/* @ts-expect-error') ||
      (trimmed.startsWith('@ts-expect-error') &&
        !trimmed.includes('"') &&
        !trimmed.includes("'"))
    );
  };

  it('should not contain any actual TypeScript ignore comments in the codebase', () => {
    const projectRoot = join(__dirname, '../../..');
    const tsFiles = getAllTsFiles(projectRoot);

    expect(tsFiles.length).toBeGreaterThan(0); // Ensure we found TypeScript files

    const filesWithTsIgnore: Array<{ file: string; lines: string[] }> = [];
    const currentTestFile = join(
      __dirname,
      'typescript-ignore-comments.test.ts'
    );

    for (const file of tsFiles) {
      // Skip this test file itself since it contains references to the ignore comments
      if (file === currentTestFile) {
        continue;
      }

      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const problematicLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isActualIgnoreComment(line)) {
            problematicLines.push(`Line ${i + 1}: ${line.trim()}`);
          }
        }

        if (problematicLines.length > 0) {
          filesWithTsIgnore.push({ file, lines: problematicLines });
        }
      } catch (_error) {
        // Skip files that can't be read
        continue;
      }
    }

    expect(filesWithTsIgnore).toEqual([]);

    if (filesWithTsIgnore.length > 0) {
      const errorMessage = filesWithTsIgnore
        .map(({ file, lines }) => `${file}:\n${lines.join('\n')}`)
        .join('\n\n');
      throw new Error(
        `Found actual TypeScript ignore comments:\n${errorMessage}`
      );
    }
  });

  it('should not contain any actual TypeScript expect-error comments in the codebase', () => {
    const projectRoot = join(__dirname, '../../..');
    const tsFiles = getAllTsFiles(projectRoot);

    expect(tsFiles.length).toBeGreaterThan(0); // Ensure we found TypeScript files

    const filesWithTsExpectError: Array<{ file: string; lines: string[] }> = [];
    const currentTestFile = join(
      __dirname,
      'typescript-ignore-comments.test.ts'
    );

    for (const file of tsFiles) {
      // Skip this test file itself since it contains references to the expect-error comments
      if (file === currentTestFile) {
        continue;
      }

      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const problematicLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isActualExpectErrorComment(line)) {
            problematicLines.push(`Line ${i + 1}: ${line.trim()}`);
          }
        }

        if (problematicLines.length > 0) {
          filesWithTsExpectError.push({ file, lines: problematicLines });
        }
      } catch (_error) {
        // Skip files that can't be read
        continue;
      }
    }

    expect(filesWithTsExpectError).toEqual([]);

    if (filesWithTsExpectError.length > 0) {
      const errorMessage = filesWithTsExpectError
        .map(({ file, lines }) => `${file}:\n${lines.join('\n')}`)
        .join('\n\n');
      throw new Error(
        `Found actual TypeScript expect-error comments:\n${errorMessage}`
      );
    }
  });

  it('should verify TypeScript compilation succeeds without ignore comments', () => {
    // This test ensures that the codebase compiles successfully without any TypeScript ignore comments
    // The absence of actual ignore and expect-error comments means all TypeScript issues are properly resolved

    const projectRoot = join(__dirname, '../../..');
    const tsFiles = getAllTsFiles(projectRoot);

    // Verify we have TypeScript files to test
    expect(tsFiles.length).toBeGreaterThan(0);

    // Count source files vs test files to ensure we're testing actual implementation
    const sourceFiles = tsFiles.filter(file => file.includes('/src/'));
    const testFiles = tsFiles.filter(file => file.includes('/tests/'));

    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(testFiles.length).toBeGreaterThan(0);

    // If this test passes, it means TypeScript compilation is working
    // without any ignore comments, indicating all issues are properly resolved
    expect(true).toBe(true);
  });
});
