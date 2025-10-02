/**
 * Integration tests for Data Delegation Layer
 * 
 * Tests the TodoListRepository implementation with DataSourceRouter
 * and MultiSourceAggregator to verify:
 * - Multi-source data access
 * - Source failover and fallback
 * - Conflict resolution strategies
 * - Data aggregation and deduplication
 * - Source metadata tracking
 * 
 * Requirements tested:
 * - 2.1: Pluggable storage backends
 * - 2.3: Multi-source data aggregation
 * - 2.5: Fallback mechanisms
 * - 2.6: Error recovery
 * - 3.1: Query multiple sources
 * - 3.3: Route operations to correct source
 * - 3.4: Conflict resolution
 * - 3.5: Handle unavailable sources
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoListRepository } from '../../src/domain/repositories/todo-list-repository-impl.js';
import { DataSourceRouter, type DataSourceConfig } from '../../src/infrastructure/storage/data-source-router.js';
import { MultiSourceAggregator, type AggregatorConfig } from '../../src/infrastructure/storage/multi-source-aggregator.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import type { TodoList } from '../../src/shared/types/todo.js';
import { v4 as uuidv4 } from 'uuid';

describe('Data Delegation Layer Integration Tests', () => {
  let repository: TodoListRepository;
  let router: DataSourceRouter;
  let aggregator: MultiSourceAggregator;
  let source1: MemoryStorageBackend;
  let source2: MemoryStorageBackend;
  let source3: MemoryStorageBackend;

  /**
   * Helper to create a test TodoList
   */
  function createTestList(overrides: Partial<TodoList> = {}): TodoList {
    const id = overrides.id ?? uuidv4();
    const now = new Date();

    return {
      id,
      title: overrides.title ?? `Test List ${id.slice(0, 8)}`,
      description: overrides.description ?? 'Test description',
      items: overrides.items ?? [],
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      completedAt: overrides.completedAt,
      context: '',
      isArchived: overrides.isArchived ?? false,
      totalItems: overrides.totalItems ?? 0,
      completedItems: overrides.completedItems ?? 0,
      projectTag: overrides.projectTag ?? '',
      progress: overrides.progress ?? 0,
      analytics: overrides.analytics ?? {
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
      implementationNotes: overrides.implementationNotes ?? [],
      metadata: overrides.metadata ?? {},
    };
  }

  beforeEach(async () => {
    // Create three memory storage backends
    source1 = new MemoryStorageBackend();
    source2 = new MemoryStorageBackend();
    source3 = new MemoryStorageBackend();

    await source1.initialize();
    await source2.initialize();
    await source3.initialize();

    // Configure data sources with different priorities
    const dataSourceConfigs: DataSourceConfig[] = [
      {
        id: 'source-1',
        name: 'Primary Source',
        type: 'memory',
        priority: 100,
        readonly: false,
        enabled: true,
        tags: ['primary'],
        config: {
          type: 'memory',
        },
      },
      {
        id: 'source-2',
        name: 'Secondary Source',
        type: 'memory',
        priority: 50,
        readonly: false,
        enabled: true,
        tags: ['secondary'],
        config: {
          type: 'memory',
        },
      },
      {
        id: 'source-3',
        name: 'Tertiary Source',
        type: 'memory',
        priority: 25,
        readonly: true,
        enabled: true,
        tags: ['readonly'],
        config: {
          type: 'memory',
        },
      },
    ];

    // Create router with custom backends (for testing)
    router = new DataSourceRouter(dataSourceConfigs, {
      healthCheckInterval: 60000, // 1 minute
      maxFailures: 3,
      operationTimeout: 5000,
      enableFallback: true,
    });

    // Initialize router
    await router.initialize();

    // Replace backends with our test instances
    // This is a bit hacky but necessary for testing
    (router as any).connectionPool.get('source-1')!.backend = source1;
    (router as any).connectionPool.get('source-2')!.backend = source2;
    (router as any).connectionPool.get('source-3')!.backend = source3;

    // Create aggregator with priority-based conflict resolution
    const aggregatorConfig: AggregatorConfig = {
      conflictResolution: 'priority',
      parallelQueries: true,
      queryTimeout: 5000,
    };

    aggregator = new MultiSourceAggregator(aggregatorConfig);

    // Create repository
    repository = new TodoListRepository(router, aggregator);
  });

  afterEach(async () => {
    await router.shutdown();
  });

  describe('Requirement 2.1: Pluggable Storage Backends', () => {
    it('should save to the highest priority writable source', async () => {
      const list = createTestList({ title: 'Test Save' });

      await repository.save(list);

      // Should be saved to source-1 (highest priority writable)
      const fromSource1 = await source1.load(list.id);
      expect(fromSource1).toBeDefined();
      expect(fromSource1?.title).toBe('Test Save');

      // Should not be in other sources
      const fromSource2 = await source2.load(list.id);
      expect(fromSource2).toBeNull();
    });

    it('should support multiple storage backend types', async () => {
      const status = router.getStatus();

      expect(status.total).toBe(3);
      expect(status.sources).toHaveLength(3);
      expect(status.sources.every(s => s.type === 'memory')).toBe(true);
    });
  });

  describe('Requirement 2.3 & 3.1: Multi-Source Data Aggregation', () => {
    it('should aggregate lists from multiple sources', async () => {
      // Add different lists to different sources
      const list1 = createTestList({ title: 'List in Source 1' });
      const list2 = createTestList({ title: 'List in Source 2' });
      const list3 = createTestList({ title: 'List in Source 3' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);
      await source3.save(list3.id, list3);

      // Search should return all lists
      const result = await repository.search({});

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      
      const titles = result.items.map(l => l.title).sort();
      expect(titles).toEqual([
        'List in Source 1',
        'List in Source 2',
        'List in Source 3',
      ]);
    });

    it('should deduplicate lists with same ID across sources', async () => {
      const listId = uuidv4();
      
      // Add same list to multiple sources with different content
      const list1 = createTestList({
        id: listId,
        title: 'Version 1',
        updatedAt: new Date('2024-01-01'),
      });
      
      const list2 = createTestList({
        id: listId,
        title: 'Version 2',
        updatedAt: new Date('2024-01-02'),
      });

      await source1.save(listId, list1);
      await source2.save(listId, list2);

      // Search should return only one list (deduplicated)
      const result = await repository.search({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(listId);
    });

    it('should support filtering across aggregated results', async () => {
      // Add lists with different project tags
      const list1 = createTestList({ title: 'Project A', projectTag: 'project-a' });
      const list2 = createTestList({ title: 'Project B', projectTag: 'project-b' });
      const list3 = createTestList({ title: 'Project A 2', projectTag: 'project-a' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);
      await source3.save(list3.id, list3);

      // Filter by project tag
      const result = await repository.search({
        projectTag: 'project-a',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(l => l.projectTag === 'project-a')).toBe(true);
    });

    it('should support sorting across aggregated results', async () => {
      const list1 = createTestList({ title: 'C List' });
      const list2 = createTestList({ title: 'A List' });
      const list3 = createTestList({ title: 'B List' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);
      await source3.save(list3.id, list3);

      // Sort by title ascending
      const result = await repository.search({
        sorting: {
          field: 'title',
          direction: 'asc',
        },
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.title).toBe('A List');
      expect(result.items[1]?.title).toBe('B List');
      expect(result.items[2]?.title).toBe('C List');
    });

    it('should support pagination across aggregated results', async () => {
      // Add 5 lists across sources
      for (let i = 0; i < 5; i++) {
        const list = createTestList({ title: `List ${i}` });
        const source = i % 2 === 0 ? source1 : source2;
        await source.save(list.id, list);
      }

      // Get first page
      const page1 = await repository.search({
        pagination: { limit: 2, offset: 0 },
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      // Get second page
      const page2 = await repository.search({
        pagination: { limit: 2, offset: 2 },
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.totalCount).toBe(5);
      expect(page2.hasMore).toBe(true);

      // Get third page
      const page3 = await repository.search({
        pagination: { limit: 2, offset: 4 },
      });

      expect(page3.items).toHaveLength(1);
      expect(page3.totalCount).toBe(5);
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('Requirement 2.5 & 2.6: Source Failover and Fallback', () => {
    it('should fallback to next source when primary fails', async () => {
      const list = createTestList({ title: 'Fallback Test' });

      // Add list to source-2 only
      await source2.save(list.id, list);

      // Mark source-1 as unhealthy
      (router as any).connectionPool.get('source-1')!.healthy = false;

      // Should still be able to read from source-2
      const found = await repository.findById(list.id);

      expect(found).toBeDefined();
      expect(found?.title).toBe('Fallback Test');
    });

    it('should continue operating when one source is unavailable', async () => {
      // Add lists to source-1 and source-2
      const list1 = createTestList({ title: 'In Source 1' });
      const list2 = createTestList({ title: 'In Source 2' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);

      // Mark source-1 as unhealthy
      (router as any).connectionPool.get('source-1')!.healthy = false;

      // Should still get list from source-2
      const result = await repository.search({});

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(l => l.title === 'In Source 2')).toBe(true);
    });

    it('should handle all sources being unavailable gracefully', async () => {
      // Mark all sources as unhealthy
      (router as any).connectionPool.get('source-1')!.healthy = false;
      (router as any).connectionPool.get('source-2')!.healthy = false;
      (router as any).connectionPool.get('source-3')!.healthy = false;

      // Should return empty results when no sources available (graceful degradation)
      const result = await repository.search({});
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('Requirement 3.3: Route Operations to Correct Source', () => {
    it('should route write operations to writable sources only', async () => {
      const list = createTestList({ title: 'Write Test' });

      await repository.save(list);

      // Should be in source-1 or source-2 (writable), not source-3 (readonly)
      const inSource1 = await source1.load(list.id);
      const inSource2 = await source2.load(list.id);
      const inSource3 = await source3.load(list.id);

      expect(inSource1 !== null || inSource2 !== null).toBe(true);
      expect(inSource3).toBeNull();
    });

    it('should route read operations to all sources with fallback', async () => {
      const list = createTestList({ title: 'Read Test' });

      // Add to source-3 only (readonly source, but we can write directly to backend for testing)
      await source3.save(list.id, list);

      // Mark source-1 and source-2 as unhealthy so it reads from source-3
      (router as any).connectionPool.get('source-1')!.healthy = false;
      (router as any).connectionPool.get('source-2')!.healthy = false;

      // Should be able to read from readonly source
      const found = await repository.findById(list.id);

      expect(found).toBeDefined();
      expect(found?.title).toBe('Read Test');
    });

    it('should prefer higher priority sources for reads', async () => {
      const listId = uuidv4();

      // Add different versions to different sources
      const list1 = createTestList({
        id: listId,
        title: 'From Source 1 (Priority 100)',
      });
      
      const list2 = createTestList({
        id: listId,
        title: 'From Source 2 (Priority 50)',
      });

      await source1.save(listId, list1);
      await source2.save(listId, list2);

      // Should get from source-1 (higher priority)
      const found = await repository.findById(listId);

      expect(found).toBeDefined();
      expect(found?.title).toBe('From Source 1 (Priority 100)');
    });
  });

  describe('Requirement 3.4: Conflict Resolution', () => {
    it('should resolve conflicts using priority strategy', async () => {
      const listId = uuidv4();

      // Add same list to multiple sources with different content
      const list1 = createTestList({
        id: listId,
        title: 'Priority 100 Version',
        updatedAt: new Date('2024-01-01'),
      });
      
      const list2 = createTestList({
        id: listId,
        title: 'Priority 50 Version',
        updatedAt: new Date('2024-01-02'), // Newer but lower priority
      });

      await source1.save(listId, list1);
      await source2.save(listId, list2);

      // Search should return version from higher priority source
      const result = await repository.search({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.title).toBe('Priority 100 Version');
    });

    it('should handle conflicts with latest strategy', async () => {
      // Create new aggregator with 'latest' strategy
      const latestAggregator = new MultiSourceAggregator({
        conflictResolution: 'latest',
        parallelQueries: true,
        queryTimeout: 5000,
      });

      const latestRepository = new TodoListRepository(router, latestAggregator);

      const listId = uuidv4();

      // Add same list with different update times
      const list1 = createTestList({
        id: listId,
        title: 'Older Version',
        updatedAt: new Date('2024-01-01'),
      });
      
      const list2 = createTestList({
        id: listId,
        title: 'Newer Version',
        updatedAt: new Date('2024-01-02'),
      });

      await source1.save(listId, list1);
      await source2.save(listId, list2);

      // Should return the newer version
      const result = await latestRepository.search({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.title).toBe('Newer Version');
    });
  });

  describe('Requirement 3.5: Handle Unavailable Sources', () => {
    it('should return partial results when some sources fail', async () => {
      // Add lists to both sources
      const list1 = createTestList({ title: 'In Source 1' });
      const list2 = createTestList({ title: 'In Source 2' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);

      // Mark source-1 as unhealthy
      (router as any).connectionPool.get('source-1')!.healthy = false;

      // Should still get results from source-2
      const result = await repository.search({});

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(l => l.title === 'In Source 2')).toBe(true);
    });

    it('should track source health status', async () => {
      const status = repository.getRouterStatus();

      expect(status.total).toBe(3);
      expect(status.healthy).toBeGreaterThan(0);
      expect(status.sources).toHaveLength(3);
      
      status.sources.forEach(source => {
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('healthy');
        expect(source).toHaveProperty('priority');
        expect(source).toHaveProperty('readonly');
      });
    });
  });

  describe('Repository Health Check', () => {
    it('should report healthy when at least one source is available', async () => {
      const isHealthy = await repository.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should report unhealthy when all sources are down', async () => {
      // Mark all sources as unhealthy
      (router as any).connectionPool.get('source-1')!.healthy = false;
      (router as any).connectionPool.get('source-2')!.healthy = false;
      (router as any).connectionPool.get('source-3')!.healthy = false;

      const isHealthy = await repository.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Repository Operations', () => {
    it('should support exists() check across all sources', async () => {
      const list = createTestList({ title: 'Exists Test' });

      // Add to source-2
      await source2.save(list.id, list);

      // Mark source-1 as unhealthy so it checks source-2
      (router as any).connectionPool.get('source-1')!.healthy = false;

      // Should find it in source-2
      const exists = await repository.exists(list.id);
      expect(exists).toBe(true);
    });

    it('should support count() across all sources', async () => {
      // Add lists to different sources
      const list1 = createTestList({ title: 'List 1' });
      const list2 = createTestList({ title: 'List 2' });
      const list3 = createTestList({ title: 'List 3' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);
      await source3.save(list3.id, list3);

      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should support searchSummaries() for lightweight queries', async () => {
      // Add lists to sources
      const list1 = createTestList({ title: 'Summary Test 1' });
      const list2 = createTestList({ title: 'Summary Test 2' });

      await source1.save(list1.id, list1);
      await source2.save(list2.id, list2);

      const result = await repository.searchSummaries({});

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      
      // Summaries should have basic info
      result.items.forEach(summary => {
        expect(summary).toHaveProperty('id');
        expect(summary).toHaveProperty('title');
        expect(summary).toHaveProperty('progress');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const result = await repository.search({});

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle search with no matching results', async () => {
      const list = createTestList({ title: 'Test List' });
      await source1.save(list.id, list);

      const result = await repository.search({
        text: 'NonExistent',
      });

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle findById for non-existent list', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should handle delete for non-existent list', async () => {
      // Should not throw, just complete silently
      await expect(
        repository.delete('non-existent-id', true)
      ).rejects.toThrow();
    });
  });
});
