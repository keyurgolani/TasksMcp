/**
 * Unit tests for MultiSourceAggregator
 */

import { describe, it, expect, beforeEach as _beforeEach, vi } from 'vitest';

import { MultiSourceAggregator } from '../../../../src/infrastructure/storage/multi-source-aggregator.js';

import type { SearchQuery } from '../../../../src/domain/repositories/todo-list.repository.js';
import type { StorageBackend } from '../../../../src/shared/types/storage.js';
import type {
  TodoList,
  TodoListSummary,
  TaskStatus as _TaskStatus,
  Priority as _Priority,
} from '../../../../src/shared/types/todo.js';

describe('MultiSourceAggregator', () => {
  // Helper to create mock TodoList
  const createMockList = (
    id: string,
    title: string,
    updatedAt: Date,
    progress = 50
  ): TodoList => ({
    id,
    title,
    description: `Description for ${title}`,
    items: [],
    projectTag: 'test-project',
    context: 'test-project',
    createdAt: new Date('2025-01-01'),
    updatedAt,
    progress,
    totalItems: 10,
    completedItems: progress / 10,
    isArchived: false,
    implementationNotes: [],
    metadata: {},
    analytics: {
      totalItems: 10,
      completedItems: progress / 10,
      inProgressItems: 0,
      pendingItems: 10 - progress / 10,
      blockedItems: 0,
      cancelledItems: 0,
      completionRate: progress,
      averageCompletionTime: 0,
      estimatedTimeRemaining: 0,
      priorityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      tagDistribution: {},
      dependencyComplexity: 0,
      criticalPathLength: 0,
    },
  });

  // Helper to create mock TodoListSummary
  const createMockSummary = (
    id: string,
    title: string,
    lastUpdated: Date,
    progress = 50
  ): TodoListSummary => ({
    id,
    title,
    totalItems: 10,
    completedItems: progress / 10,
    progress,
    lastUpdated,
    context: 'test-project',
    projectTag: 'test-project',
  });

  // Helper to create mock storage backend
  const createMockBackend = (
    lists: TodoList[],
    summaries: TodoListSummary[]
  ): StorageBackend => ({
    save: vi.fn(),
    load: vi.fn((id: string) => {
      const list = lists.find(l => l.id === id);
      return Promise.resolve(list ?? null);
    }),
    delete: vi.fn(),
    list: vi.fn(() => Promise.resolve(summaries)),
    healthCheck: vi.fn(() => Promise.resolve(true)),
    getMetrics: vi.fn(),
  });

  describe('aggregateLists', () => {
    it('should aggregate lists from multiple sources', async () => {
      const list1 = createMockList('list-1', 'List 1', new Date('2025-01-10'));
      const list2 = createMockList('list-2', 'List 2', new Date('2025-01-11'));
      const list3 = createMockList('list-3', 'List 3', new Date('2025-01-12'));

      const backend1 = createMockBackend(
        [list1, list2],
        [
          createMockSummary('list-1', 'List 1', new Date('2025-01-10')),
          createMockSummary('list-2', 'List 2', new Date('2025-01-11')),
        ]
      );

      const backend2 = createMockBackend(
        [list3],
        [createMockSummary('list-3', 'List 3', new Date('2025-01-12'))]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 },
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(false);
      expect(result.items.map(l => l.id)).toEqual([
        'list-1',
        'list-2',
        'list-3',
      ]);
    });

    it('should deduplicate lists with same ID', async () => {
      const list1v1 = createMockList(
        'list-1',
        'List 1 v1',
        new Date('2025-01-10')
      );
      const list1v2 = createMockList(
        'list-1',
        'List 1 v2',
        new Date('2025-01-11')
      );

      const backend1 = createMockBackend(
        [list1v1],
        [createMockSummary('list-1', 'List 1 v1', new Date('2025-01-10'))]
      );

      const backend2 = createMockBackend(
        [list1v2],
        [createMockSummary('list-1', 'List 1 v2', new Date('2025-01-11'))]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 },
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('List 1 v2'); // Latest version
      expect(result.items[0].updatedAt).toEqual(new Date('2025-01-11'));
    });

    it('should resolve conflicts using priority strategy', async () => {
      const list1v1 = createMockList(
        'list-1',
        'List 1 v1',
        new Date('2025-01-11')
      );
      const list1v2 = createMockList(
        'list-1',
        'List 1 v2',
        new Date('2025-01-10')
      );

      const backend1 = createMockBackend(
        [list1v1],
        [createMockSummary('list-1', 'List 1 v1', new Date('2025-01-11'))]
      );

      const backend2 = createMockBackend(
        [list1v2],
        [createMockSummary('list-1', 'List 1 v2', new Date('2025-01-10'))]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'priority',
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 }, // Higher priority
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('List 1 v2'); // Higher priority source
    });

    it('should apply text search filter', async () => {
      const list1 = createMockList(
        'list-1',
        'Shopping List',
        new Date('2025-01-10')
      );
      const list2 = createMockList(
        'list-2',
        'Work Tasks',
        new Date('2025-01-11')
      );

      const backend = createMockBackend(
        [list1, list2],
        [
          createMockSummary('list-1', 'Shopping List', new Date('2025-01-10')),
          createMockSummary('list-2', 'Work Tasks', new Date('2025-01-11')),
        ]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        text: 'shopping',
      };

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Shopping List');
    });

    it('should apply project tag filter', async () => {
      const list1 = {
        ...createMockList('list-1', 'List 1', new Date('2025-01-10')),
        projectTag: 'project-a',
      };
      const list2 = {
        ...createMockList('list-2', 'List 2', new Date('2025-01-11')),
        projectTag: 'project-b',
      };

      const backend = createMockBackend(
        [list1, list2],
        [
          {
            ...createMockSummary('list-1', 'List 1', new Date('2025-01-10')),
            projectTag: 'project-a',
          },
          {
            ...createMockSummary('list-2', 'List 2', new Date('2025-01-11')),
            projectTag: 'project-b',
          },
        ]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        projectTag: 'project-a',
      };

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].projectTag).toBe('project-a');
    });

    it('should apply status filter', async () => {
      const list1 = createMockList(
        'list-1',
        'List 1',
        new Date('2025-01-10'),
        100
      ); // Completed
      const list2 = createMockList(
        'list-2',
        'List 2',
        new Date('2025-01-11'),
        50
      ); // Active

      const backend = createMockBackend(
        [list1, list2],
        [
          createMockSummary('list-1', 'List 1', new Date('2025-01-10'), 100),
          createMockSummary('list-2', 'List 2', new Date('2025-01-11'), 50),
        ]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        status: 'completed',
      };

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].progress).toBe(100);
    });

    it('should apply sorting', async () => {
      const list1 = createMockList('list-1', 'B List', new Date('2025-01-10'));
      const list2 = createMockList('list-2', 'A List', new Date('2025-01-11'));
      const list3 = createMockList('list-3', 'C List', new Date('2025-01-12'));

      const backend = createMockBackend(
        [list1, list2, list3],
        [
          createMockSummary('list-1', 'B List', new Date('2025-01-10')),
          createMockSummary('list-2', 'A List', new Date('2025-01-11')),
          createMockSummary('list-3', 'C List', new Date('2025-01-12')),
        ]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        sorting: {
          field: 'title',
          direction: 'asc',
        },
      };

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].title).toBe('A List');
      expect(result.items[1].title).toBe('B List');
      expect(result.items[2].title).toBe('C List');
    });

    it('should apply pagination', async () => {
      const lists = Array.from({ length: 10 }, (_, i) =>
        createMockList(`list-${i}`, `List ${i}`, new Date(`2025-01-${10 + i}`))
      );

      const summaries = lists.map(l =>
        createMockSummary(l.id, l.title, l.updatedAt)
      );

      const backend = createMockBackend(lists, summaries);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        pagination: {
          offset: 2,
          limit: 3,
        },
      };

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.pagination).toEqual({ offset: 2, limit: 3 });
    });

    it('should handle source query failures gracefully', async () => {
      const list1 = createMockList('list-1', 'List 1', new Date('2025-01-10'));

      const goodBackend = createMockBackend(
        [list1],
        [createMockSummary('list-1', 'List 1', new Date('2025-01-10'))]
      );

      const badBackend: StorageBackend = {
        save: vi.fn(),
        load: vi.fn(() => Promise.reject(new Error('Backend error'))),
        delete: vi.fn(),
        list: vi.fn(() => Promise.reject(new Error('Backend error'))),
        healthCheck: vi.fn(() => Promise.resolve(false)),
        getMetrics: vi.fn(),
      };

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [
        { backend: goodBackend, id: 'source-1', priority: 1 },
        { backend: badBackend, id: 'source-2', priority: 2 },
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateLists(sources, query);

      // Should still return results from good backend
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('list-1');
    });
  });

  describe('aggregateSummaries', () => {
    it('should aggregate summaries from multiple sources', async () => {
      const summary1 = createMockSummary(
        'list-1',
        'List 1',
        new Date('2025-01-10')
      );
      const summary2 = createMockSummary(
        'list-2',
        'List 2',
        new Date('2025-01-11')
      );
      const summary3 = createMockSummary(
        'list-3',
        'List 3',
        new Date('2025-01-12')
      );

      const backend1 = createMockBackend([], [summary1, summary2]);
      const backend2 = createMockBackend([], [summary3]);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 },
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateSummaries(sources, query);

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });

    it('should deduplicate summaries by priority', async () => {
      const summary1v1 = createMockSummary(
        'list-1',
        'List 1 v1',
        new Date('2025-01-10')
      );
      const summary1v2 = createMockSummary(
        'list-1',
        'List 1 v2',
        new Date('2025-01-11')
      );

      const backend1 = createMockBackend([], [summary1v1]);
      const backend2 = createMockBackend([], [summary1v2]);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 }, // Higher priority
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateSummaries(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('List 1 v2'); // Higher priority source
    });

    it('should apply text filter to summaries', async () => {
      const summary1 = createMockSummary(
        'list-1',
        'Shopping List',
        new Date('2025-01-10')
      );
      const summary2 = createMockSummary(
        'list-2',
        'Work Tasks',
        new Date('2025-01-11')
      );

      const backend = createMockBackend([], [summary1, summary2]);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        text: 'shopping',
      };

      const result = await aggregator.aggregateSummaries(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Shopping List');
    });

    it('should apply status filter to summaries', async () => {
      const summary1 = createMockSummary(
        'list-1',
        'List 1',
        new Date('2025-01-10'),
        100
      );
      const summary2 = createMockSummary(
        'list-2',
        'List 2',
        new Date('2025-01-11'),
        50
      );

      const backend = createMockBackend([], [summary1, summary2]);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        status: 'active',
      };

      const result = await aggregator.aggregateSummaries(sources, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].progress).toBe(50);
    });

    it('should apply sorting to summaries', async () => {
      const summary1 = createMockSummary(
        'list-1',
        'B List',
        new Date('2025-01-10')
      );
      const summary2 = createMockSummary(
        'list-2',
        'A List',
        new Date('2025-01-11')
      );

      const backend = createMockBackend([], [summary1, summary2]);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        sorting: {
          field: 'title',
          direction: 'asc',
        },
      };

      const result = await aggregator.aggregateSummaries(sources, query);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('A List');
      expect(result.items[1].title).toBe('B List');
    });

    it('should apply pagination to summaries', async () => {
      const summaries = Array.from({ length: 10 }, (_, i) =>
        createMockSummary(
          `list-${i}`,
          `List ${i}`,
          new Date(`2025-01-${10 + i}`)
        )
      );

      const backend = createMockBackend([], summaries);

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
      });

      const sources = [{ backend, id: 'source-1', priority: 1 }];

      const query: SearchQuery = {
        pagination: {
          offset: 3,
          limit: 4,
        },
      };

      const result = await aggregator.aggregateSummaries(sources, query);

      expect(result.items).toHaveLength(4);
      expect(result.totalCount).toBe(10);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('parallel vs sequential querying', () => {
    it('should query sources in parallel by default', async () => {
      const list1 = createMockList('list-1', 'List 1', new Date('2025-01-10'));
      const list2 = createMockList('list-2', 'List 2', new Date('2025-01-11'));

      const backend1 = createMockBackend(
        [list1],
        [createMockSummary('list-1', 'List 1', new Date('2025-01-10'))]
      );

      const backend2 = createMockBackend(
        [list2],
        [createMockSummary('list-2', 'List 2', new Date('2025-01-11'))]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
        parallelQueries: true,
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 },
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(2);
    });

    it('should query sources sequentially when configured', async () => {
      const list1 = createMockList('list-1', 'List 1', new Date('2025-01-10'));
      const list2 = createMockList('list-2', 'List 2', new Date('2025-01-11'));

      const backend1 = createMockBackend(
        [list1],
        [createMockSummary('list-1', 'List 1', new Date('2025-01-10'))]
      );

      const backend2 = createMockBackend(
        [list2],
        [createMockSummary('list-2', 'List 2', new Date('2025-01-11'))]
      );

      const aggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
        parallelQueries: false,
      });

      const sources = [
        { backend: backend1, id: 'source-1', priority: 1 },
        { backend: backend2, id: 'source-2', priority: 2 },
      ];

      const query: SearchQuery = {};

      const result = await aggregator.aggregateLists(sources, query);

      expect(result.items).toHaveLength(2);
    });
  });
});
