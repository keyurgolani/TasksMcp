/**
 * Tests for SCREAMING_SNAKE_CASE constant naming convention compliance
 * Requirement 4.6: Enforce SCREAMING_SNAKE_CASE constant naming
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

import { describe, it, expect } from 'vitest';

describe('SCREAMING_SNAKE_CASE Constant Naming Convention', () => {
  /**
   * Get all TypeScript files in the src directory
   */
  function getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    function traverse(currentDir: string) {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (extname(item) === '.ts' && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }

    traverse(dir);
    return files;
  }

  /**
   * Extract all constants from a TypeScript file (exported and private)
   */
  function extractAllConstants(
    filePath: string
  ): Array<{ name: string; line: number; type: 'exported' | 'private' }> {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const constants: Array<{
      name: string;
      line: number;
      type: 'exported' | 'private';
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match exported const declarations
      const exportConstMatch = line.match(
        /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*[=:]/
      );
      if (exportConstMatch) {
        constants.push({
          name: exportConstMatch[1],
          line: i + 1,
          type: 'exported',
        });
      }

      // Match private static readonly constants
      const privateStaticMatch = line.match(
        /private\s+static\s+readonly\s+([A-Za-z_][A-Za-z0-9_]*)\s*[=:]/
      );
      if (privateStaticMatch) {
        constants.push({
          name: privateStaticMatch[1],
          line: i + 1,
          type: 'private',
        });
      }

      // Match regular const declarations (not exported)
      const constMatch = line.match(/^\s*const\s+([A-Z_][A-Z0-9_]*)\s*[=:]/);
      if (constMatch && !line.includes('export')) {
        constants.push({
          name: constMatch[1],
          line: i + 1,
          type: 'private',
        });
      }
    }

    return constants;
  }

  /**
   * Extract exported constants from a TypeScript file (for backward compatibility)
   */
  function _extractExportedConstants(
    filePath: string
  ): Array<{ name: string; line: number }> {
    return extractAllConstants(filePath)
      .filter(c => c.type === 'exported')
      .map(c => ({ name: c.name, line: c.line }));
  }

  /**
   * Check if a constant name follows SCREAMING_SNAKE_CASE
   */
  function isScreamingSnakeCase(name: string): boolean {
    // SCREAMING_SNAKE_CASE pattern: all uppercase letters, numbers, and underscores
    // Must start with letter or underscore, cannot end with underscore
    return /^[A-Z_][A-Z0-9_]*[A-Z0-9]$|^[A-Z]$/.test(name);
  }

  it('should verify all constants use SCREAMING_SNAKE_CASE naming convention', () => {
    const srcDir = join(process.cwd(), 'src');
    const files = getAllTypeScriptFiles(srcDir);

    const violations: Array<{
      file: string;
      constant: string;
      line: number;
      type: 'exported' | 'private';
    }> = [];

    let totalConstants = 0;
    let compliantConstants = 0;
    let exportedConstants = 0;
    let privateConstants = 0;

    for (const file of files) {
      const constants = extractAllConstants(file);

      for (const constant of constants) {
        totalConstants++;

        if (constant.type === 'exported') {
          exportedConstants++;
        } else {
          privateConstants++;
        }

        if (isScreamingSnakeCase(constant.name)) {
          compliantConstants++;
        } else {
          violations.push({
            file: file.replace(process.cwd() + '/', ''),
            constant: constant.name,
            line: constant.line,
            type: constant.type,
          });
        }
      }
    }

    // Log compliance statistics
    const complianceRate =
      totalConstants > 0 ? (compliantConstants / totalConstants) * 100 : 100;

    console.log(
      `SCREAMING_SNAKE_CASE constant naming convention compliance (Requirement 4.6):`
    );
    console.log(`  - Total constants found: ${totalConstants}`);
    console.log(`  - Exported constants: ${exportedConstants}`);
    console.log(`  - Private constants: ${privateConstants}`);
    console.log(`  - Compliant constants: ${compliantConstants}`);
    console.log(`  - Non-compliant constants: ${violations.length}`);
    console.log(`  - Compliance rate: ${complianceRate.toFixed(1)}%`);

    if (violations.length > 0) {
      console.log(
        `\nConstants that should be renamed to SCREAMING_SNAKE_CASE:`
      );
      for (const violation of violations.slice(0, 10)) {
        console.log(
          `  - ${violation.file}:${violation.line} - "${violation.constant}" (${violation.type})`
        );
      }
      if (violations.length > 10) {
        console.log(`  ... and ${violations.length - 10} more violations`);
      }
    }

    // All constants should follow SCREAMING_SNAKE_CASE
    expect(violations).toHaveLength(0);
    expect(complianceRate).toBe(100);
  });

  it('should verify constant naming consistency across workspace', () => {
    const srcDir = join(process.cwd(), 'src');
    const files = getAllTypeScriptFiles(srcDir);

    const constantsByDirectory: Record<
      string,
      { total: number; compliant: number; exported: number; private: number }
    > = {};

    for (const file of files) {
      const relativePath = file.replace(process.cwd() + '/src/', '');
      const directory = relativePath.split('/')[0];

      if (!constantsByDirectory[directory]) {
        constantsByDirectory[directory] = {
          total: 0,
          compliant: 0,
          exported: 0,
          private: 0,
        };
      }

      const constants = extractAllConstants(file);

      for (const constant of constants) {
        constantsByDirectory[directory].total++;

        if (constant.type === 'exported') {
          constantsByDirectory[directory].exported++;
        } else {
          constantsByDirectory[directory].private++;
        }

        if (isScreamingSnakeCase(constant.name)) {
          constantsByDirectory[directory].compliant++;
        }
      }
    }

    console.log(`\nConstant naming consistency across workspace:`);
    for (const [dir, stats] of Object.entries(constantsByDirectory)) {
      const compliance =
        stats.total > 0
          ? Math.round((stats.compliant / stats.total) * 100)
          : 100;
      console.log(
        `  - ${dir}: ${stats.compliant}/${stats.total} compliant (${compliance}%) [${stats.exported} exported, ${stats.private} private]`
      );
    }

    // All directories should have 100% compliance
    for (const [_dir, stats] of Object.entries(constantsByDirectory)) {
      const compliance =
        stats.total > 0 ? (stats.compliant / stats.total) * 100 : 100;
      expect(compliance).toBe(100);
    }
  });

  it('should verify all constant names follow SCREAMING_SNAKE_CASE pattern requirements', () => {
    // Test various patterns to ensure our validation is correct
    const testCases = [
      // Valid SCREAMING_SNAKE_CASE
      { name: 'VALID_CONSTANT', expected: true },
      { name: 'ANOTHER_VALID_CONSTANT', expected: true },
      { name: 'CONSTANT_WITH_NUMBERS_123', expected: true },
      { name: 'SINGLE_WORD', expected: true },
      { name: 'A', expected: true },
      { name: 'MAX_LENGTH', expected: true },
      { name: 'TAG_VALIDATION_PATTERN', expected: true },
      { name: 'MCP_TOOL_SCHEMAS', expected: true },

      // Invalid patterns
      { name: 'camelCase', expected: false },
      { name: 'PascalCase', expected: false },
      { name: 'snake_case', expected: false },
      { name: 'kebab-case', expected: false },
      { name: 'mixedCase_CONSTANT', expected: false },
      { name: 'CONSTANT_with_lowercase', expected: false },
      { name: '123_STARTS_WITH_NUMBER', expected: false },
      { name: 'ENDS_WITH_UNDERSCORE_', expected: false },
      { name: 'HAS-HYPHEN', expected: false },
      { name: 'HAS SPACE', expected: false },
    ];

    console.log(
      `\nSCREAMING_SNAKE_CASE pattern validation completed for ${testCases.length} test cases`
    );

    for (const testCase of testCases) {
      const result = isScreamingSnakeCase(testCase.name);
      expect(result).toBe(testCase.expected);
    }
  });

  it('should verify references to constants are updated correctly', () => {
    // This test ensures that when constants are renamed, their references are also updated
    const srcDir = join(process.cwd(), 'src');
    const files = getAllTypeScriptFiles(srcDir);

    // Look for any remaining references to old constant names that should have been updated
    // Note: Local schema constants in handlers are acceptable as they are not exported
    const oldConstantPatterns = [
      'baseConfig',
      'developmentConfig',
      'productionConfig',
      'dataSourceConfigLoader',
      'notesSearchIndex',
      'commonSchemas',
    ];

    const violations: Array<{
      file: string;
      line: number;
      content: string;
      pattern: string;
    }> = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of oldConstantPatterns) {
          const regex = new RegExp(pattern, 'g');
          if (regex.test(line) && !line.includes('//') && !line.includes('*')) {
            violations.push({
              file: file.replace(process.cwd() + '/', ''),
              line: i + 1,
              content: line.trim(),
              pattern,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      console.log(
        `\nFound references to old constant names that should be updated:`
      );
      for (const violation of violations.slice(0, 5)) {
        console.log(
          `  - ${violation.file}:${violation.line} - "${violation.pattern}" in: ${violation.content}`
        );
      }
      if (violations.length > 5) {
        console.log(`  ... and ${violations.length - 5} more violations`);
      }
    }

    // Should have no references to old constant names
    expect(violations).toHaveLength(0);
  });
});
