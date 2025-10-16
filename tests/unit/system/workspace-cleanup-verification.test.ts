import { existsSync } from 'fs';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';

import { describe, it, expect } from 'vitest';

describe('Workspace Cleanup Verification', () => {
  const workspaceRoot = process.cwd();
  const excludedDirectories = [
    'node_modules',
    '.git',
    'dist',
    'coverage',
    '.nyc_output',
    '.vite',
    '.cache',
    'logs',
  ];

  /**
   * Recursively get all files in a directory, excluding specified directories
   */
  async function getAllFiles(
    dir: string,
    excludeDirs: string[] = []
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          if (!excludeDirs.includes(entry)) {
            const subFiles = await getAllFiles(fullPath, excludeDirs);
            files.push(...subFiles);
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories that can't be read
    }

    return files;
  }

  describe('Temporary and Backup Files', () => {
    it('should not contain any temporary files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const temporaryFilePatterns = [
        /\.tmp$/i,
        /\.temp$/i,
        /\.swp$/i,
        /\.swo$/i,
        /~$/,
        /\.DS_Store$/i,
        /Thumbs\.db$/i,
        /\.log$/i,
      ];

      const temporaryFiles = allFiles.filter(file =>
        temporaryFilePatterns.some(pattern => pattern.test(file))
      );

      expect(temporaryFiles).toEqual([]);
    });

    it('should not contain any backup files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const backupFilePatterns = [
        /\.bak$/i,
        /\.backup$/i,
        /\.orig$/i,
        /\.old$/i,
        /\.save$/i,
        /\.copy$/i,
        /\.(ts|js|json|md)\.bak$/i,
      ];

      const backupFiles = allFiles.filter(file =>
        backupFilePatterns.some(pattern => pattern.test(file))
      );

      expect(backupFiles).toEqual([]);
    });

    it('should not contain editor temporary files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const editorTempPatterns = [
        /\.#/,
        /#.*#$/,
        /\.vscode\/.*\.log$/,
        /\.idea\/.*\.log$/,
      ];

      const editorTempFiles = allFiles.filter(file =>
        editorTempPatterns.some(pattern => pattern.test(file))
      );

      expect(editorTempFiles).toEqual([]);
    });
  });

  describe('Dead Code and Unused Files', () => {
    it('should not contain unused TypeScript files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);
      const tsFiles = allFiles.filter(file => extname(file) === '.ts');

      // Files that should exist and are used
      const expectedFiles = [
        'src/index.ts',
        'tests/setup.ts',
        'vitest-config.ts',
      ];

      // Check that expected files exist
      for (const expectedFile of expectedFiles) {
        const fullPath = join(workspaceRoot, expectedFile);
        expect(existsSync(fullPath)).toBe(true);
      }

      // Check for common dead code patterns
      const deadCodePatterns = [
        /\.unused\./,
        /\.deprecated\./,
        /\.legacy\./,
        /\.old\./,
        /\.temp\./,
        /\.test-backup\./,
        /\.example-backup\./,
      ];

      const deadCodeFiles = tsFiles.filter(file =>
        deadCodePatterns.some(pattern => pattern.test(file))
      );

      expect(deadCodeFiles).toEqual([]);
    });

    it('should not contain unused JavaScript files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);
      const jsFiles = allFiles.filter(file => extname(file) === '.js');

      // Expected JS files (CLI files and scripts)
      const expectedJsFiles = ['mcp.js', 'rest.js'];

      // Filter out expected files and scripts directory
      const unexpectedJsFiles = jsFiles.filter(file => {
        const relativePath = file.replace(workspaceRoot + '/', '');
        return (
          !expectedJsFiles.some(expected => relativePath.endsWith(expected)) &&
          !relativePath.startsWith('scripts/') &&
          !relativePath.startsWith('examples/')
        );
      });

      // Should not have unexpected JS files in src or other main directories
      const srcJsFiles = unexpectedJsFiles.filter(
        file => file.includes('/src/') || file.includes('/tests/')
      );

      expect(srcJsFiles).toEqual([]);
    });

    it('should not contain duplicate or versioned files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const versionedFilePatterns = [
        /\.v\d+\./,
        /\.version\d+\./,
        /-v\d+\./,
        /-version\d+\./,
        /\.new\./,
        /\.copy\./,
        /-copy\./,
        /-new\./,
        /-backup\./,
        /-old\./,
      ];

      const versionedFiles = allFiles.filter(file =>
        versionedFilePatterns.some(pattern => pattern.test(file))
      );

      expect(versionedFiles).toEqual([]);
    });
  });

  describe('Removed Features Stub Files', () => {
    it('should not contain monitoring system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const monitoringPatterns = [
        /monitoring/i,
        /monitor/i,
        /metrics/i,
        /telemetry/i,
        /instrumentation/i,
      ];

      const monitoringFiles = allFiles.filter(file => {
        const hasMonitoringPattern = monitoringPatterns.some(pattern =>
          pattern.test(file)
        );
        const isExcluded =
          file.includes('node_modules') ||
          file.includes('.git') ||
          file.includes('removal.test.ts') || // Allow removal verification tests
          file.includes('validation-metrics.test.ts') || // Allow validation tests
          file.includes('cleanup-verification.test.ts'); // Allow cleanup tests

        return hasMonitoringPattern && !isExcluded;
      });

      expect(monitoringFiles).toEqual([]);
    });

    it('should not contain alerting system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const alertingPatterns = [
        /alerting/i,
        /alert/i,
        /notification/i,
        /notify/i,
      ];

      const alertingFiles = allFiles.filter(
        file =>
          alertingPatterns.some(pattern => pattern.test(file)) &&
          !file.includes('node_modules') &&
          !file.includes('.git')
      );

      expect(alertingFiles).toEqual([]);
    });

    it('should not contain intelligence system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const intelligencePatterns = [
        /intelligence/i,
        /suggestion/i,
        /recommend/i,
        /analysis/i,
        /complexity/i,
      ];

      const intelligenceFiles = allFiles.filter(file => {
        const hasIntelligencePattern = intelligencePatterns.some(pattern =>
          pattern.test(file)
        );
        const isExcluded =
          file.includes('node_modules') ||
          file.includes('.git') ||
          file.includes('docs/') || // Allow documentation
          file.includes('readme') || // Allow readme files
          file.includes('removal.test.ts') || // Allow removal verification tests
          file.includes('cleanup-verification.test.ts'); // Allow cleanup tests

        return hasIntelligencePattern && !isExcluded;
      });

      expect(intelligenceFiles).toEqual([]);
    });

    it('should not contain statistics system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const statisticsPatterns = [
        /statistics/i,
        /stats/i,
        /analytics/i,
        /reporting/i,
      ];

      const statisticsFiles = allFiles.filter(file => {
        const hasStatisticsPattern = statisticsPatterns.some(pattern =>
          pattern.test(file)
        );
        const isExcluded =
          file.includes('node_modules') ||
          file.includes('.git') ||
          file.includes('removal.test.ts') || // Allow removal verification tests
          file.includes('cleanup-verification.test.ts'); // Allow cleanup tests

        return hasStatisticsPattern && !isExcluded;
      });

      expect(statisticsFiles).toEqual([]);
    });

    it('should not contain caching system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const cachingPatterns = [
        /caching/i,
        /cache/i,
        /memoiz/i,
        /redis/i,
        /memcached/i,
      ];

      const cachingFiles = allFiles.filter(file => {
        const hasCachingPattern = cachingPatterns.some(pattern =>
          pattern.test(file)
        );
        const isExcluded =
          file.includes('node_modules') ||
          file.includes('.git') ||
          file.includes('.cache') || // Allow build cache directories
          file.includes('package-lock.json') || // Allow package lock
          file.includes('removal.test.ts') || // Allow removal verification tests
          file.includes('cleanup-verification.test.ts'); // Allow cleanup tests

        return hasCachingPattern && !isExcluded;
      });

      expect(cachingFiles).toEqual([]);
    });

    it('should not contain archiving system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const archivingPatterns = [/archiv/i, /archive/i, /archived/i];

      const archivingFiles = allFiles.filter(file => {
        const hasArchivingPattern = archivingPatterns.some(pattern =>
          pattern.test(file)
        );
        const isExcluded =
          file.includes('node_modules') ||
          file.includes('.git') ||
          file.includes('removal.test.ts') || // Allow removal verification tests
          file.includes('cleanup-verification.test.ts') || // Allow cleanup tests
          file.includes('verification.test.ts'); // Allow verification tests

        return hasArchivingPattern && !isExcluded;
      });

      expect(archivingFiles).toEqual([]);
    });

    it('should not contain task ordering system files', async () => {
      const allFiles = await getAllFiles(workspaceRoot, excludedDirectories);

      const orderingPatterns = [
        /ordering/i,
        /order/i,
        /sequence/i,
        /position/i,
        /index/i,
      ];

      const orderingFiles = allFiles.filter(file => {
        const hasOrderingPattern = orderingPatterns.some(pattern =>
          pattern.test(file)
        );
        const isExcluded =
          file.includes('node_modules') ||
          file.includes('.git') ||
          file.includes('index.ts') || // Allow index files
          file.includes('index.js') ||
          file.includes('data/indexes/') || // Allow data indexes
          file.includes('package.json') || // Allow package files
          file.includes('package-lock.json') ||
          file.includes('removal.test.ts') || // Allow removal verification tests
          file.includes('cleanup-verification.test.ts') || // Allow cleanup tests
          file.includes('import-order.test.ts') || // Allow import order tests
          file.includes('search-index-manager.ts'); // Allow search index functionality

        return hasOrderingPattern && !isExcluded;
      });

      expect(orderingFiles).toEqual([]);
    });
  });

  describe('Package Dependencies', () => {
    it('should contain only necessary dependencies', async () => {
      const packageJsonPath = join(workspaceRoot, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Expected production dependencies
      const expectedDependencies = [
        '@modelcontextprotocol/sdk',
        'cors',
        'express',
        'js-yaml',
        'uuid',
        'winston',
        'zod',
      ];

      // Expected development dependencies
      const expectedDevDependencies = [
        '@eslint/js',
        '@types/cors',
        '@types/express',
        '@types/js-yaml',
        '@types/node',
        '@types/supertest',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        '@vitest/coverage-v8',
        '@vitest/ui',
        'eslint',
        'eslint-plugin-import',
        'prettier',
        'supertest',
        'terser',
        'typescript',
        'vitest',
      ];

      // Check that all expected dependencies are present
      const actualDependencies = Object.keys(packageJson.dependencies || {});
      const actualDevDependencies = Object.keys(
        packageJson.devDependencies || {}
      );

      // Verify no unexpected dependencies
      const unexpectedDeps = actualDependencies.filter(
        dep => !expectedDependencies.includes(dep)
      );

      const unexpectedDevDeps = actualDevDependencies.filter(
        dep => !expectedDevDependencies.includes(dep)
      );

      expect(unexpectedDeps).toEqual([]);
      expect(unexpectedDevDeps).toEqual([]);

      // Verify all expected dependencies are present
      for (const expectedDep of expectedDependencies) {
        expect(actualDependencies).toContain(expectedDep);
      }

      for (const expectedDevDep of expectedDevDependencies) {
        expect(actualDevDependencies).toContain(expectedDevDep);
      }
    });

    it('should not contain removed feature dependencies', async () => {
      const packageJsonPath = join(workspaceRoot, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Dependencies that should not exist for removed features
      const prohibitedDependencies = [
        'redis',
        'memcached',
        'node-cache',
        'lru-cache',
        'prometheus-client',
        'prom-client',
        'statsd',
        'newrelic',
        'datadog',
        'sentry',
        'bugsnag',
        'rollbar',
        'winston-elasticsearch',
        'winston-mongodb',
        'elastic-apm-node',
        'opentelemetry',
        '@opentelemetry/api',
        '@opentelemetry/sdk-node',
        'jaeger-client',
        'zipkin',
        'express-rate-limit', // This is actually used, so remove from prohibited
        'helmet',
        'compression',
      ];

      // Remove express-rate-limit from prohibited as it's actually used
      const actualProhibitedDeps = prohibitedDependencies.filter(
        dep => dep !== 'express-rate-limit'
      );

      const foundProhibitedDeps = Object.keys(allDependencies).filter(dep =>
        actualProhibitedDeps.some(prohibited => dep.includes(prohibited))
      );

      expect(foundProhibitedDeps).toEqual([]);
    });

    it('should have appropriate dependency versions', async () => {
      const packageJsonPath = join(workspaceRoot, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Check that versions are not pinned to exact versions (should use ^ or ~)
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};

      const allDeps = { ...dependencies, ...devDependencies };

      // Most dependencies should use semantic versioning
      const exactVersionDeps = Object.entries(allDeps).filter(
        ([_name, version]) => {
          const versionStr = version as string;
          return (
            !versionStr.startsWith('^') &&
            !versionStr.startsWith('~') &&
            !versionStr.startsWith('>=') &&
            !versionStr.includes('||') &&
            versionStr !== 'latest'
          );
        }
      );

      // Allow some exact versions for critical dependencies if needed
      const allowedExactVersions: string[] = [];

      const unexpectedExactVersions = exactVersionDeps.filter(
        ([name]) => !allowedExactVersions.includes(name)
      );

      expect(unexpectedExactVersions).toEqual([]);
    });
  });

  describe('File System Organization', () => {
    it('should have clean directory structure', async () => {
      const rootEntries = await readdir(workspaceRoot);

      // Expected root-level directories
      const expectedDirectories = [
        '.git',
        '.github',
        '.kiro',
        '.vscode',
        'coverage', // Coverage reports directory
        'data',
        'dist',
        'docs',
        'examples',
        'logs',
        'node_modules',
        'scripts',
        'src',
        'tests',
      ];

      // Expected root-level files
      const expectedFiles = [
        '.env.example',
        '.gitignore',
        '.prettierignore',
        '.prettierrc.json',
        'agents.md',
        'contributing.md',
        'eslint.config.js',
        'LICENSE',
        'mcp.js',
        'package-lock.json',
        'package.json',
        'readme.md',
        'rest.js',
        'tsconfig.json',
        'version.json',
        'vitest-config.ts',
      ];

      // Check for unexpected root-level entries
      const unexpectedEntries = rootEntries.filter(
        entry =>
          !expectedDirectories.includes(entry) && !expectedFiles.includes(entry)
      );

      expect(unexpectedEntries).toEqual([]);
    });

    it('should not contain empty directories', async () => {
      const allDirectories: string[] = [];

      async function findDirectories(dir: string): Promise<void> {
        try {
          const entries = await readdir(dir);

          for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stats = await stat(fullPath);

            if (stats.isDirectory() && !excludedDirectories.includes(entry)) {
              allDirectories.push(fullPath);
              await findDirectories(fullPath);
            }
          }
        } catch {
          // Skip directories that can't be read
        }
      }

      await findDirectories(workspaceRoot);

      const emptyDirectories: string[] = [];

      for (const dir of allDirectories) {
        try {
          const entries = await readdir(dir);
          if (entries.length === 0) {
            emptyDirectories.push(dir);
          }
        } catch {
          // Skip directories that can't be read
        }
      }

      // Allow some empty directories that are expected
      const allowedEmptyDirectories = [
        join(workspaceRoot, 'logs'), // May be empty initially
      ];

      const unexpectedEmptyDirectories = emptyDirectories.filter(
        dir =>
          !allowedEmptyDirectories.includes(dir) &&
          !dir.includes('.git') &&
          !dir.includes('node_modules')
      );

      expect(unexpectedEmptyDirectories).toEqual([]);
    });
  });

  describe('Configuration Files', () => {
    it('should have clean configuration files without temporary settings', async () => {
      const configFiles = [
        'tsconfig.json',
        'eslint.config.js',
        '.prettierrc.json',
        'vitest-config.ts',
        'package.json',
      ];

      for (const configFile of configFiles) {
        const filePath = join(workspaceRoot, configFile);
        if (existsSync(filePath)) {
          const content = await readFile(filePath, 'utf-8');

          // Check for temporary or debug configurations
          const temporaryPatterns = [
            /\/\/\s*TASK:/i,
            /\/\/\s*FIXME:/i,
            /\/\/\s*HACK:/i,
            /\/\/\s*DEBUG:/i,
            /\/\/\s*TEMP:/i,
            /\/\*\s*TASK:/i,
            /\/\*\s*FIXME:/i,
            /\/\*\s*HACK:/i,
            /\/\*\s*DEBUG:/i,
            /\/\*\s*TEMP:/i,
            /"debug":\s*true/i,
            /"verbose":\s*true/i,
          ];

          const hasTemporaryConfig = temporaryPatterns.some(pattern =>
            pattern.test(content)
          );

          expect(hasTemporaryConfig).toBe(false);
        }
      }
    });

    it('should not contain development-only configuration overrides', async () => {
      const configFiles = [
        'tsconfig.json',
        'eslint.config.js',
        'vitest-config.ts',
      ];

      for (const configFile of configFiles) {
        const filePath = join(workspaceRoot, configFile);
        if (existsSync(filePath)) {
          const content = await readFile(filePath, 'utf-8');

          // Check for development-only overrides that should be removed
          const devOnlyPatterns = [
            /skipLibCheck:\s*false/i, // Should be true for production
            /strict:\s*false/i, // Should be true
            /noImplicitAny:\s*false/i, // Should be true
            /allowJs:\s*true/i, // Should be false for TypeScript projects
          ];

          const hasDevOnlyConfig = devOnlyPatterns.some(pattern =>
            pattern.test(content)
          );

          expect(hasDevOnlyConfig).toBe(false);
        }
      }
    });
  });
});
