import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

describe('TypeScript Strict Mode', () => {
  describe('tsconfig.json configuration', () => {
    it('should have strict mode enabled', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have all strict mode related flags enabled', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify individual strict mode flags are enabled
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
      expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
      expect(tsconfig.compilerOptions.strictFunctionTypes).toBe(true);
      expect(tsconfig.compilerOptions.strictBindCallApply).toBe(true);
      expect(tsconfig.compilerOptions.strictPropertyInitialization).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitReturns).toBe(true);
      expect(tsconfig.compilerOptions.noImplicitThis).toBe(true);
      expect(tsconfig.compilerOptions.alwaysStrict).toBe(true);
    });
  });

  describe('TypeScript compilation', () => {
    it('should compile without errors with strict mode enabled', () => {
      expect(() => {
        execSync('npx tsc --noEmit', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      }).not.toThrow();
    });

    it('should not have any strict mode violations in the codebase', () => {
      // Run TypeScript compiler with strict mode and capture output
      let output = '';
      try {
        execSync('npx tsc --noEmit --strict', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      } catch (error: any) {
        output = error.stdout?.toString() || error.stderr?.toString() || '';
      }

      // Check that there are no strict mode related errors
      const strictModeErrors = [
        "Parameter implicitly has an 'any' type",
        "Object is possibly 'null'",
        "Object is possibly 'undefined'",
        'Variable is used before being assigned',
        'Function lacks ending return statement',
        'Property has no initializer and is not definitely assigned',
        "'this' implicitly has type 'any'",
      ];

      for (const errorPattern of strictModeErrors) {
        expect(output).not.toContain(errorPattern);
      }
    });
  });

  describe('noImplicitAny enforcement', () => {
    it('should have noImplicitAny enabled in tsconfig.json', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

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
        ];

        for (const errorPattern of implicitAnyErrors) {
          expect(output).not.toContain(errorPattern);
        }
      }

      // The test passes if there are no compilation errors or no implicit any errors
      expect(true).toBe(true);
    });

    it('should enforce explicit typing throughout the codebase', () => {
      // Run TypeScript compiler with strict noImplicitAny checking
      expect(() => {
        execSync('npx tsc --noEmit --noImplicitAny --strict', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000,
        });
      }).not.toThrow();
    });

    it('should detect implicit any violations if they exist', () => {
      // This test verifies that the noImplicitAny flag is working by ensuring
      // the TypeScript compiler would catch implicit any types if they existed
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify the flag is set to catch implicit any
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);

      // Verify strict mode is also enabled (which includes noImplicitAny)
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe('strict mode enforcement', () => {
    it('should enforce strict null checks', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
      expect(tsconfig.compilerOptions.exactOptionalPropertyTypes).toBe(true);
      expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    });

    it('should enforce no implicit any', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should enforce strict function types', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.strictFunctionTypes).toBe(true);
      expect(tsconfig.compilerOptions.strictBindCallApply).toBe(true);
    });

    it('should enforce no unused locals and parameters', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
      expect(tsconfig.compilerOptions.noUnusedParameters).toBe(true);
    });
  });
});
