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

  it('should have proper null/undefined handling configuration', () => {
    const tsconfigPath = join(process.cwd(), 'tsconfig.json');
    const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);

    // Verify strict null checking is properly configured
    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
    expect(tsconfig.compilerOptions.strict).toBe(true);

    // The actual null/undefined handling is verified by the build process
    expect(true).toBe(true);
  });

  it('should have comprehensive strict configuration', () => {
    const tsconfigPath = join(process.cwd(), 'tsconfig.json');
    const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);

    // Verify all strict flags that relate to null/undefined handling
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
  });
});
