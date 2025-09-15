/**
 * Unit tests for CleanupSuggestionManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CleanupSuggestionManager } from '../../../../src/domain/lists/cleanup-suggestion-manager.js';
import type { TodoList, CleanupSuggestion } from '../../../../src/shared/types/todo.js';
import { TaskStatus } from '../../../../src/shared/types/todo.js';

describe('CleanupSuggestionManager', () => {
  let manager: CleanupSuggestionManager;
  let mockTodoLists: TodoList[];

  beforeEach(() => {
    manager = new CleanupSuggestionManager();
    
    // Create mock todo lists for testing
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    mockTodoLists = [
      {
        id: 'list-1',
        title: 'Completed List (Old)',
        items: [
          {
            id: 'task-1',
            title: 'Completed Task',
            status: TaskStatus.COMPLETED,
            priority: 3,
            createdAt: fourteenDaysAgo,
            updatedAt: fourteenDaysAgo,
            completedAt: fourteenDaysAgo,
            dependencies: [],
            tags: [],
            metadata: {},
            implementationNotes: [],
          },
        ],
        createdAt: fourteenDaysAgo,
        updatedAt: fourteenDaysAgo,
        completedAt: fourteenDaysAgo,
        projectTag: 'test-project',
        isArchived: false,
        totalItems: 1,
        completedItems: 1,
        progress: 100,
        analytics: {
          totalItems: 1,
          completedItems: 1,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 100,
          averageCompletionTime: 60,
          estimatedTimeRemaining: 0,
          velocityMetrics: { itemsPerDay: 1, completionRate: 1 },
          complexityDistribution: {},
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        implementationNotes: [],
      },
      {
        id: 'list-2',
        title: 'Recently Completed List',
        items: [
          {
            id: 'task-2',
            title: 'Recently Completed Task',
            status: TaskStatus.COMPLETED,
            priority: 3,
            createdAt: sevenDaysAgo,
            updatedAt: sevenDaysAgo,
            completedAt: sevenDaysAgo,
            dependencies: [],
            tags: [],
            metadata: {},
            implementationNotes: [],
          },
        ],
        createdAt: sevenDaysAgo,
        updatedAt: sevenDaysAgo,
        completedAt: sevenDaysAgo,
        projectTag: 'test-project',
        isArchived: false,
        totalItems: 1,
        completedItems: 1,
        progress: 100,
        analytics: {
          totalItems: 1,
          completedItems: 1,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 100,
          averageCompletionTime: 60,
          estimatedTimeRemaining: 0,
          velocityMetrics: { itemsPerDay: 1, completionRate: 1 },
          complexityDistribution: {},
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        implementationNotes: [],
      },
      {
        id: 'list-3',
        title: 'Active List',
        items: [
          {
            id: 'task-3',
            title: 'Pending Task',
            status: TaskStatus.PENDING,
            priority: 3,
            createdAt: now,
            updatedAt: now,
            dependencies: [],
            tags: [],
            metadata: {},
            implementationNotes: [],
          },
        ],
        createdAt: now,
        updatedAt: now,
        projectTag: 'test-project',
        isArchived: false,
        totalItems: 1,
        completedItems: 0,
        progress: 0,
        analytics: {
          totalItems: 1,
          completedItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 0,
          averageCompletionTime: 0,
          estimatedTimeRemaining: 60,
          velocityMetrics: { itemsPerDay: 0, completionRate: 0 },
          complexityDistribution: {},
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        implementationNotes: [],
      },
    ];
  });

  describe('identifyCompletedLists', () => {
    it('should identify completed lists correctly', () => {
      const completedLists = manager.identifyCompletedLists(mockTodoLists);

      expect(completedLists).toHaveLength(2);
      expect(completedLists.map(l => l.id)).toEqual(['list-1', 'list-2']);
    });

    it('should filter by project tag when provided', () => {
      const otherProjectList: TodoList = {
        ...mockTodoLists[0]!,
        id: 'list-other',
        projectTag: 'other-project',
      };

      const allLists = [...mockTodoLists, otherProjectList];
      const completedLists = manager.identifyCompletedLists(allLists, 'test-project');

      expect(completedLists).toHaveLength(2);
      expect(completedLists.every(l => l.projectTag === 'test-project')).toBe(true);
    });

    it('should exclude archived lists', () => {
      const archivedList: TodoList = {
        ...mockTodoLists[0]!,
        id: 'archived-list',
        isArchived: true,
      };

      const allLists = [...mockTodoLists, archivedList];
      const completedLists = manager.identifyCompletedLists(allLists);

      expect(completedLists.find(l => l.id === 'archived-list')).toBeUndefined();
    });

    it('should handle empty list array', () => {
      const completedLists = manager.identifyCompletedLists([]);

      expect(completedLists).toHaveLength(0);
    });
  });

  describe('generateCleanupSuggestions', () => {
    it('should generate suggestions for old completed lists', () => {
      const suggestions = manager.generateCleanupSuggestions(mockTodoLists);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]?.list.id).toBe('list-1');
      expect(suggestions[0]?.reason).toContain('completed 14 days ago');
      expect(suggestions[0]?.completedDaysAgo).toBe(14);
      expect(suggestions[0]?.riskLevel).toBe('low');
    });

    it('should not suggest recently completed lists', () => {
      const suggestions = manager.generateCleanupSuggestions(mockTodoLists);

      expect(suggestions.find(s => s.list.id === 'list-2')).toBeUndefined();
    });

    it('should calculate estimated space saved', () => {
      const suggestions = manager.generateCleanupSuggestions(mockTodoLists);

      expect(suggestions[0]?.estimatedSpaceSaved).toBeGreaterThan(0);
    });

    it('should respect cleanup declined dates', () => {
      const listWithDeclinedCleanup: TodoList = {
        ...mockTodoLists[0]!,
        cleanupDeclined: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      };

      const suggestions = manager.generateCleanupSuggestions([listWithDeclinedCleanup]);

      expect(suggestions).toHaveLength(0);
    });

    it('should suggest cleanup after decline period expires', () => {
      const listWithOldDecline: TodoList = {
        ...mockTodoLists[0]!,
        cleanupDeclined: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      };

      const suggestions = manager.generateCleanupSuggestions([listWithOldDecline]);

      expect(suggestions).toHaveLength(1);
    });
  });

  describe('shouldSuggestCleanup', () => {
    it('should suggest cleanup for old completed lists', () => {
      const shouldSuggest = manager.shouldSuggestCleanup(mockTodoLists[0]!);

      expect(shouldSuggest).toBe(true);
    });

    it('should not suggest cleanup for recent lists', () => {
      const shouldSuggest = manager.shouldSuggestCleanup(mockTodoLists[1]!);

      expect(shouldSuggest).toBe(false);
    });

    it('should not suggest cleanup for active lists', () => {
      const shouldSuggest = manager.shouldSuggestCleanup(mockTodoLists[2]!);

      expect(shouldSuggest).toBe(false);
    });

    it('should not suggest cleanup for archived lists', () => {
      const archivedList: TodoList = {
        ...mockTodoLists[0]!,
        isArchived: true,
      };

      const shouldSuggest = manager.shouldSuggestCleanup(archivedList);

      expect(shouldSuggest).toBe(false);
    });
  });

  describe('markCleanupDeclined', () => {
    it('should mark cleanup as declined with current timestamp', () => {
      const list = { ...mockTodoLists[0]! };
      const beforeTime = new Date();

      const updatedList = manager.markCleanupDeclined(list);

      const afterTime = new Date();
      expect(updatedList.cleanupDeclined).toBeInstanceOf(Date);
      expect(updatedList.cleanupDeclined!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updatedList.cleanupDeclined!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should preserve other list properties', () => {
      const list = { ...mockTodoLists[0]! };
      const updatedList = manager.markCleanupDeclined(list);

      expect(updatedList.id).toBe(list.id);
      expect(updatedList.title).toBe(list.title);
      expect(updatedList.projectTag).toBe(list.projectTag);
    });
  });

  describe('performCleanup', () => {
    it('should archive lists when permanent is false', async () => {
      const listsToCleanup = [mockTodoLists[0]!.id];
      const result = await manager.performCleanup(mockTodoLists, listsToCleanup, false);

      expect(result.success).toBe(true);
      expect(result.processedLists).toHaveLength(1);
      expect(result.archivedLists).toHaveLength(1);
      expect(result.deletedLists).toHaveLength(0);
      expect(result.processedLists[0]?.isArchived).toBe(true);
    });

    it('should delete lists when permanent is true', async () => {
      const listsToCleanup = [mockTodoLists[0]!.id];
      const result = await manager.performCleanup(mockTodoLists, listsToCleanup, true);

      expect(result.success).toBe(true);
      expect(result.processedLists).toHaveLength(0);
      expect(result.archivedLists).toHaveLength(0);
      expect(result.deletedLists).toHaveLength(1);
      expect(result.deletedLists[0]?.id).toBe(mockTodoLists[0]!.id);
    });

    it('should create backup before cleanup', async () => {
      const listsToCleanup = [mockTodoLists[0]!.id];
      const result = await manager.performCleanup(mockTodoLists, listsToCleanup, false);

      expect(result.backup).toBeDefined();
      expect(result.backup?.lists).toHaveLength(1);
      expect(result.backup?.timestamp).toBeInstanceOf(Date);
    });

    it('should handle non-existent list IDs gracefully', async () => {
      const listsToCleanup = ['non-existent-id'];
      const result = await manager.performCleanup(mockTodoLists, listsToCleanup, false);

      expect(result.success).toBe(true);
      expect(result.processedLists).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should process multiple lists', async () => {
      const listsToCleanup = [mockTodoLists[0]!.id, mockTodoLists[1]!.id];
      const result = await manager.performCleanup(mockTodoLists, listsToCleanup, false);

      expect(result.success).toBe(true);
      expect(result.processedLists).toHaveLength(2);
      expect(result.archivedLists).toHaveLength(2);
    });
  });

  describe('calculateSpaceSaved', () => {
    it('should calculate space based on list content', () => {
      const spaceSaved = manager.calculateSpaceSaved(mockTodoLists[0]!);

      expect(spaceSaved).toBeGreaterThan(0);
      expect(typeof spaceSaved).toBe('number');
    });

    it('should account for tasks and notes', () => {
      const listWithNotes: TodoList = {
        ...mockTodoLists[0]!,
        implementationNotes: [
          {
            id: 'note-1',
            content: 'This is a test note',
            type: 'general',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const spaceSaved = manager.calculateSpaceSaved(listWithNotes);
      const originalSpaceSaved = manager.calculateSpaceSaved(mockTodoLists[0]!);

      expect(spaceSaved).toBeGreaterThan(originalSpaceSaved);
    });
  });

  describe('getRiskLevel', () => {
    it('should return low risk for old completed lists', () => {
      const riskLevel = manager.getRiskLevel(mockTodoLists[0]!);

      expect(riskLevel).toBe('low');
    });

    it('should return medium risk for lists with dependencies', () => {
      const listWithDependencies: TodoList = {
        ...mockTodoLists[0]!,
        items: [
          {
            ...mockTodoLists[0]!.items[0]!,
            dependencies: ['other-task-id'],
          },
        ],
      };

      const riskLevel = manager.getRiskLevel(listWithDependencies);

      expect(riskLevel).toBe('medium');
    });

    it('should return high risk for lists with many notes', () => {
      const listWithManyNotes: TodoList = {
        ...mockTodoLists[0]!,
        implementationNotes: Array.from({ length: 10 }, (_, i) => ({
          id: `note-${i}`,
          content: `Note ${i}`,
          type: 'general' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      const riskLevel = manager.getRiskLevel(listWithManyNotes);

      expect(riskLevel).toBe('high');
    });
  });

  describe('getCleanupStatistics', () => {
    it('should calculate cleanup statistics', () => {
      const stats = manager.getCleanupStatistics(mockTodoLists);

      expect(stats.totalLists).toBe(3);
      expect(stats.completedLists).toBe(2);
      expect(stats.eligibleForCleanup).toBe(1);
      expect(stats.totalSpaceSavings).toBeGreaterThan(0);
      expect(stats.oldestCompletedList).toBeInstanceOf(Date);
    });

    it('should handle empty list array', () => {
      const stats = manager.getCleanupStatistics([]);

      expect(stats.totalLists).toBe(0);
      expect(stats.completedLists).toBe(0);
      expect(stats.eligibleForCleanup).toBe(0);
      expect(stats.totalSpaceSavings).toBe(0);
    });
  });

  describe('formatCleanupSuggestion', () => {
    it('should format suggestion for display', () => {
      const suggestion: CleanupSuggestion = {
        list: mockTodoLists[0]!,
        reason: 'Test reason',
        completedDaysAgo: 14,
        estimatedSpaceSaved: 1024,
        riskLevel: 'low',
      };

      const formatted = manager.formatCleanupSuggestion(suggestion);

      expect(formatted).toContain(mockTodoLists[0]!.title);
      expect(formatted).toContain('14 days ago');
      expect(formatted).toContain('1.0 KB');
      expect(formatted).toContain('Low risk');
    });

    it('should handle different risk levels', () => {
      const suggestion: CleanupSuggestion = {
        list: mockTodoLists[0]!,
        reason: 'Test reason',
        completedDaysAgo: 14,
        estimatedSpaceSaved: 1024,
        riskLevel: 'high',
      };

      const formatted = manager.formatCleanupSuggestion(suggestion);

      expect(formatted).toContain('High risk');
    });
  });

  describe('batchCleanupSuggestions', () => {
    it('should generate batch cleanup suggestions', () => {
      const batchSuggestions = manager.batchCleanupSuggestions(mockTodoLists);

      expect(batchSuggestions.suggestions).toHaveLength(1);
      expect(batchSuggestions.totalSpaceSavings).toBeGreaterThan(0);
      expect(batchSuggestions.riskAssessment).toBe('low');
    });

    it('should assess overall risk correctly', () => {
      const highRiskList: TodoList = {
        ...mockTodoLists[0]!,
        id: 'high-risk-list',
        implementationNotes: Array.from({ length: 10 }, (_, i) => ({
          id: `note-${i}`,
          content: `Note ${i}`,
          type: 'general' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      const listsWithHighRisk = [...mockTodoLists, highRiskList];
      const batchSuggestions = manager.batchCleanupSuggestions(listsWithHighRisk);

      expect(batchSuggestions.riskAssessment).toBe('high');
    });
  });
});