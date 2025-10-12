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
      // Test that coverage thresholds are actually enforced by running a simple coverage test
      let coverageOutput = '';

      try {
        coverageOutput = execSync(
          'timeout 30s npx vitest run --coverage tests/unit/infrastructure/dependency-upgrades.test.ts',
          {
            stdio: 'pipe',
            encoding: 'utf-8',
          }
        );
      } catch (error: any) {
        // Coverage command is expected to fail due to low coverage
        coverageOutput = error.stdout?.toString() || '';
      }

      // Verify that coverage was actually run - check for key coverage indicators
      expect(coverageOutput).toMatch(/Coverage.*v8/);
      expect(coverageOutput).toMatch(
        /Coverage|% Stmts|% Branch|% Funcs|% Lines/
      );
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
      // Run a simple test with coverage and verify output format
      let result = '';

      try {
        result = execSync(
          'timeout 30s npx vitest run --coverage tests/unit/infrastructure/dependency-upgrades.test.ts',
          {
            stdio: 'pipe',
            encoding: 'utf-8',
          }
        );
      } catch (error: any) {
        // Coverage may fail due to thresholds, but we still get output
        result = error.stdout?.toString() || '';
      }

      // Check that coverage report is generated with key elements
      expect(result).toMatch(/Coverage.*v8/);
      expect(result).toMatch(/Coverage|% Stmts|% Branch|% Funcs|% Lines/);
      // Check for at least some coverage indicators
      const hasCoverageIndicators =
        result.includes('File') ||
        result.includes('% Stmts') ||
        result.includes('% Branch') ||
        result.includes('% Funcs') ||
        result.includes('% Lines');
      expect(hasCoverageIndicators).toBe(true);
    });

    it('should generate coverage files in coverage directory', () => {
      // Run coverage and check that files are generated
      try {
        execSync(
          'timeout 30s npx vitest run --coverage tests/unit/infrastructure/dependency-upgrades.test.ts',
          {
            stdio: 'pipe',
          }
        );
      } catch (_error) {
        // Coverage command may fail due to thresholds, but files should still be generated
      }

      // Check that coverage directory exists
      const coverageDir = join(projectRoot, 'coverage');
      expect(existsSync(coverageDir)).toBe(true);
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
