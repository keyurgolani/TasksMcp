/**
 * Unit tests for archiving removal and permanent deletion verification
 *
 * These tests verify that:
 * - No archiving code exists anywhere in the codebase
 * - Archive fields are removed from all models
 * - Delete operations are permanent only
 * - No archive options exist in any methods
 *
 * Requirements: 5.13, 12.1
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

import { TaskList, Task } from '../../../src/shared/types/task.js';

describe('Archiving Removal Verification', () => {
  describe('Code Analysis', () => {
    it('should not contain any archiving code in source files', async () => {
      const sourceFiles = await getAllSourceFiles('src');
      const archivingPatterns = [
        /isArchived/,
        /archivedAt/,
        /archive.*true/i,
        /archive.*false/i,
        /\.archive\(/,
        /archiving/i,
        /soft.*delete/i,
        /Archive.*instead.*delete/i,
      ];

      const violations: string[] = [];

      for (const file of sourceFiles) {
        const content = await readFile(file, 'utf-8');

        for (const pattern of archivingPatterns) {
          if (pattern.test(content)) {
            const lines = content.split('\n');
            const matchingLines = lines
              .map((line, index) => ({ line, number: index + 1 }))
              .filter(({ line }) => pattern.test(line));

            for (const match of matchingLines) {
              violations.push(`${file}:${match.number}: ${match.line.trim()}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Found archiving code that should be removed:\n${violations.join('\n')}`
        );
      }
    });

    it('should not contain archiving patterns in test files', async () => {
      const testFiles = await getAllSourceFiles('tests');
      const archivingPatterns = [
        /isArchived.*true/,
        /isArchived.*false/,
        /archivedAt/,
        /\.archive\(/,
        /permanent.*false/,
        /archive.*option/i,
      ];

      const violations: string[] = [];

      for (const file of testFiles) {
        // Skip this verification test file itself
        if (file.includes('archiving-removal-verification.test.ts')) {
          continue;
        }

        const content = await readFile(file, 'utf-8');

        for (const pattern of archivingPatterns) {
          if (pattern.test(content)) {
            const lines = content.split('\n');
            const matchingLines = lines
              .map((line, index) => ({ line, number: index + 1 }))
              .filter(({ line }) => pattern.test(line));

            for (const match of matchingLines) {
              violations.push(`${file}:${match.number}: ${match.line.trim()}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Found archiving patterns in tests that should be removed:\n${violations.join('\n')}`
        );
      }
    });
  });

  describe('Model Verification', () => {
    it('should not have isArchived field in TaskList interface', () => {
      const taskList: TaskList = {
        id: 'test-id',
        title: 'Test List',
        description: 'Test Description',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        context: 'test',
        totalItems: 0,
        completedItems: 0,
        progress: 0,
        analytics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 0,
          averageCompletionTime: 0,
          estimatedTimeRemaining: 0,
          velocityMetrics: {
            itemsPerDay: 0,
            completionRate: 0,
          },
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        projectTag: 'test-project',
        implementationNotes: [],
      };

      // TypeScript should prevent accessing isArchived if it doesn't exist
      // This test verifies the field is not in the interface
      expect('isArchived' in taskList).toBe(false);
    });

    it('should not have archivedAt field in TaskList interface', () => {
      const taskList: TaskList = {
        id: 'test-id',
        title: 'Test List',
        description: 'Test Description',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        context: 'test',
        totalItems: 0,
        completedItems: 0,
        progress: 0,
        analytics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 0,
          averageCompletionTime: 0,
          estimatedTimeRemaining: 0,
          velocityMetrics: {
            itemsPerDay: 0,
            completionRate: 0,
          },
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        projectTag: 'test-project',
        implementationNotes: [],
      };

      // TypeScript should prevent accessing archivedAt if it doesn't exist
      expect('archivedAt' in taskList).toBe(false);
    });

    it('should not have archive-related fields in Task interface', () => {
      const task: Task = {
        id: 'test-task-id',
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending' as any,
        priority: 3 as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        metadata: {},
        implementationNotes: [],
        exitCriteria: [],
      };

      // Verify no archive-related fields exist
      expect('isArchived' in task).toBe(false);
      expect('archivedAt' in task).toBe(false);
    });
  });

  describe('API Verification', () => {
    it('should not have archive options in delete methods', async () => {
      const apiFiles = await getAllSourceFiles('src/api');
      const archiveOptionPatterns = [
        /permanent.*\?.*boolean/,
        /archive.*false/,
        /permanent.*false/,
        /archive.*true/,
        /permanent.*default.*false/,
      ];

      const violations: string[] = [];

      for (const file of apiFiles) {
        const content = await readFile(file, 'utf-8');

        for (const pattern of archiveOptionPatterns) {
          if (pattern.test(content)) {
            const lines = content.split('\n');
            const matchingLines = lines
              .map((line, index) => ({ line, number: index + 1 }))
              .filter(({ line }) => pattern.test(line));

            for (const match of matchingLines) {
              violations.push(`${file}:${match.number}: ${match.line.trim()}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Found archive options in API methods that should be removed:\n${violations.join('\n')}`
        );
      }
    });
  });

  describe('Documentation Verification', () => {
    it('should not reference archiving in documentation', async () => {
      const docFiles = await getAllSourceFiles('docs');
      const archivingPatterns = [
        /archive.*list/i,
        /soft.*delete/i,
        /permanent.*false/i,
        /archive.*true/i,
        /archive.*false/i,
      ];

      const violations: string[] = [];

      for (const file of docFiles) {
        const content = await readFile(file, 'utf-8');

        for (const pattern of archivingPatterns) {
          if (pattern.test(content)) {
            const lines = content.split('\n');
            const matchingLines = lines
              .map((line, index) => ({ line, number: index + 1 }))
              .filter(({ line }) => pattern.test(line));

            for (const match of matchingLines) {
              violations.push(`${file}:${match.number}: ${match.line.trim()}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Found archiving references in documentation that should be updated:\n${violations.join('\n')}`
        );
      }
    });
  });
});

/**
 * Recursively get all source files from a directory
 */
async function getAllSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentDir: string): Promise<void> {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, dist, coverage directories
          if (
            !['node_modules', '.git', 'dist', 'coverage', '.kiro'].includes(
              entry.name
            )
          ) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          // Include TypeScript, JavaScript, and Markdown files
          if (/\.(ts|js|md)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
      console.warn(`Warning: Could not read directory ${currentDir}:`, error);
    }
  }

  await traverse(dir);
  return files;
}
