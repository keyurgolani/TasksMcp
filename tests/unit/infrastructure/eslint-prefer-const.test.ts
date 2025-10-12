import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('ESLint prefer-const enforcement', () => {
  it('should have ESLint configured with prefer-const rule', () => {
    // Check that ESLint config exists
    const configPath = join(process.cwd(), 'eslint.config.js');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify prefer-const rule is configured
    expect(configContent).toContain('prefer-const');
    expect(configContent).toContain('error');
  });

  it('should enforce prefer-const rule is enabled', () => {
    // Read ESLint config to verify rule configuration
    const configPath = join(process.cwd(), 'eslint.config.js');
    const configContent = readFileSync(configPath, 'utf-8');

    // Check that the rule is set to 'error' level (JavaScript object syntax)
    expect(configContent).toContain("'prefer-const': 'error'");
  });

  it('should not have prefer-const violations in source code', () => {
    try {
      // Run ESLint specifically for prefer-const violations on source files
      const result = execSync('npx eslint src/**/*.ts --format json', {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      const lintResults = JSON.parse(result);

      // Filter for prefer-const violations

      const preferConstErrors = lintResults.flatMap((file: any) =>
        file.messages.filter(
          (message: any) => message.ruleId === 'prefer-const'
        )
      );

      // Should have no prefer-const violations in source code
      expect(preferConstErrors).toHaveLength(0);
    } catch (error: any) {
      // If ESLint exits with non-zero code, parse the output to check for prefer-const violations
      if (error.stdout) {
        const lintResults = JSON.parse(error.stdout);

        const preferConstErrors = lintResults.flatMap((file: any) =>
          file.messages.filter(
            (message: any) => message.ruleId === 'prefer-const'
          )
        );

        if (preferConstErrors.length > 0) {
          const errorDetails = preferConstErrors
            .map(
              (err: any) =>
                `${err.filePath}:${err.line}:${err.column} - ${err.message}`
            )
            .join('\n');

          throw new Error(
            `Found prefer-const violations in source code:\n${errorDetails}`
          );
        }
      }
    }
  });

  it('should use const instead of let where appropriate', () => {
    try {
      // Run ESLint with prefer-const rule specifically
      const result = execSync(
        'npx eslint src/ --rule prefer-const:error --format json',
        {
          encoding: 'utf-8',
          cwd: process.cwd(),
        }
      );

      const lintResults = JSON.parse(result);

      // Check that there are no prefer-const rule violations

      const violations = lintResults.flatMap((file: any) =>
        file.messages.filter((msg: any) => msg.ruleId === 'prefer-const')
      );

      expect(violations).toHaveLength(0);
    } catch (error: any) {
      // If there are violations, the command will exit with non-zero code
      if (error.stdout) {
        const lintResults = JSON.parse(error.stdout);

        const violations = lintResults.flatMap((file: any) =>
          file.messages.filter((msg: any) => msg.ruleId === 'prefer-const')
        );

        if (violations.length > 0) {
          const violationDetails = violations
            .map(
              (violation: any) =>
                `${violation.filePath}:${violation.line}:${violation.column} - ${violation.message}`
            )
            .join('\n');

          throw new Error(
            `Found prefer-const violations:\n${violationDetails}`
          );
        }
      }
    }
  });

  it('should have proper let vs const usage patterns', () => {
    // This test verifies that the codebase follows proper const/let patterns
    // by checking that ESLint prefer-const rule passes
    const configPath = join(process.cwd(), 'eslint.config.js');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify the rule is configured correctly
    expect(configContent).toContain('prefer-const');

    // Run a quick ESLint check to ensure no violations
    try {
      execSync('npx eslint src/ --rule prefer-const:error', {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      // If we reach here, there are no prefer-const violations
      expect(true).toBe(true);
    } catch (error: any) {
      // If there are violations, fail the test
      throw new Error(`prefer-const rule violations found: ${error.message}`);
    }
  });

  it('should have package.json configured with lint script that includes prefer-const', () => {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Verify lint script exists and uses ESLint
    expect(packageJson.scripts).toHaveProperty('lint');
    expect(packageJson.scripts.lint).toContain('eslint');

    // Verify lint:fix script exists (which would fix prefer-const violations)
    expect(packageJson.scripts).toHaveProperty('lint:fix');
    expect(packageJson.scripts['lint:fix']).toContain('eslint');
    expect(packageJson.scripts['lint:fix']).toContain('--fix');
  });

  it('should have ESLint dependencies that support prefer-const rule', () => {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Check for ESLint dependencies
    const devDeps = packageJson.devDependencies || {};

    expect(devDeps).toHaveProperty('eslint');
    expect(devDeps).toHaveProperty('@eslint/js');

    // prefer-const is a core ESLint rule, so it should be available with basic ESLint
    expect(devDeps.eslint).toBeDefined();
  });
});
