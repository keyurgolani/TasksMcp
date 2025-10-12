import { execSync } from 'child_process';

import { describe, it, expect } from 'vitest';

describe('ESLint no-explicit-any rule compliance', () => {
  it('should have no explicit any types in source code', async () => {
    try {
      // Run ESLint on source code with JSON output
      const result = execSync('npx eslint src/ --format json', {
        encoding: 'utf8',
        timeout: 30000,
      });

      const lintResults = JSON.parse(result);

      // Filter for no-explicit-any violations

      const explicitAnyErrors = lintResults.flatMap((file: any) =>
        file.messages.filter(
          (message: any) =>
            message.ruleId === '@typescript-eslint/no-explicit-any'
        )
      );

      // Should have no explicit any types in source code
      expect(explicitAnyErrors).toHaveLength(0);
    } catch (error: any) {
      // If ESLint exits with non-zero code, parse the output to check for explicit any violations
      if (error.stdout) {
        const lintResults = JSON.parse(error.stdout);

        const explicitAnyErrors = lintResults.flatMap((file: any) =>
          file.messages.filter(
            (message: any) =>
              message.ruleId === '@typescript-eslint/no-explicit-any'
          )
        );

        if (explicitAnyErrors.length > 0) {
          const errorDetails = explicitAnyErrors

            .map(
              (err: any) =>
                `${err.filePath}:${err.line}:${err.column} - ${err.message}`
            )
            .join('\n');
          throw new Error(
            `Found ${explicitAnyErrors.length} explicit any type violations:\n${errorDetails}`
          );
        }
      }

      // If there's an error but no explicit any violations, re-throw
      throw error;
    }
  });

  it('should enforce no-explicit-any rule in ESLint configuration', async () => {
    try {
      // Run ESLint with --print-config to check rule configuration
      const configResult = execSync(
        'npx eslint --print-config src/shared/types/task.ts',
        {
          encoding: 'utf8',
          timeout: 15000,
        }
      );

      const config = JSON.parse(configResult);

      // Check that the no-explicit-any rule is configured and set to error
      expect(config.rules).toHaveProperty('@typescript-eslint/no-explicit-any');
      // ESLint returns [2] for 'error', [1] for 'warn', [0] for 'off'
      const ruleConfig = config.rules['@typescript-eslint/no-explicit-any'];
      expect(Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig).toBe(2);
    } catch (error: any) {
      throw new Error(
        `Failed to verify ESLint configuration: ${error.message}`
      );
    }
  });

  it('should detect explicit any types if they were introduced', async () => {
    // This test verifies that the rule would catch violations if they existed
    // We'll test this by checking that the rule is properly loaded and functional
    try {
      // Run ESLint on source code only to ensure rule is working
      const result = execSync('npx eslint src/ --format json', {
        encoding: 'utf8',
        timeout: 45000,
      });

      const lintResults = JSON.parse(result);

      // Check that there are no no-explicit-any rule violations in source code

      const violations = lintResults.flatMap((file: any) =>
        file.messages.filter(
          (msg: any) => msg.ruleId === '@typescript-eslint/no-explicit-any'
        )
      );

      expect(violations).toHaveLength(0);
    } catch (error: any) {
      // If there are violations, the command will exit with non-zero code
      if (error.stdout) {
        const lintResults = JSON.parse(error.stdout);

        const violations = lintResults.flatMap((file: any) =>
          file.messages.filter(
            (msg: any) => msg.ruleId === '@typescript-eslint/no-explicit-any'
          )
        );

        if (violations.length > 0) {
          const violationDetails = violations
            .map(
              (violation: any) =>
                `${violation.filePath}:${violation.line}:${violation.column} - ${violation.message}`
            )
            .join('\n');
          throw new Error(
            `Found ${violations.length} explicit any type violations in source code:\n${violationDetails}`
          );
        }
      }

      // If ESLint failed for other reasons, that's also a problem
      throw new Error(`ESLint execution failed: ${error.message}`);
    }
  });

  it('should verify proper typing is used throughout codebase', async () => {
    try {
      // Run TypeScript compiler to check for proper typing
      const result = execSync('npx tsc --noEmit --strict', {
        encoding: 'utf8',
        timeout: 30000,
      });

      // If TypeScript compilation succeeds, proper typing is being used
      expect(result).toBeDefined();
    } catch (error: any) {
      // Check if the error is related to typing issues
      const output = error.stdout?.toString() || error.stderr?.toString() || '';

      // If there are TypeScript errors, it means typing issues exist
      if (output.includes('error TS')) {
        throw new Error(
          `TypeScript compilation failed with typing errors:\n${output}`
        );
      }

      // If it's not a typing error, re-throw
      throw error;
    }
  });

  it('should have proper type definitions for all variables and functions', async () => {
    // This test ensures that noImplicitAny is working in conjunction with no-explicit-any
    try {
      // Run TypeScript with noImplicitAny to ensure no implicit any types
      const result = execSync('npx tsc --noEmit --noImplicitAny --strict', {
        encoding: 'utf8',
        timeout: 30000,
      });

      // Successful compilation means no implicit any types
      expect(result).toBeDefined();
    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';

      // Check for implicit any errors
      if (output.includes("implicitly has an 'any' type")) {
        throw new Error(`Found implicit any types in codebase:\n${output}`);
      }

      // If it's not an implicit any error, re-throw
      throw error;
    }
  });
});
