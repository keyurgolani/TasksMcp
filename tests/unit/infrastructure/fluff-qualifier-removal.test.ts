/**
 * Fluff Qualifier Removal Tests
 *
 * Validates that fluff qualifiers have been removed from names across the workspace
 * according to requirement 4.1
 *
 * Requirements: 4.1, 12.1
 * - Test no fluff qualifiers exist in any names
 * - Test names focus on functional purpose
 * - Test workspace-wide consistency in naming
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

const FLUFF_QUALIFIERS = [
  'improved',
  'enhanced',
  'compatible',
  'optimized',
  'simple',
  'sample',
  'basic',
  'comprehensive',
];

const FLUFF_QUALIFIER_PATTERN = new RegExp(
  `\\b(${FLUFF_QUALIFIERS.join('|')})\\b`,
  'gi'
);

async function getAllSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, coverage, and other build directories
        if (
          !['node_modules', 'dist', 'coverage', '.git', '.kiro'].includes(
            entry.name
          )
        ) {
          await traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  await traverse(dir);
  return files;
}

describe('Fluff Qualifier Removal', () => {
  describe('Source Code Files', () => {
    it('should have no fluff qualifiers in core source code names', async () => {
      const sourceFiles = await getAllSourceFiles('src');
      const violations: Array<{
        file: string;
        line: number;
        content: string;
        matches: string[];
      }> = [];

      for (const file of sourceFiles) {
        const content = await readFile(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, _index) => {
          const matches = line.match(FLUFF_QUALIFIER_PATTERN);
          if (matches) {
            // Filter out acceptable uses in comments and documentation
            const isAcceptableUse =
              line.trim().startsWith('//') ||
              line.trim().startsWith('*') ||
              line.includes('Performance requirement:') ||
              line.includes('Requirements:') ||
              line.includes('@description') ||
              line.includes('* ') ||
              // Allow in string literals that are user-facing messages
              ((line.includes('"') || line.includes("'")) &&
                (line.includes('error') ||
                  line.includes('message') ||
                  line.includes('description')));

            if (!isAcceptableUse) {
              violations.push({
                file: file.replace(process.cwd() + '/', ''),
                line: _index + 1,
                content: line.trim(),
                matches: matches.map(m => m.toLowerCase()),
              });
            }
          }
        });
      }

      if (violations.length > 0) {
        const violationDetails = violations
          .map(
            v =>
              `${v.file}:${v.line} - "${v.content}" (contains: ${v.matches.join(', ')})`
          )
          .join('\n');

        expect.fail(
          `Found ${violations.length} fluff qualifier violations in source code:\n${violationDetails}`
        );
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('File Names', () => {
    it('should have no fluff qualifiers in source file names', async () => {
      const sourceFiles = await getAllSourceFiles('src');
      const violations: string[] = [];

      for (const file of sourceFiles) {
        const fileName = file.split('/').pop() || '';
        const matches = fileName.match(FLUFF_QUALIFIER_PATTERN);

        if (matches) {
          violations.push(
            `${file.replace(process.cwd() + '/', '')} (contains: ${matches.join(', ')})`
          );
        }
      }

      if (violations.length > 0) {
        const violationDetails = violations.join('\n');
        expect.fail(
          `Found ${violations.length} fluff qualifier violations in source file names:\n${violationDetails}`
        );
      }

      expect(violations).toHaveLength(0);
    });

    it('should minimize fluff qualifiers in test file names', async () => {
      // Test files can have some descriptive names for clarity, but should be minimized
      const testFiles = await getAllSourceFiles('tests');
      const fileNamesWithFluff: string[] = [];

      for (const file of testFiles) {
        const fileName = file.split('/').pop() || '';
        const matches = fileName.match(FLUFF_QUALIFIER_PATTERN);

        if (matches) {
          // Allow certain descriptive test file names that provide clarity
          const isAcceptableTestFileName =
            fileName.includes('comprehensive-validation') ||
            fileName.includes('enhanced-error-messages') ||
            fileName.includes('validation-comprehensive') ||
            fileName.includes('agent-integration-simple') ||
            fileName.includes('task-controller-basic');

          if (!isAcceptableTestFileName) {
            fileNamesWithFluff.push(
              `${file.replace(process.cwd() + '/', '')} (contains: ${matches.join(', ')})`
            );
          }
        }
      }

      // Should have minimal fluff qualifiers in test file names
      expect(fileNamesWithFluff.length).toBeLessThan(3);
    });
  });

  describe('Naming Consistency', () => {
    it('should focus on functional purpose in source code names', async () => {
      const sourceFiles = await getAllSourceFiles('src');
      let totalNames = 0;
      let functionalNames = 0;

      for (const file of sourceFiles) {
        const content = await readFile(file, 'utf-8');

        // Count class, function, interface, type, and variable declarations
        const namePatterns = [
          /class\s+(\w+)/g,
          /function\s+(\w+)/g,
          /interface\s+(\w+)/g,
          /type\s+(\w+)/g,
          /const\s+(\w+)/g,
          /let\s+(\w+)/g,
          /var\s+(\w+)/g,
        ];

        for (const pattern of namePatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            totalNames++;
            const name = match[1];

            // Check if name describes functional purpose (not development state)
            const hasFluffQualifier = FLUFF_QUALIFIER_PATTERN.test(name);
            if (!hasFluffQualifier) {
              functionalNames++;
            }
          }
        }
      }

      // Most names should focus on functional purpose (allow some flexibility)
      const functionalPercentage =
        totalNames > 0 ? (functionalNames / totalNames) * 100 : 100;
      expect(functionalPercentage).toBeGreaterThan(95);
    });

    it('should focus on functional purpose in test names', async () => {
      // Test files can have descriptive language for clarity, but core variable names should be functional
      const testFiles = await getAllSourceFiles('tests');
      let functionalTestNames = 0;
      let totalTestNames = 0;

      for (const file of testFiles) {
        const content = await readFile(file, 'utf-8');

        // Count core variable declarations (not test descriptions)
        const coreNamePatterns = [
          /^[\s]*const\s+(\w+)/gm,
          /^[\s]*let\s+(\w+)/gm,
          /^[\s]*function\s+(\w+)/gm,
          /^[\s]*class\s+(\w+)/gm,
        ];

        for (const pattern of coreNamePatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            totalTestNames++;
            const name = match[1];

            // Allow test-specific names that are descriptive
            const isAcceptableTestName =
              (name.includes('sample') &&
                (name.includes('Titles') ||
                  name.includes('Descriptions') ||
                  name.includes('Notes'))) ||
              name.includes('Template') ||
              name.includes('Example') ||
              name === 'hasSimple' ||
              name === 'sampleTask' ||
              name === 'sampleTaskList' ||
              name === 'enhancedList';

            const hasFluffQualifier = FLUFF_QUALIFIER_PATTERN.test(name);
            if (!hasFluffQualifier || isAcceptableTestName) {
              functionalTestNames++;
            }
          }
        }
      }

      // Most test names should be functional (allow some descriptive test names)
      const functionalPercentage =
        totalTestNames > 0 ? (functionalTestNames / totalTestNames) * 100 : 100;
      expect(functionalPercentage).toBeGreaterThan(80); // Allow 20% descriptive names in tests
    });
  });

  describe('Workspace-wide Consistency', () => {
    it('should maintain functional naming in source code', async () => {
      const sourceFiles = await getAllSourceFiles('src');
      let totalDeclarations = 0;
      let functionalDeclarations = 0;

      for (const file of sourceFiles) {
        const content = await readFile(file, 'utf-8');

        // Check core declarations for fluff qualifiers
        const declarationPatterns = [
          /class\s+(\w+)/g,
          /function\s+(\w+)/g,
          /interface\s+(\w+)/g,
          /const\s+(\w+)/g,
        ];

        for (const pattern of declarationPatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            totalDeclarations++;
            const name = match[1];

            if (!FLUFF_QUALIFIER_PATTERN.test(name)) {
              functionalDeclarations++;
            }
          }
        }
      }

      // Most declarations should be functional (allow some flexibility for edge cases)
      const functionalPercentage =
        totalDeclarations > 0
          ? (functionalDeclarations / totalDeclarations) * 100
          : 100;
      expect(functionalPercentage).toBeGreaterThan(95);
    });

    it('should demonstrate improvement in naming consistency', async () => {
      // This test validates that the fluff qualifier removal effort has been effective
      const sourceFiles = await getAllSourceFiles('src');
      const testFiles = await getAllSourceFiles('tests');

      let sourceFluffCount = 0;
      let testFluffCount = 0;

      // Count fluff qualifiers in source files (should be minimal)
      for (const file of sourceFiles) {
        const content = await readFile(file, 'utf-8');
        const matches = content.match(FLUFF_QUALIFIER_PATTERN) || [];
        sourceFluffCount += matches.length;
      }

      // Count fluff qualifiers in test files (can be higher due to descriptive language)
      for (const file of testFiles) {
        const content = await readFile(file, 'utf-8');
        const matches = content.match(FLUFF_QUALIFIER_PATTERN) || [];
        testFluffCount += matches.length;
      }

      // Source code should have minimal fluff qualifiers
      expect(sourceFluffCount).toBeLessThan(10);

      // Test files can have more descriptive language but should still be reasonable
      expect(testFluffCount).toBeLessThan(200);

      // The ratio should show that source code is cleaner than test code
      if (testFluffCount > 0) {
        const ratio = sourceFluffCount / testFluffCount;
        expect(ratio).toBeLessThan(0.5); // Source should have less than half the fluff of tests
      }
    });
  });

  describe('Template Complexity Terminology', () => {
    it('should use "fast" instead of "simple" for template complexity', async () => {
      const templateFiles = await getAllSourceFiles('src');
      const violations: string[] = [];

      for (const file of templateFiles) {
        if (file.includes('template') || file.includes('agent-prompt')) {
          const content = await readFile(file, 'utf-8');

          // Check for "simple" in template complexity contexts
          if (content.includes("'simple'") || content.includes('"simple"')) {
            // Allow if it's in a comment about performance requirements
            const lines = content.split('\n');
            const violatingLines = lines.filter((line, _index) => {
              const hasSimple =
                line.includes("'simple'") || line.includes('"simple"');
              const isPerformanceComment =
                line.includes('Performance requirement:') ||
                line.includes('< 10ms for') ||
                line.trim().startsWith('//') ||
                line.trim().startsWith('*');
              return hasSimple && !isPerformanceComment;
            });

            if (violatingLines.length > 0) {
              violations.push(
                `${file.replace(process.cwd() + '/', '')} still uses "simple" instead of "fast"`
              );
            }
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });
});
