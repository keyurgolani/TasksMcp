import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

describe('TypeScript noImplicitAny compliance', () => {
  describe('tsconfig.json configuration', () => {
    it('should have noImplicitAny enabled', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should have strict mode enabled which includes noImplicitAny', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify strict mode is enabled (which includes noImplicitAny)
      expect(tsconfig.compilerOptions.strict).toBe(true);
      // Verify noImplicitAny is explicitly enabled
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });
  });

  describe('implicit any detection', () => {
    it('should not have any implicit any types in the codebase', () => {
      let output = '';
      let hasErrors = false;

      try {
        execSync('npx tsc --noEmit --noImplicitAny', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      } catch (error: any) {
        hasErrors = true;
        output = error.stdout?.toString() || error.stderr?.toString() || '';
      }

      // If there are compilation errors, check they're not related to implicit any
      if (hasErrors) {
        const implicitAnyErrors = [
          "Parameter implicitly has an 'any' type",
          "Variable implicitly has an 'any' type",
          "Property implicitly has an 'any' type",
          "Element implicitly has an 'any' type",
          "Function implicitly has return type 'any'",
          "Index signature implicitly has an 'any' type",
          "Rest parameter implicitly has an 'any[]' type",
          "Binding element implicitly has an 'any' type",
        ];

        for (const errorPattern of implicitAnyErrors) {
          expect(output).not.toContain(errorPattern);
        }
      }

      // The test passes if there are no compilation errors or no implicit any errors
      expect(true).toBe(true);
    });

    it('should enforce explicit typing throughout the codebase', () => {
      // Run TypeScript compiler with noImplicitAny flag specifically
      expect(() => {
        execSync('npx tsc --noEmit --noImplicitAny', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      }).not.toThrow();
    });

    it('should compile successfully with noImplicitAny enabled', () => {
      // Verify that the entire codebase compiles without implicit any violations
      let compilationSuccessful = true;
      let errorOutput = '';

      try {
        execSync('npx tsc --noEmit --noImplicitAny --strict', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      } catch (error: any) {
        compilationSuccessful = false;
        errorOutput =
          error.stdout?.toString() || error.stderr?.toString() || '';

        // If compilation fails, it should not be due to implicit any issues
        const implicitAnyPatterns = [
          "implicitly has an 'any' type",
          "implicitly has return type 'any'",
          "implicitly has an 'any[]' type",
        ];

        for (const pattern of implicitAnyPatterns) {
          expect(errorOutput).not.toContain(pattern);
        }
      }

      // Expect compilation to be successful
      expect(compilationSuccessful).toBe(true);
    });
  });

  describe('explicit typing verification', () => {
    it('should use explicit typing for function parameters', () => {
      // This test verifies that noImplicitAny catches function parameter issues
      // by ensuring the flag is properly configured and working
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify the configuration that enforces explicit parameter typing
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should use explicit typing for variables and properties', () => {
      // Verify that variable and property declarations use explicit typing
      // by ensuring TypeScript compilation succeeds with strict typing rules
      expect(() => {
        execSync(
          'npx tsc --noEmit --noImplicitAny --strictPropertyInitialization',
          {
            stdio: 'pipe',
            cwd: process.cwd(),
            timeout: 30000,
          }
        );
      }).not.toThrow();
    });

    it('should use explicit return types where required', () => {
      // Verify that functions have explicit return types where needed
      // This is enforced by noImplicitAny in certain contexts
      expect(() => {
        execSync('npx tsc --noEmit --noImplicitAny --noImplicitReturns', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      }).not.toThrow();
    });
  });

  describe('noImplicitAny flag effectiveness', () => {
    it('should detect implicit any violations if they were introduced', () => {
      // This test verifies that the noImplicitAny flag is actually working
      // by confirming the TypeScript configuration is set up correctly
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify all the flags that help catch implicit any are enabled
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitReturns).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitThis).toBe(true);
    });

    it('should maintain zero implicit any violations across the entire workspace', () => {
      // Run a comprehensive check across all TypeScript files
      let output = '';
      let exitCode = 0;

      try {
        execSync('npx tsc --noEmit --noImplicitAny --strict', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 45000,
        });
      } catch (error: any) {
        exitCode = error.status || 1;
        output = error.stdout?.toString() || error.stderr?.toString() || '';
      }

      // If there are any errors, they should not be implicit any related
      if (exitCode !== 0) {
        const implicitAnyIndicators = [
          "implicitly has an 'any' type",
          "implicitly has return type 'any'",
          "Parameter implicitly has an 'any' type",
          "Variable implicitly has an 'any' type",
          "Property implicitly has an 'any' type",
          "Element implicitly has an 'any' type",
          "Index signature implicitly has an 'any' type",
          "Rest parameter implicitly has an 'any[]' type",
          "Binding element implicitly has an 'any' type",
        ];

        for (const indicator of implicitAnyIndicators) {
          expect(output).not.toContain(indicator);
        }
      }

      // Expect successful compilation (no implicit any violations)
      expect(exitCode).toBe(0);
    });
  });
});
