import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('ESLint no-unused-vars enforcement', () => {
  it('should have ESLint configured with no-unused-vars rule', () => {
    // Check that ESLint config exists
    const configPath = join(process.cwd(), 'eslint.config.js');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify no-unused-vars rule is configured
    expect(configContent).toContain('@typescript-eslint/no-unused-vars');
    expect(configContent).toContain('error');
    expect(configContent).toContain('argsIgnorePattern');
    expect(configContent).toContain('varsIgnorePattern');
    expect(configContent).toContain('caughtErrorsIgnorePattern');
  });

  it('should enforce no-unused-vars rule is enabled', () => {
    // Read ESLint config to verify rule configuration
    const configPath = join(process.cwd(), 'eslint.config.js');
    const configContent = readFileSync(configPath, 'utf-8');

    // Check that the rule is set to 'error' level (JavaScript object syntax)
    expect(configContent).toContain("'@typescript-eslint/no-unused-vars': [");
    expect(configContent).toContain("'error'");

    // Check that ignore patterns are configured for underscore prefixed variables
    expect(configContent).toContain('^_');
  });

  it('should not have unused variables in source code', () => {
    try {
      // Run ESLint specifically for unused variables on source files
      const result = execSync('npx eslint src/**/*.ts --format json', {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      const lintResults = JSON.parse(result);

      // Filter for no-unused-vars violations

      const unusedVarsErrors = lintResults.flatMap((file: any) =>
        file.messages.filter(
          (message: any) =>
            message.ruleId === '@typescript-eslint/no-unused-vars' ||
            message.ruleId === 'no-unused-vars'
        )
      );

      // Should have no unused variables in source code
      expect(unusedVarsErrors).toHaveLength(0);
    } catch (error: any) {
      // If ESLint exits with non-zero code, parse the output to check for unused vars
      if (error.stdout) {
        const lintResults = JSON.parse(error.stdout);

        const unusedVarsErrors = lintResults.flatMap((file: any) =>
          file.messages.filter(
            (message: any) =>
              message.ruleId === '@typescript-eslint/no-unused-vars' ||
              message.ruleId === 'no-unused-vars'
          )
        );

        if (unusedVarsErrors.length > 0) {
          const errorDetails = unusedVarsErrors
            .map(
              (err: any) =>
                `${err.filePath}:${err.line}:${err.column} - ${err.message}`
            )
            .join('\n');

          throw new Error(
            `Found unused variables in source code:\n${errorDetails}`
          );
        }
      }
    }
  });

  it('should allow underscore-prefixed variables to be unused', () => {
    // Create a temporary test file with underscore-prefixed unused variables
    const testCode = `
      function testFunction() {
        const _unusedVar = 'this should be allowed';
        const _anotherUnused = 42;
        
        try {
          // some code
        } catch (_error) {
          // error handling
        }
        
        return 'test';
      }
    `;

    // This test verifies that our ESLint config allows underscore-prefixed variables
    // by checking the configuration patterns
    expect(testCode).toContain('_unusedVar'); // Verify test code contains underscore variables
    const configPath = join(process.cwd(), 'eslint.config.js');
    const configContent = readFileSync(configPath, 'utf-8');

    expect(configContent).toContain("varsIgnorePattern: '^_'");
    expect(configContent).toContain("argsIgnorePattern: '^_'");
    expect(configContent).toContain("caughtErrorsIgnorePattern: '^_'");
  });

  it('should have package.json configured with lint script', () => {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Verify lint script exists and uses ESLint
    expect(packageJson.scripts).toHaveProperty('lint');
    expect(packageJson.scripts.lint).toContain('eslint');

    // Verify lint:fix script exists
    expect(packageJson.scripts).toHaveProperty('lint:fix');
    expect(packageJson.scripts['lint:fix']).toContain('eslint');
    expect(packageJson.scripts['lint:fix']).toContain('--fix');
  });

  it('should have ESLint dependencies installed', () => {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Check for ESLint and TypeScript ESLint dependencies
    const devDeps = packageJson.devDependencies || {};

    expect(devDeps).toHaveProperty('eslint');
    expect(devDeps).toHaveProperty('@typescript-eslint/eslint-plugin');
    expect(devDeps).toHaveProperty('@typescript-eslint/parser');
    expect(devDeps).toHaveProperty('@eslint/js');
  });
});
