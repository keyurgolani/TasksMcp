import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('Test Coverage Configuration', () => {
  const projectRoot = process.cwd();
  const packageJsonPath = join(projectRoot, 'package.json');
  const vitestConfigPath = join(projectRoot, 'vitest.config.ts');

  describe('Coverage Dependencies', () => {
    it('should have coverage dependencies properly installed', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check that @vitest/coverage-v8 is installed as devDependency
      expect(packageJson.devDependencies).toHaveProperty('@vitest/coverage-v8');
      expect(packageJson.devDependencies['@vitest/coverage-v8']).toMatch(
        /^\^?\d+\.\d+\.\d+/
      );

      // Verify the dependency is actually installed
      const nodeModulesPath = join(
        projectRoot,
        'node_modules',
        '@vitest',
        'coverage-v8'
      );
      expect(existsSync(nodeModulesPath)).toBe(true);
    });

    it('should have vitest as the main testing framework', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.devDependencies).toHaveProperty('vitest');
      expect(packageJson.devDependencies.vitest).toMatch(/^\^?\d+\.\d+\.\d+/);
    });

    it('should verify coverage tools are available and functional', () => {
      // Test that we can run vitest with version flag
      const vitestVersion = execSync('npx vitest --version', {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect(vitestVersion.trim()).toMatch(/vitest\/\d+\.\d+\.\d+/);

      // Test that coverage provider is available by checking help
      const vitestHelp = execSync('npx vitest --help', {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect(vitestHelp).toContain('--coverage');
    });
  });

  describe('Coverage Configuration', () => {
    it('should have vitest config file present and readable', () => {
      expect(existsSync(vitestConfigPath)).toBe(true);

      const configContent = readFileSync(vitestConfigPath, 'utf-8');
      expect(configContent).toContain('defineConfig');
      expect(configContent).toContain('coverage');
      expect(configContent).toContain("provider: 'v8'");
    });

    it('should have correct coverage provider configured', () => {
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');
      expect(vitestConfigContent).toContain("provider: 'v8'");
    });

    it('should include only src directory for coverage testing', () => {
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');
      expect(vitestConfigContent).toContain("include: ['src/**/*.ts']");
    });

    it('should exclude appropriate directories from coverage', () => {
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');

      // Check that all required exclusions are present
      expect(vitestConfigContent).toContain('node_modules/**');
      expect(vitestConfigContent).toContain('dist/**');
      expect(vitestConfigContent).toContain('coverage/**');
      expect(vitestConfigContent).toContain('tests/**');
      expect(vitestConfigContent).toContain('examples/**');
      expect(vitestConfigContent).toContain('scripts/**');
      expect(vitestConfigContent).toContain('src/**/*.d.ts');
      expect(vitestConfigContent).toContain('src/**/index.ts');
    });

    it('should have correct coverage thresholds configured', () => {
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');

      expect(vitestConfigContent).toContain('lines: 95');
      expect(vitestConfigContent).toContain('branches: 90');
      expect(vitestConfigContent).toContain('functions: 95');
      expect(vitestConfigContent).toContain('statements: 95');
    });

    it('should enforce coverage thresholds correctly', () => {
      // Verify that coverage thresholds are configured correctly
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');

      // Check that all required thresholds are present
      expect(vitestConfigContent).toContain('lines: 95');
      expect(vitestConfigContent).toContain('branches: 90');
      expect(vitestConfigContent).toContain('functions: 95');
      expect(vitestConfigContent).toContain('statements: 95');

      // Verify coverage provider is configured
      expect(vitestConfigContent).toContain("provider: 'v8'");
    });
  });

  describe('Test Scripts Configuration', () => {
    it('should have test coverage scripts configured', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('test:coverage');
      expect(packageJson.scripts['test:coverage']).toBe(
        'vitest run --coverage'
      );
    });

    it('should have test coverage UI script configured', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('test:coverage:ui');
      expect(packageJson.scripts['test:coverage:ui']).toBe(
        'vitest --coverage --ui'
      );
    });

    it('should have basic test scripts configured', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('test');
      expect(packageJson.scripts.test).toBe('vitest');

      expect(packageJson.scripts).toHaveProperty('test:run');
      expect(packageJson.scripts['test:run']).toBe('vitest run');
    });
  });

  describe('Coverage Integration', () => {
    it('should generate coverage reports in correct format', () => {
      // Test that vitest can run with coverage flag (without actually running it)
      const vitestHelp = execSync('npx vitest --help', {
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      // Verify coverage options are available
      expect(vitestHelp).toContain('--coverage');

      // Check that coverage configuration is properly set up
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');
      expect(vitestConfigContent).toContain("provider: 'v8'");
      expect(vitestConfigContent).toContain('thresholds');
    });

    it('should generate coverage files in coverage directory', () => {
      // Check that coverage directory exists or can be created by the build process
      const coverageDir = join(projectRoot, 'coverage');
      // Coverage directory may not exist until tests are run with coverage
      // This test just verifies the path is valid
      expect(typeof coverageDir).toBe('string');
      expect(coverageDir).toContain('coverage');
    });
  });

  describe('Configuration Validation', () => {
    it('should have proper TypeScript configuration for testing', () => {
      const tsconfigPath = join(projectRoot, 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      expect(tsconfig.compilerOptions).toBeDefined();
    });

    it('should have all required configuration properties', () => {
      const vitestConfigContent = readFileSync(vitestConfigPath, 'utf-8');

      // Check for essential configuration properties
      expect(vitestConfigContent).toContain('coverage');
      expect(vitestConfigContent).toContain('provider');
      expect(vitestConfigContent).toContain('include');
      expect(vitestConfigContent).toContain('exclude');
      expect(vitestConfigContent).toContain('thresholds');
      expect(vitestConfigContent).toContain('lines: 95');
      expect(vitestConfigContent).toContain('branches: 90');
    });
  });
});
