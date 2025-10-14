/**
 * Unit tests for SearchOrchestratorImpl
 * Tests enhanced search and filter options in orchestration layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchOrchestratorImpl } from '../../../../../src/core/orchestration/services/search-orchestrator-impl.js';
import { DataDelegationService } from '../../../../../src/data/delegation/data-delegation-service.js';
import { TaskList } from '../../../../../src/domain/models/task-list.js';
import { Task } from '../../../../../src/domain/models/task.js';
import {
  SearchCriteria,
  AdvancedSearchOptions,
} from '../../../../../src/shared/types/search.js';
import { TaskStatus, Priority } from '../../../../../src/shared/types/task.js';

describe('SearchOrchestratorImpl', () => {
  let searchOrchestrator: SearchOrchestratorImpl;
  let mockDataDelegationService: DataDelegationService;

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Implement authentication',
      description: 'Add user authentication system',
      status: 'pending' as TaskStatus,
      priority: 4 as Priority,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
      tags: ['auth', 'security', 'high-priority'],
      dependencies: [],
      estimatedDuration: 120,
      agentPromptTemplate: 'Implement secure authentication',
    },
    {
      id: '2',
      title: 'Fix bug in search',
      description: 'Search functionality not working properly',
      status: 'in_progress' as TaskStatus,
      priority: 3 as Priority,
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-04'),
      tags: ['bug', 'search'],
      dependencies: ['1'],
      estimatedDuration: 60,
    },
    {
      id: '3',
      title: 'Write documentation',
      description: 'Create user documentation',
      status: 'completed' as TaskStatus,
      priority: 2 as Priority,
      createdAt: new Date('2023-01-05'),
      updatedAt: new Date('2023-01-06'),
      completedAt: new Date('2023-01-07'),
      tags: ['docs', 'writing'],
      dependencies: [],
      estimatedDuration: 180,
    },
  ];

  const mockLists: TaskList[] = [
    {
      id: 'list-1',
      title: 'Development Tasks',
      description: 'Tasks for development work',
      items: mockTasks,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
      projectTag: 'development',
      totalItems: 3,
      completedItems: 1,
      progress: 33.33,
    },
  ];

  beforeEach(() => {
    mockDataDelegationService = {
      searchTasks: vi.fn().mockResolvedValue(mockTasks),
      searchLists: vi.fn().mockResolvedValue(mockLists),
      execute: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      getList: vi.fn(),
    } as unknown as DataDelegationService;

    searchOrchestrator = new SearchOrchestratorImpl(mockDataDelegationService);
  });

  describe('searchTasks', () => {
    it('should search tasks with basic criteria', async () => {
      const criteria: SearchCriteria = {
        query: 'authentication',
        limit: 10,
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Implement authentication');
      expect(result.totalCount).toBe(1);
      expect(result.searchTime).toBeGreaterThan(0);
      expect(result.filtersApplied).toContain('text-search');
    });

    it('should filter tasks by status', async () => {
      const criteria: SearchCriteria = {
        filters: {
          status: ['pending', 'in_progress'],
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(2);
      expect(
        result.items.every(task =>
          ['pending', 'in_progress'].includes(task.status)
        )
      ).toBe(true);
      expect(result.filtersApplied).toContain('status-filter');
    });

    it('should filter tasks by priority', async () => {
      const criteria: SearchCriteria = {
        filters: {
          priority: [4, 5],
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].priority).toBe(4);
      expect(result.filtersApplied).toContain('priority-filter');
    });

    it('should filter tasks by tags with AND operator', async () => {
      const criteria: SearchCriteria = {
        filters: {
          tags: ['auth', 'security'],
          tagOperator: 'AND',
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tags).toEqual(
        expect.arrayContaining(['auth', 'security'])
      );
      expect(result.filtersApplied).toContain('tag-filter');
    });

    it('should filter tasks by tags with OR operator', async () => {
      const criteria: SearchCriteria = {
        filters: {
          tags: ['auth', 'docs'],
          tagOperator: 'OR',
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(2);
      expect(result.filtersApplied).toContain('tag-filter');
    });

    it('should filter tasks by dependencies', async () => {
      const criteria: SearchCriteria = {
        filters: {
          hasDependencies: true,
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].dependencies).toHaveLength(1);
      expect(result.filtersApplied).toContain('dependency-filter');
    });

    it('should filter tasks by estimated duration', async () => {
      const criteria: SearchCriteria = {
        filters: {
          estimatedDuration: {
            min: 100,
            max: 150,
          },
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].estimatedDuration).toBe(120);
      expect(result.filtersApplied).toContain('duration-filter');
    });

    it('should filter tasks by agent prompt template', async () => {
      const criteria: SearchCriteria = {
        filters: {
          hasAgentPromptTemplate: true,
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].agentPromptTemplate).toBeDefined();
      expect(result.filtersApplied).toContain('agent-prompt-filter');
    });

    it('should exclude completed tasks when specified', async () => {
      const criteria: SearchCriteria = {
        filters: {
          includeCompleted: false,
        },
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(2);
      expect(result.items.every(task => task.status !== 'completed')).toBe(
        true
      );
      expect(result.filtersApplied).toContain('exclude-completed');
    });

    it('should sort tasks by priority descending', async () => {
      const criteria: SearchCriteria = {
        sortBy: 'priority',
        sortOrder: 'desc',
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items[0].priority).toBe(4);
      expect(result.items[1].priority).toBe(3);
      expect(result.items[2].priority).toBe(2);
      expect(result.sortedBy).toBe('priority');
    });

    it('should apply pagination correctly', async () => {
      const criteria: SearchCriteria = {
        limit: 2,
        offset: 1,
      };

      const result = await searchOrchestrator.searchTasks(criteria);

      expect(result.items).toHaveLength(2);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should validate search criteria and throw error for invalid limit', async () => {
      const criteria: SearchCriteria = {
        limit: 1000, // Invalid - exceeds maximum
      };

      await expect(searchOrchestrator.searchTasks(criteria)).rejects.toThrow(
        'Invalid search criteria'
      );
    });
  });

  describe('searchLists', () => {
    it('should search lists with text query', async () => {
      const criteria: SearchCriteria = {
        query: 'development',
      };

      const result = await searchOrchestrator.searchLists(criteria);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Development Tasks');
      expect(result.searchTime).toBeGreaterThan(0);
    });

    it('should sort lists by title', async () => {
      const criteria: SearchCriteria = {
        sortBy: 'title',
        sortOrder: 'asc',
      };

      const result = await searchOrchestrator.searchLists(criteria);

      expect(result.sortedBy).toBe('title');
    });
  });

  describe('unifiedSearch', () => {
    it('should search both tasks and lists', async () => {
      const criteria: SearchCriteria = {
        // No query - should return all tasks and lists
      };

      const result = await searchOrchestrator.unifiedSearch(criteria);

      expect(result.tasks.totalCount).toBeGreaterThan(0);
      expect(result.lists.totalCount).toBeGreaterThan(0);
      expect(result.totalResults).toBe(
        result.tasks.totalCount + result.lists.totalCount
      );
      expect(result.searchTime).toBeGreaterThan(0);
    });

    it('should limit results per type when specified', async () => {
      const criteria: SearchCriteria = {
        maxResultsPerType: 1,
      };

      const result = await searchOrchestrator.unifiedSearch(criteria);

      expect(result.tasks.items.length).toBeLessThanOrEqual(1);
      expect(result.lists.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search with options', async () => {
      const criteria: SearchCriteria = {
        query: 'auth',
        filters: {
          priority: [4, 5],
        },
      };

      const options: AdvancedSearchOptions = {
        includeScore: true,
        maxSearchTime: 5000,
      };

      const result = await searchOrchestrator.advancedSearch(criteria, options);

      expect(result.items).toHaveLength(1);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.itemsScanned).toBe(3);
      expect(result.metrics.itemsFiltered).toBe(1);
      expect(result.validation).toBeDefined();
      expect(result.validation.isValid).toBe(true);
    });

    it('should validate advanced options', async () => {
      const criteria: SearchCriteria = {
        query: 'test',
      };

      const options: AdvancedSearchOptions = {
        fuzzyThreshold: 1.5, // Invalid - exceeds maximum
      };

      await expect(
        searchOrchestrator.advancedSearch(criteria, options)
      ).rejects.toThrow('Invalid search parameters');
    });
  });

  describe('fuzzySearch', () => {
    it('should perform fuzzy search', async () => {
      const result = await searchOrchestrator.fuzzySearch('authentication', {
        threshold: 0.8, // Higher threshold for more precise matching
        limit: 10,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].title).toContain('authentication');
      expect(result.filtersApplied).toContain('fuzzy-search');
    });

    it('should throw error for empty query', async () => {
      await expect(searchOrchestrator.fuzzySearch('')).rejects.toThrow(
        'Query is required for fuzzy search'
      );
    });
  });

  describe('validateSearchCriteria', () => {
    it('should validate valid criteria', async () => {
      const criteria: SearchCriteria = {
        query: 'test',
        limit: 10,
      };

      const result = await searchOrchestrator.validateSearchCriteria(criteria);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid criteria', async () => {
      const criteria: SearchCriteria = {
        limit: -1, // Invalid
        offset: -5, // Invalid
      };

      const result = await searchOrchestrator.validateSearchCriteria(criteria);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide performance suggestions', async () => {
      const criteria: SearchCriteria = {
        limit: 200, // Large limit
        query: 'ab', // Short query
      };

      const result = await searchOrchestrator.validateSearchCriteria(criteria);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('pagination'))).toBe(true);
      expect(
        result.suggestions.some(s => s.includes('Longer search queries'))
      ).toBe(true);
    });
  });

  describe('filterTasksByAgentPrompt', () => {
    it('should filter tasks by agent prompt template presence', async () => {
      const result = await searchOrchestrator.filterTasksByAgentPrompt(
        'list-1',
        true
      );

      expect(result).toHaveLength(1);
      expect(result[0].agentPromptTemplate).toBeDefined();
    });

    it('should filter tasks without agent prompt template', async () => {
      const result = await searchOrchestrator.filterTasksByAgentPrompt(
        'list-1',
        false
      );

      expect(result).toHaveLength(2);
      expect(result.every(task => !task.agentPromptTemplate)).toBe(true);
    });
  });

  describe('getTasksForDisplay', () => {
    it('should get tasks for display with options', async () => {
      const result = await searchOrchestrator.getTasksForDisplay('list-1', {
        format: 'detailed',
        groupBy: 'status',
        includeCompleted: true,
      });

      expect(result).toHaveLength(3);
    });

    it('should exclude completed tasks when specified', async () => {
      const result = await searchOrchestrator.getTasksForDisplay('list-1', {
        format: 'detailed',
        groupBy: 'status',
        includeCompleted: false,
      });

      expect(result).toHaveLength(2);
      expect(result.every(task => task.status !== 'completed')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle data delegation service errors gracefully', async () => {
      mockDataDelegationService.searchTasks = vi
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const criteria: SearchCriteria = { query: 'test' };

      await expect(searchOrchestrator.searchTasks(criteria)).rejects.toThrow(
        'Failed to search tasks'
      );
    });
  });
});
