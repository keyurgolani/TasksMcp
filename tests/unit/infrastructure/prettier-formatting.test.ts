import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

import { describe, it, expect } from 'vitest';

describe('Prettier Formatting Compliance', () => {
  it('should have Prettier configuration file', () => {
    const prettierConfigPaths = [
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.js',
      '.prettierrc.mjs',
      '.prettierrc.cjs',
      '.prettierrc.yaml',
      '.prettierrc.yml',
      'prettier.config.js',
      'prettier.config.mjs',
      'prettier.config.cjs',
    ];

    const hasConfig = prettierConfigPaths.some(path => existsSync(path));
    expect(hasConfig).toBe(true);
  });

  it('should have Prettier installed as dependency', () => {
    const packageJsonPath = 'package.json';
    expect(existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const hasPrettier =
      (packageJson.dependencies && packageJson.dependencies.prettier) ||
      (packageJson.devDependencies && packageJson.devDependencies.prettier);

    expect(hasPrettier).toBeTruthy();
  });

  it('should have format scripts in package.json', () => {
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.format).toBeDefined();
    expect(packageJson.scripts['format:check']).toBeDefined();
  });

  it('should format TypeScript files consistently', () => {
    try {
      // Run prettier check on TypeScript files
      execSync('npx prettier --check "src/**/*.ts"', {
        stdio: 'pipe',
        timeout: 30000,
      });
    } catch (_error) {
      // If prettier check fails, it means files are not formatted
      expect.fail('TypeScript files are not properly formatted with Prettier');
    }
  });

  it('should format test files consistently', () => {
    try {
      // Run prettier check on test files
      execSync('npx prettier --check "tests/**/*.ts"', {
        stdio: 'pipe',
        timeout: 30000,
      });
    } catch (_error) {
      // If prettier check fails, it means files are not formatted
      expect.fail('Test files are not properly formatted with Prettier');
    }
  });

  it('should format JavaScript files consistently', () => {
    try {
      // Run prettier check on JavaScript files
      execSync('npx prettier --check "scripts/**/*.js" "*.js"', {
        stdio: 'pipe',
        timeout: 30000,
      });
    } catch (_error) {
      // If prettier check fails, it means files are not formatted
      expect.fail('JavaScript files are not properly formatted with Prettier');
    }
  });

  it('should format JSON files consistently', () => {
    try {
      // Run prettier check on JSON files
      execSync(
        'npx prettier --check "*.json" "**/*.json" --ignore-path .gitignore',
        {
          stdio: 'pipe',
          timeout: 30000,
        }
      );
    } catch (_error) {
      // If prettier check fails, it means files are not formatted
      expect.fail('JSON files are not properly formatted with Prettier');
    }
  });

  it('should format Markdown files consistently', () => {
    try {
      // Run prettier check on Markdown files
      execSync(
        'npx prettier --check "*.md" "**/*.md" --ignore-path .gitignore',
        {
          stdio: 'pipe',
          timeout: 30000,
        }
      );
    } catch (_error) {
      // If prettier check fails, it means files are not formatted
      expect.fail('Markdown files are not properly formatted with Prettier');
    }
  });

  it('should have consistent Prettier configuration', () => {
    const prettierConfigPath = '.prettierrc.json';
    expect(existsSync(prettierConfigPath)).toBe(true);

    const config = JSON.parse(readFileSync(prettierConfigPath, 'utf-8'));

    // Verify essential formatting rules are configured
    expect(config).toHaveProperty('semi');
    expect(config).toHaveProperty('singleQuote');
    expect(config).toHaveProperty('tabWidth');
    expect(config).toHaveProperty('trailingComma');
    expect(config).toHaveProperty('printWidth');
  });

  it('should integrate Prettier with development workflow', () => {
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Check that format scripts are properly configured
    expect(packageJson.scripts.format).toContain('prettier');
    expect(packageJson.scripts['format:check']).toContain('prettier');

    // Verify format scripts don't just echo placeholder messages
    expect(packageJson.scripts.format).not.toContain('No formatter configured');
    expect(packageJson.scripts['format:check']).not.toContain(
      'No formatter configured'
    );
  });

  it('should have .prettierignore file for excluding files', () => {
    const prettierIgnorePath = '.prettierignore';
    expect(existsSync(prettierIgnorePath)).toBe(true);

    const ignoreContent = readFileSync(prettierIgnorePath, 'utf-8');

    // Verify common directories are ignored
    expect(ignoreContent).toContain('node_modules');
    expect(ignoreContent).toContain('dist');
    expect(ignoreContent).toContain('coverage');
  });
});
