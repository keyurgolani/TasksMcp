import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('TypeScript strictNullChecks enforcement', () => {
  it('should have strictNullChecks enabled in tsconfig.json', () => {
    const tsconfigPath = join(process.cwd(), 'tsconfig.json');
    expect(existsSync(tsconfigPath)).toBe(true);

    const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);

    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
  });

  it('should have no null/undefined violations when compiling with strictNullChecks', () => {
    // Run TypeScript compiler with strictNullChecks explicitly enabled
    // This should pass without errors if there are no violations
    expect(() => {
      execSync('npx tsc --noEmit --strictNullChecks', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
    }).not.toThrow();
  });

  it('should handle null/undefined explicitly in the codebase', () => {
    // Test that the codebase uses proper null/undefined handling patterns
    // Check that TypeScript compilation succeeds with all strict flags
    expect(() => {
      execSync('npx tsc --noEmit --strict --strictNullChecks --noImplicitAny', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
    }).not.toThrow();
  });
});
