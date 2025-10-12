/**
 * Unit tests for ESLint no-console rule compliance
 *
 * Tests that no console statements exist in production code and that proper logging is used throughout.
 * Requirements: 3.6, 12.1
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

import { describe, it, expect } from 'vitest';

describe('ESLint no-console compliance', () => {
  it('should have no-console rule enabled in ESLint configuration', () => {
    const eslintConfigPath = 'eslint.config.js';
    const eslintConfig = readFileSync(eslintConfigPath, 'utf-8');

    // Check that no-console rule is enabled (JavaScript object syntax)
    expect(eslintConfig).toContain("'no-console': 'error'");
  });

  it('should pass ESLint no-console rule for all source files', () => {
    // Run ESLint specifically for no-console rule on source files
    const eslintCommand =
      'npx eslint src/**/*.ts --rule "no-console: error" --no-fix';

    let eslintOutput: string;
    let exitCode: number;

    try {
      eslintOutput = execSync(eslintCommand, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      exitCode = 0;
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        eslintOutput = (error as { stdout: string }).stdout;
        exitCode = (error as { status: number }).status;
      } else {
        throw error;
      }
    }

    // ESLint should exit with code 0 (no errors)
    expect(exitCode).toBe(0);

    // Output should not contain console-related errors
    expect(eslintOutput).not.toContain('no-console');
  });

  it('should not contain console statements in production source code', () => {
    const sourceFiles = getAllTypeScriptFiles('src');
    const consoleUsages: Array<{
      file: string;
      line: number;
      content: string;
    }> = [];

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip JSDoc comments and regular comments
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('*') || trimmedLine.startsWith('//')) {
          return;
        }

        // Check for console usage (but not in comments)
        if (/console\.[a-zA-Z]/.test(line) && !line.includes('//')) {
          consoleUsages.push({
            file,
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }

    // Should have no console statements in production code
    expect(consoleUsages).toEqual([]);
  });

  it('should use proper logging instead of console statements', () => {
    const sourceFiles = getAllTypeScriptFiles('src');
    let hasLoggerImports = false;
    let hasProcessStdoutUsage = false;

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');

      // Check for proper logger imports
      if (
        content.includes('import { logger }') ||
        content.includes('from "../shared/utils/logger.js"')
      ) {
        hasLoggerImports = true;
      }

      // Check for proper process.stdout/stderr usage for CLI output
      if (
        content.includes('process.stdout.write') ||
        content.includes('process.stderr.write')
      ) {
        hasProcessStdoutUsage = true;
      }
    }

    // Should have proper logging infrastructure
    expect(hasLoggerImports).toBe(true);
    expect(hasProcessStdoutUsage).toBe(true);
  });

  it('should have logger properly configured for different environments', () => {
    const loggerPath = 'src/shared/utils/logger.ts';
    const loggerContent = readFileSync(loggerPath, 'utf-8');

    // Should have environment-based configuration
    expect(loggerContent).toContain('process.env');
    expect(loggerContent).toContain('winston');

    // Should handle MCP mode properly (no console output in MCP mode)
    expect(loggerContent).toContain('isMcpMode');

    // Should have proper transports configuration
    expect(loggerContent).toContain('transports');
  });

  it('should use process.stdout/stderr for CLI output instead of console', () => {
    const cliFiles = ['src/app/cli.ts', 'src/app/api-server.ts'];

    for (const file of cliFiles) {
      const content = readFileSync(file, 'utf-8');

      // Should use process.stdout.write instead of console.log
      if (
        content.includes('process.stdout.write') ||
        content.includes('process.stderr.write')
      ) {
        expect(content).not.toMatch(/console\.(log|error|warn|info)/);
      }
    }
  });

  it('should have proper error handling without console statements', () => {
    const sourceFiles = getAllTypeScriptFiles('src');

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');

      // If file has error handling, it should use logger or process.stderr
      if (content.includes('catch') || content.includes('error')) {
        const hasProperErrorHandling =
          content.includes('logger.error') ||
          content.includes('process.stderr.write') ||
          !content.includes('console.error');

        expect(hasProperErrorHandling).toBe(true);
      }
    }
  });
});

/**
 * Helper function to recursively get all TypeScript files in a directory
 */
function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string): void {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extname(item) === '.ts') {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}
