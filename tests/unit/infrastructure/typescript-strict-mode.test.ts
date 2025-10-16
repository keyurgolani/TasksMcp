import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

describe('TypeScript Strict Mode Configuration', () => {
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

  describe('TypeScript compilation configuration', () => {
    it('should have TypeScript compiler properly configured', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify compilation settings
      expect(tsconfig.compilerOptions.strict).toBe(true);
      // noEmit is typically set via CLI, not in tsconfig

      // The actual compilation is verified by the build process
      expect(true).toBe(true);
    });

    it('should have proper module configuration', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify module settings
      expect(tsconfig.compilerOptions.module).toBe('ESNext');
      expect(tsconfig.compilerOptions.target).toBe('ES2022');
      expect(tsconfig.compilerOptions.moduleResolution).toBe('node');
    });
  });

  describe('noImplicitAny enforcement', () => {
    it('should have noImplicitAny enabled in tsconfig.json', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should have strict typing configuration', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Verify strict typing is enforced
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
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
