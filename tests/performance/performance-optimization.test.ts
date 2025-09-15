/**
 * Tests for performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrettyPrintFormatter } from '../../src/shared/utils/pretty-print-formatter.js';
import { ProjectStatisticsCache } from '../../src/infrastructure/storage/project-statistics-cache.js';
import { NotesSearchIndex } from '../../src/infrastructure/storage/notes-search-index.js';
import { DatasetGenerator } from '../utils/dataset-generator.js';
import { performanceMonitor } from '../../src/infrastructure/monitoring/performance-monitor.js';
import type { TodoList, TodoItem, ImplementationNote } from '../../src/shared/types/todo.js';

describe('Performance Optimizations', () => {
  describe('PrettyPrintFormatter', () => {
    let formatter: PrettyPrintFormatter;
    let largeTodoList: TodoList;

    beforeEach(() => {
      formatter = new PrettyPrintFormatter();
      
      // Create a large todo list for performance testing
      const items: TodoItem[] = [];
      for (let i = 0; i < 1000; i++) {
        items.push({
          id: `item-${i}`,
          title: `Task ${i}`,
          description: `Description for task ${i}`,
          status: i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'in_progress' : 'pending',
          priority: (i % 5) + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          dependencies: [],
          estimatedDuration: 30,
          tags: [`tag-${i % 10}`],
          implementationNotes: [],
          metadata: {},
        } as TodoItem);
      }

      largeTodoList = {
        id: 'large-list',
        title: 'Large Test List',
        description: 'A large list for performance testing',
        items,
        createdAt: new Date(),
        updatedAt: new Date(),
        context: 'test',
        projectTag: 'test',
        isArchived: false,
        totalItems: items.length,
        completedItems: Math.floor(items.length / 4),
        progress: 25,
        analytics: {
          createdAt: new Date(),
          totalTimeSpent: 0,
          averageCompletionTime: 0,
          productivityScore: 0,
          completionRate: 0,
          taskComplexityDistribution: { simple: 0, medium: 0, complex: 0 },
          timeDistribution: { planning: 0, execution: 0, review: 0 },
        },
        implementationNotes: [],
        metadata: {},
      };
    });

    afterEach(() => {
      formatter.clearCache();
    });

    it('should format large task lists efficiently', async () => {
      const startTime = performance.now();
      
      const result = await formatter.formatTaskList(largeTodoList, {
        maxItems: 500, // Limit for performance
        lazyLoad: true,
        chunkSize: 50,
        enableCaching: true,
      });
      
      const duration = performance.now() - startTime;
      
      expect(result.content).toBeDefined();
      expect(result.metadata.processingTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.metadata.wasTruncated).toBe(true); // Should be truncated due to maxItems
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Total time including overhead
    });

    it('should use caching effectively', async () => {
      // First call - should populate cache
      await formatter.formatTaskList(largeTodoList, {
        maxItems: 100,
        enableCaching: true,
      });
      
      const cacheStats1 = formatter.getCacheStats();
      expect(cacheStats1.size).toBeGreaterThan(0);
      
      // Second call - should use cache
      const result2 = await formatter.formatTaskList(largeTodoList, {
        maxItems: 100,
        enableCaching: true,
      });
      
      const cacheStats2 = formatter.getCacheStats();
      expect(cacheStats2.hits).toBeGreaterThan(cacheStats1.hits);
      expect(result2.metadata.cacheHits).toBeGreaterThan(0);
    });

    it('should handle chunked processing', async () => {
      const result = await formatter.formatTaskList(largeTodoList, {
        maxItems: 200,
        lazyLoad: true,
        chunkSize: 25,
        enableCaching: true,
      });
      
      expect(result.chunks.length).toBeGreaterThan(1);
      
      // Verify chunks cover all items
      const totalChunkItems = result.chunks.reduce((sum, chunk) => sum + chunk.itemCount, 0);
      expect(totalChunkItems).toBe(200); // Should match maxItems
    });

    it('should optimize compact mode formatting', async () => {
      const startTime = performance.now();
      
      const result = await formatter.formatTaskList(largeTodoList, {
        compactMode: true,
        maxItems: 1000,
        enableCaching: true,
      });
      
      const duration = performance.now() - startTime;
      
      expect(result.content).toBeDefined();
      expect(duration).toBeLessThan(500); // Compact mode should be faster
      expect(result.content.split('\n').length).toBeLessThan(2000); // Should be more compact
    });
  });

  describe('ProjectStatisticsCache', () => {
    let cache: ProjectStatisticsCache;

    beforeEach(() => {
      cache = new ProjectStatisticsCache({
        maxEntries: 50,
        ttlMs: 60000, // 1 minute for testing
      });
    });

    afterEach(() => {
      cache.shutdown();
    });

    it('should cache and retrieve project summaries', async () => {
      const mockSummaries = [
        {
          tag: 'project1',
          listCount: 5,
          totalTasks: 25,
          completedTasks: 10,
          lastActivity: new Date(),
          completionRate: 40,
        },
      ];

      const cacheKey = cache.generateSummaryKey({ includeAll: true });
      
      // Cache the summaries
      cache.setProjectSummaries(cacheKey, mockSummaries, ['list1', 'list2']);
      
      // Retrieve from cache
      const cached = await cache.getProjectSummaries(cacheKey);
      expect(cached).toEqual(mockSummaries);
      
      // Check cache stats
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should invalidate cache when lists change', async () => {
      const mockStats = {
        tag: 'project1',
        totalLists: 5,
        activeLists: 4,
        archivedLists: 1,
        totalTasks: 25,
        completedTasks: 10,
        inProgressTasks: 8,
        pendingTasks: 7,
        completionRate: 40,
        averageListProgress: 50,
        lastActivity: new Date(),
        oldestList: new Date(),
        newestList: new Date(),
      };

      // Cache project stats
      cache.setProjectStats('project1', mockStats, ['list1', 'list2']);
      
      // Verify it's cached
      let cached = await cache.getProjectStats('project1');
      expect(cached).toEqual(mockStats);
      
      // Invalidate for a specific list
      cache.invalidateForList('list1', 'project1');
      
      // Should no longer be cached
      cached = await cache.getProjectStats('project1');
      expect(cached).toBeNull();
    });

    it('should handle cache eviction under memory pressure', async () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 100; i++) {
        const mockStats = {
          tag: `project${i}`,
          totalLists: 1,
          activeLists: 1,
          archivedLists: 0,
          totalTasks: 5,
          completedTasks: 2,
          inProgressTasks: 2,
          pendingTasks: 1,
          completionRate: 40,
          averageListProgress: 50,
          lastActivity: new Date(),
          oldestList: new Date(),
          newestList: new Date(),
        };
        
        cache.setProjectStats(`project${i}`, mockStats);
      }
      
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(50); // Should respect maxEntries
      expect(stats.evictionCount).toBeGreaterThan(0);
    });
  });

  describe('NotesSearchIndex', () => {
    let searchIndex: NotesSearchIndex;
    let testNotes: Array<ImplementationNote & { entityId: string; entityType: 'task' | 'list' }>;

    beforeEach(() => {
      searchIndex = new NotesSearchIndex();
      
      // Create test notes
      testNotes = [];
      for (let i = 0; i < 100; i++) {
        testNotes.push({
          id: `note-${i}`,
          content: `This is test note ${i} about ${i % 2 === 0 ? 'technical implementation' : 'general planning'} with some keywords like performance and optimization`,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: i % 4 === 0 ? 'technical' : i % 4 === 1 ? 'decision' : i % 4 === 2 ? 'learning' : 'general',
          entityId: `entity-${Math.floor(i / 10)}`,
          entityType: i % 2 === 0 ? 'task' : 'list',
        });
      }
      
      // Index all notes
      for (const note of testNotes) {
        searchIndex.indexNote(note, note.entityId, note.entityType);
      }
    });

    afterEach(() => {
      searchIndex.clearIndex();
    });

    it('should index notes efficiently', () => {
      const stats = searchIndex.getStats();
      expect(stats.totalNotes).toBe(100);
      expect(stats.totalTerms).toBeGreaterThan(0);
      expect(stats.averageTermsPerNote).toBeGreaterThan(0);
    });

    it('should search notes quickly', () => {
      const noteContentMap = new Map(testNotes.map(note => [note.id, note]));
      
      const startTime = performance.now();
      
      const result = searchIndex.search(
        {
          terms: ['technical', 'performance'],
          limit: 20,
        },
        noteContentMap
      );
      
      const searchTime = performance.now() - startTime;
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.searchTime).toBeLessThan(100); // Should be very fast
      expect(searchTime).toBeLessThan(50); // Including overhead
      expect(result.indexStats.totalNotes).toBe(100);
    });

    it('should filter search results efficiently', () => {
      const noteContentMap = new Map(testNotes.map(note => [note.id, note]));
      
      const result = searchIndex.search(
        {
          terms: ['test'],
          entityType: 'task',
          noteType: 'technical',
          limit: 10,
        },
        noteContentMap
      );
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // Verify all results match filters
      for (const searchResult of result.results) {
        expect(searchResult.metadata.entityType).toBe('task');
        expect(searchResult.metadata.type).toBe('technical');
      }
    });

    it('should provide search suggestions', () => {
      const suggestions = searchIndex.getSuggestions('tech', 5);
      expect(suggestions).toContain('technical');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle index rebuilding', () => {
      const startTime = performance.now();
      
      searchIndex.rebuildIndex(testNotes);
      
      const rebuildTime = performance.now() - startTime;
      
      expect(rebuildTime).toBeLessThan(1000); // Should rebuild quickly
      
      const stats = searchIndex.getStats();
      expect(stats.totalNotes).toBe(100);
      expect(stats.rebuildCount).toBeGreaterThan(0);
    });
  });



  describe('PerformanceMonitor Integration', () => {
    beforeEach(() => {
      performanceMonitor.clearData();
    });

    afterEach(() => {
      performanceMonitor.stopMonitoring();
    });

    it('should monitor performance of optimized operations', async () => {
      performanceMonitor.startMonitoring(1000); // 1 second interval for testing
      
      const formatter = new PrettyPrintFormatter();
      const testList: TodoList = {
        id: 'test-list',
        title: 'Test List',
        description: 'Test',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        context: 'test',
        projectTag: 'test',
        isArchived: false,
        totalItems: 0,
        completedItems: 0,
        progress: 0,
        analytics: {
          createdAt: new Date(),
          totalTimeSpent: 0,
          averageCompletionTime: 0,
          productivityScore: 0,
          completionRate: 0,
          taskComplexityDistribution: { simple: 0, medium: 0, complex: 0 },
          timeDistribution: { planning: 0, execution: 0, review: 0 },
        },
        implementationNotes: [],
        metadata: {},
      };

      // Perform some operations that should be monitored
      await formatter.formatTaskList(testList);
      
      // Wait a bit for monitoring to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = performanceMonitor.getDetailedOperationMetrics('format_task_list');
      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.totalCalls).toBeGreaterThan(0);
        expect(metrics.averageDuration).toBeGreaterThan(0);
      }
    });

    it('should record migration benchmarks', () => {
      const memoryBefore = process.memoryUsage();
      const memoryAfter = process.memoryUsage();
      
      performanceMonitor.recordBenchmark(
        'test-migration',
        100,
        {
          datasetSize: 1000,
          memoryBefore: memoryBefore.heapUsed,
          memoryAfter: memoryAfter.heapUsed,
        }
      );
      
      const benchmarks = performanceMonitor.getBenchmarkHistory('test-migration');
      expect(benchmarks.length).toBe(1);
      expect(benchmarks[0]!.name).toBe('test-migration');
      expect(benchmarks[0]!.metadata.datasetSize).toBe(1000);
    });

    it('should generate performance reports', async () => {
      // Generate some test data
      performanceMonitor.recordBenchmark(
        'test-migration',
        50,
        {
          datasetSize: 500,
          memoryUsage: process.memoryUsage(),
        }
      );
      
      const report = performanceMonitor.generatePerformanceReport();
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Memory Usage');
    });
  });
});