/**
 * Tests for TaskListRepositoryAdapter
 *
 * Verifies that the adapter correctly wraps StorageBackend and implements
 * all ITaskListRepository methods with proper error handling and logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TaskListRepositoryAdapter } from '../../../../src/domain/repositories/task-list-repository.adapter.js';
import { StorageBackend } from '../../../../src/shared/types/storage.js';
import {
  TaskStatus as TaskStatusEnum,
  Priority as PriorityEnum,
} from '../../../../src/shared/types/task.js';

import type {
  TaskList,
  TaskListSummary,
} from '../../../../src/shared/types/task.js';

// Mock storage backend
class MockStorageBackend extends StorageBackend {
  private data = new Map<string, TaskList>();

  async save(key: string, data: TaskList): Promise<void> {
    this.data.set(key, data);
  }

  async load(key: string): Promise<TaskList | null> {
    return this.data.get(key) ?? null;
  }

  async delete(key: string, permanent?: boolean): Promise<void> {
    if (permanent) {
      this.data.delete(key);
    } else {
      const list = this.data.get(key);
      if (list) {
        list.isArchived = true;
        this.data.set(key, list);
      }
    }
  }

  async list(options?: {
    projectTag?: string;
    includeArchived?: boolean;
  }): Promise<TaskListSummary[]> {
    const summaries: TaskListSummary[] = [];
    for (const [id, list] of this.data.entries()) {
      // Apply filters
      if (options?.projectTag && list.projectTag !== options.projectTag) {
        continue;
      }
      if (!options?.includeArchived && list.isArchived) {
        continue;
      }

      summaries.push({
        id,
        title: list.title,
        progress: list.progress,
        totalItems: list.totalItems,
        completedItems: list.completedItems,
        lastUpdated: list.updatedAt,
        context: list.context,
        projectTag: list.projectTag,
        isArchived: list.isArchived,
      });
    }
    return summaries;
  }

  async initialize(): Promise<void> {
    // No-op for mock
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async shutdown(): Promise<void> {
    this.data.clear();
  }

  async loadAllData(): Promise<{ version: string; taskLists: TaskList[] }> {
    return {
      version: '1.0.0',
      taskLists: Array.from(this.data.values()),
    };
  }

  async saveAllData(data: {
    version: string;
    taskLists: TaskList[];
  }): Promise<void> {
    this.data.clear();
    for (const list of data.taskLists) {
      this.data.set(list.id, list);
    }
  }

  // Helper method for tests
  clear(): void {
    this.data.clear();
  }
}

// Helper function to create a test TaskList
function createTestList(id: string, overrides?: Partial<TaskList>): TaskList {
  const now = new Date();
  return {
    id,
    title: `Test List ${id}`,
    description: 'Test description',
    items: [],
    createdAt: now,
    updatedAt: now,
    context: 'test',
    projectTag: 'test-project',
    isArchived: false,
    totalItems: 0,
    completedItems: 0,
    progress: 0,
    analytics: {
      totalItems: 0,
      completedItems: 0,
      inProgressItems: 0,
      blockedItems: 0,
      progress: 0,
      averageCompletionTime: 0,
      estimatedTimeRemaining: 0,
      velocityMetrics: {
        itemsPerDay: 0,
        completionRate: 0,
      },
      complexityDistribution: {},
      tagFrequency: {},
      dependencyGraph: [],
    },
    metadata: {},
    implementationNotes: [],
    ...overrides,
  };
}

describe('TaskListRepositoryAdapter', () => {
  let storage: MockStorageBackend;
  let adapter: TaskListRepositoryAdapter;

  beforeEach(() => {
    storage = new MockStorageBackend();
    adapter = new TaskListRepositoryAdapter(storage);
  });

  describe('save', () => {
    it('should save a TaskList to storage', async () => {
      const list = createTestList('list-1');

      await adapter.save(list);

      const loaded = await storage.load('list-1');
      expect(loaded).toEqual(list);
    });

    it('should throw error if save fails', async () => {
      const list = createTestList('list-1');
      vi.spyOn(storage, 'save').mockRejectedValue(new Error('Save failed'));

      await expect(adapter.save(list)).rejects.toThrow(
        'Failed to save TaskList list-1'
      );
    });
  });

  describe('findById', () => {
    it('should find a TaskList by ID', async () => {
      const list = createTestList('list-1');
      await storage.save('list-1', list);

      const found = await adapter.findById('list-1');

      expect(found).toEqual(list);
    });

    it('should return null if list not found', async () => {
      const found = await adapter.findById('non-existent');

      expect(found).toBeNull();
    });

    it('should apply task filters when specified', async () => {
      const list = createTestList('list-1', {
        items: [
          {
            id: 'task-1',
            title: 'Task 1',
            status: TaskStatusEnum.PENDING,
            priority: PriorityEnum.HIGH,
            createdAt: new Date(),
            updatedAt: new Date(),
            dependencies: [],
            tags: ['tag1'],
            metadata: {},
            implementationNotes: [],
            exitCriteria: [],
          },
          {
            id: 'task-2',
            title: 'Task 2',
            status: TaskStatusEnum.COMPLETED,
            priority: PriorityEnum.LOW,
            createdAt: new Date(),
            updatedAt: new Date(),
            dependencies: [],
            tags: ['tag2'],
            metadata: {},
            implementationNotes: [],
            exitCriteria: [],
          },
        ],
        totalItems: 2,
      });
      await storage.save('list-1', list);

      const found = await adapter.findById('list-1', {
        filters: {
          status: TaskStatusEnum.PENDING,
        },
      });

      expect(found?.items).toHaveLength(1);
      expect(found?.items[0].id).toBe('task-1');
    });

    it('should throw error if load fails', async () => {
      vi.spyOn(storage, 'load').mockRejectedValue(new Error('Load failed'));

      await expect(adapter.findById('list-1')).rejects.toThrow(
        'Failed to find TaskList list-1'
      );
    });
  });

  describe('findAll', () => {
    it('should find all TaskLists', async () => {
      const list1 = createTestList('list-1');
      const list2 = createTestList('list-2');
      await storage.save('list-1', list1);
      await storage.save('list-2', list2);

      const found = await adapter.findAll();

      expect(found).toHaveLength(2);
      expect(found.map(l => l.id)).toContain('list-1');
      expect(found.map(l => l.id)).toContain('list-2');
    });

    it('should return empty array if no lists exist', async () => {
      const found = await adapter.findAll();

      expect(found).toEqual([]);
    });

    it('should throw error if list operation fails', async () => {
      vi.spyOn(storage, 'list').mockRejectedValue(new Error('List failed'));

      await expect(adapter.findAll()).rejects.toThrow(
        'Failed to find all TaskLists'
      );
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const list1 = createTestList('list-1', {
        title: 'Project Alpha',
        projectTag: 'alpha',
        progress: 50,
      });
      const list2 = createTestList('list-2', {
        title: 'Project Beta',
        projectTag: 'beta',
        progress: 100,
      });
      const list3 = createTestList('list-3', {
        title: 'Project Gamma',
        projectTag: 'alpha',
        progress: 25,
      });

      await storage.save('list-1', list1);
      await storage.save('list-2', list2);
      await storage.save('list-3', list3);
    });

    it('should search with text filter', async () => {
      const result = await adapter.search({
        text: 'Alpha',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Project Alpha');
      expect(result.totalCount).toBe(1);
    });

    it('should search with project tag filter', async () => {
      const result = await adapter.search({
        projectTag: 'alpha',
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should search with status filter', async () => {
      const result = await adapter.search({
        status: 'completed',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Project Beta');
    });

    it('should apply pagination', async () => {
      const result = await adapter.search({
        pagination: {
          offset: 1,
          limit: 1,
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should apply sorting', async () => {
      const result = await adapter.search({
        sorting: {
          field: 'title',
          direction: 'asc',
        },
      });

      expect(result.items[0].title).toBe('Project Alpha');
      expect(result.items[1].title).toBe('Project Beta');
      expect(result.items[2].title).toBe('Project Gamma');
    });
  });

  describe('searchSummaries', () => {
    beforeEach(async () => {
      const list1 = createTestList('list-1', {
        title: 'Project Alpha',
        projectTag: 'alpha',
        progress: 50,
      });
      const list2 = createTestList('list-2', {
        title: 'Project Beta',
        projectTag: 'beta',
        progress: 100,
      });

      await storage.save('list-1', list1);
      await storage.save('list-2', list2);
    });

    it('should search summaries with text filter', async () => {
      const result = await adapter.searchSummaries({
        text: 'Alpha',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Project Alpha');
    });

    it('should search summaries with status filter', async () => {
      const result = await adapter.searchSummaries({
        status: 'completed',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Project Beta');
    });

    it('should apply pagination to summaries', async () => {
      const result = await adapter.searchSummaries({
        pagination: {
          offset: 0,
          limit: 1,
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('delete', () => {
    it('should archive a TaskList when permanent is false', async () => {
      const list = createTestList('list-1');
      await storage.save('list-1', list);

      await adapter.delete('list-1', false);

      const loaded = await storage.load('list-1');
      expect(loaded?.isArchived).toBe(true);
    });

    it('should permanently delete a TaskList', async () => {
      const list = createTestList('list-1');
      await storage.save('list-1', list);

      await adapter.delete('list-1', true);

      const loaded = await storage.load('list-1');
      expect(loaded).toBeNull();
    });

    it('should throw error if delete fails', async () => {
      vi.spyOn(storage, 'delete').mockRejectedValue(new Error('Delete failed'));

      await expect(adapter.delete('list-1', true)).rejects.toThrow(
        'Failed to delete TaskList list-1'
      );
    });
  });

  describe('exists', () => {
    it('should return true if list exists', async () => {
      const list = createTestList('list-1');
      await storage.save('list-1', list);

      const exists = await adapter.exists('list-1');

      expect(exists).toBe(true);
    });

    it('should return false if list does not exist', async () => {
      const exists = await adapter.exists('non-existent');

      expect(exists).toBe(false);
    });

    it('should throw error if check fails', async () => {
      vi.spyOn(storage, 'load').mockRejectedValue(new Error('Check failed'));

      await expect(adapter.exists('list-1')).rejects.toThrow(
        'Failed to check if TaskList list-1 exists'
      );
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      const list1 = createTestList('list-1', { projectTag: 'alpha' });
      const list2 = createTestList('list-2', { projectTag: 'beta' });
      const list3 = createTestList('list-3', { projectTag: 'alpha' });

      await storage.save('list-1', list1);
      await storage.save('list-2', list2);
      await storage.save('list-3', list3);
    });

    it('should count all lists when no query provided', async () => {
      const count = await adapter.count();

      expect(count).toBe(3);
    });

    it('should count filtered lists when query provided', async () => {
      const count = await adapter.count({
        projectTag: 'alpha',
      });

      expect(count).toBe(2);
    });
  });

  describe('healthCheck', () => {
    it('should return true when storage is healthy', async () => {
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when storage health check fails', async () => {
      vi.spyOn(storage, 'healthCheck').mockResolvedValue(false);

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false when health check throws error', async () => {
      vi.spyOn(storage, 'healthCheck').mockRejectedValue(
        new Error('Health check failed')
      );

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});
