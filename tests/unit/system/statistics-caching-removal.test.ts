/**
 * Unit tests for statistics, caching, and suggestion systems removal verification
 *
 * This test suite verifies that all prohibited features have been completely removed:
 * - Statistics management code
 * - Caching systems and dependencies
 * - Suggestion features
 * - Bulk operations from MCP (but available in orchestration)
 * - Multiple task display formats (only one simple format)
 *
 * Requirements: 5.11, 5.12, 5.13, 5.14, 5.15, 12.1
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { glob } from 'glob';
import { describe, it, expect } from 'vitest';

import { MCP_TOOLS } from '../../../src/api/tools/definitions.js';

describe('Statistics, Caching, and Suggestion Systems Removal', () => {
  const srcDir = join(process.cwd(), 'src');
  const packageJsonPath = join(process.cwd(), 'package.json');

  describe('Statistics Management Removal', () => {
    it('should not have any statistics management code in source files', async () => {
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });
      const statisticsPatterns = [
        /statistics|Statistics/,
        /getStats\(/,
        /calculateStats/,
        /projectStatistics/,
        /getProjectStatistics/,
        /errorStatistics/,
        /getErrorStatistics/,
        /taskStatistics/,
        /calculateTaskStatistics/,
        /indexStats/,
        /getIndexStats/,
        /cacheStats/,
        /getCacheStats/,
        /storageStats/,
        /getStorageStats/,
      ];

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        const matches: string[] = [];
        for (const pattern of statisticsPatterns) {
          const patternMatches = content.match(pattern);
          if (patternMatches) {
            matches.push(...patternMatches);
          }
        }

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      if (violatingFiles.length > 0) {
        const errorMessage = violatingFiles
          .map(({ file, matches }) => `${file}: ${matches.join(', ')}`)
          .join('\n');
        throw new Error(
          `Statistics management code found in:\n${errorMessage}`
        );
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should not have statistics-related interfaces or types', async () => {
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });
      const statisticsTypePatterns = [
        /interface.*Stats/,
        /type.*Statistics/,
        /ProjectStats/,
        /IndexStats/,
        /CacheStats/,
        /StorageStats/,
        /ErrorStats/,
      ];

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        const matches: string[] = [];
        for (const pattern of statisticsTypePatterns) {
          const patternMatches = content.match(pattern);
          if (patternMatches) {
            matches.push(...patternMatches);
          }
        }

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });
  });

  describe('Caching Systems Removal', () => {
    it('should not have any caching code in source files', async () => {
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });
      const cachingPatterns = [
        /cache|Cache/,
        /caching/,
        /cacheManager/,
        /CacheManager/,
        /getCache/,
        /setCache/,
        /clearCache/,
        /invalidateCache/,
        /cacheKey/,
        /cached/,
        /\.cache\./,
        /listCache/,
        /taskCache/,
        /summaryCache/,
      ];

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        const matches: string[] = [];
        for (const pattern of cachingPatterns) {
          const patternMatches = content.match(pattern);
          if (patternMatches) {
            matches.push(...patternMatches);
          }
        }

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      if (violatingFiles.length > 0) {
        const errorMessage = violatingFiles
          .map(({ file, matches }) => `${file}: ${matches.join(', ')}`)
          .join('\n');
        throw new Error(`Caching code found in:\n${errorMessage}`);
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should not have cache-related dependencies in package.json', () => {
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies,
      };

      const cacheRelatedPackages = [
        'node-cache',
        'memory-cache',
        'redis',
        'memcached',
        'lru-cache',
        'cache-manager',
        'keyv',
        'flat-cache',
      ];

      const foundCachePackages = cacheRelatedPackages.filter(
        pkg => allDependencies[pkg] !== undefined
      );

      expect(foundCachePackages).toHaveLength(0);
    });

    it('should not have cache-related files or directories', async () => {
      const cacheFiles = await glob('**/cache*.ts', { cwd: srcDir });
      const cacheDirectories = await glob('**/cache/', { cwd: srcDir });

      expect(cacheFiles).toHaveLength(0);
      expect(cacheDirectories).toHaveLength(0);
    });
  });

  describe('Suggestion Features Removal', () => {
    it('should not have any suggestion functionality in source files', async () => {
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });
      // Only look for actual suggestion functionality, not documentation references
      const suggestionFunctionPatterns = [
        /suggestTaskCompletion/,
        /taskSuggestion/,
        /getSuggestion/,
        /generateSuggestion/,
        /recommendTask/,
        /taskRecommendation/,
        /suggestTaskStatusUpdate/,
        /suggestNextTask/,
        /generateCleanupSuggestions/,
      ];

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        const matches: string[] = [];
        for (const pattern of suggestionFunctionPatterns) {
          const patternMatches = content.match(pattern);
          if (patternMatches) {
            matches.push(...patternMatches);
          }
        }

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      if (violatingFiles.length > 0) {
        const errorMessage = violatingFiles
          .map(({ file, matches }) => `${file}: ${matches.join(', ')}`)
          .join('\n');
        throw new Error(`Suggestion functionality found in:\n${errorMessage}`);
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should not have suggestion-related methods or functions', async () => {
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });
      const suggestionMethodPatterns = [
        /suggestTaskCompletionReadiness/,
        /generateCleanupSuggestions/,
        /getTaskSuggestions/,
        /suggestNextTask/,
        /recommendAction/,
      ];

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        const matches: string[] = [];
        for (const pattern of suggestionMethodPatterns) {
          const patternMatches = content.match(pattern);
          if (patternMatches) {
            matches.push(...patternMatches);
          }
        }

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });
  });

  describe('Multiple Task Display Formats Removal', () => {
    it('should only have one simple task display format', () => {
      const showTasksTool = MCP_TOOLS.find(tool => tool.name === 'show_tasks');
      expect(showTasksTool).toBeDefined();

      if (
        showTasksTool &&
        showTasksTool.inputSchema &&
        typeof showTasksTool.inputSchema === 'object' &&
        'properties' in showTasksTool.inputSchema &&
        showTasksTool.inputSchema.properties &&
        'format' in showTasksTool.inputSchema.properties
      ) {
        const formatProperty = showTasksTool.inputSchema.properties.format;

        if (
          typeof formatProperty === 'object' &&
          formatProperty !== null &&
          'enum' in formatProperty
        ) {
          // Should only have one format option, not multiple
          expect(Array.isArray(formatProperty.enum)).toBe(true);
          expect((formatProperty.enum as string[]).length).toBe(1);
          expect((formatProperty.enum as string[])[0]).toBe('detailed');
        }
      }
    });

    it('should not have multiple format handling in show tasks handler', async () => {
      const showTasksHandlerPath = join(srcDir, 'api/handlers/show-tasks.ts');

      if (existsSync(showTasksHandlerPath)) {
        const content = readFileSync(showTasksHandlerPath, 'utf-8');

        // Should not have multiple format branches
        const formatBranches = [
          /format === 'compact'/,
          /format === 'summary'/,
          /format === 'detailed'/,
        ];

        let formatBranchCount = 0;
        for (const pattern of formatBranches) {
          if (pattern.test(content)) {
            formatBranchCount++;
          }
        }

        // Should only have one format handling (detailed)
        expect(formatBranchCount).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Cleanup Verification', () => {
    it('should not have any cleanup suggestion code', async () => {
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });
      const cleanupPatterns = [
        /cleanup.*suggestion/i,
        /suggest.*cleanup/i,
        /cleanupSuggestion/,
        /generateCleanup/,
        /recommendCleanup/,
      ];

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        const matches: string[] = [];
        for (const pattern of cleanupPatterns) {
          const patternMatches = content.match(pattern);
          if (patternMatches) {
            matches.push(...patternMatches);
          }
        }

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should have successfully removed prohibited features', async () => {
      // This test verifies that the removal process was successful
      // by confirming that no prohibited functionality remains
      const sourceFiles = await glob('**/*.ts', { cwd: srcDir });

      // Verify no prohibited functionality exists
      let prohibitedFeaturesFound = false;
      const prohibitedPatterns = [
        /class.*Statistics.*Manager/,
        /interface.*Statistics/,
        /class.*Cache.*Manager/,
        /interface.*Cache/,
        /suggestTaskStatusUpdate/,
        /generateCleanupSuggestions/,
      ];

      for (const file of sourceFiles) {
        const filePath = join(srcDir, file);
        const content = readFileSync(filePath, 'utf-8');

        for (const pattern of prohibitedPatterns) {
          if (pattern.test(content)) {
            prohibitedFeaturesFound = true;
            break;
          }
        }

        if (prohibitedFeaturesFound) break;
      }

      // Should have no prohibited features remaining
      expect(prohibitedFeaturesFound).toBe(false);
    });
  });
});
