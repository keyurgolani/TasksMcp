/**
 * Search orchestrator implementation
 * Provides unified search across tasks and lists using data delegation layer
 */

import { DataDelegationService } from '../../../data/delegation/data-delegation-service.js';
import { TaskList } from '../../../domain/models/task-list.js';
import { Task } from '../../../domain/models/task.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import {
  SearchCriteria,
  SearchResult,
  UnifiedSearchCriteria,
  UnifiedSearchResult,
  SearchMetrics,
  AdvancedSearchOptions,
  SearchResultWithMetrics,
  SearchFilterValidation,
} from '../../../shared/types/search.js';
import { ValidationResult } from '../../../shared/types/validation.js';
import { SearchOrchestrator } from '../interfaces/search-orchestrator.js';
import { SearchValidator } from '../validators/search-validator.js';

export class SearchOrchestratorImpl implements SearchOrchestrator {
  private validator: SearchValidator;

  constructor(private dataDelegationService: DataDelegationService) {
    this.validator = new SearchValidator();
  }

  async searchTasks(criteria: SearchCriteria): Promise<SearchResult<Task>> {
    const startTime = Date.now();

    try {
      // Validate search criteria
      const validation = this.validator.validateSearchCriteria(criteria);
      if (!validation.isValid) {
        throw new OrchestrationError(
          `Invalid search criteria: ${validation.errors.map(e => e.message).join(', ')}`,
          'SearchOrchestrator.searchTasks',
          criteria,
          'Valid search criteria',
          validation.errors.map(e => e.actionableGuidance).join('; ')
        );
      }

      // Get all tasks from data layer
      const allTasks = (await this.dataDelegationService.searchTasks(
        criteria
      )) as Task[];

      // Apply filtering
      const filteredTasks = this.applyFiltering(allTasks, criteria);

      // Apply sorting
      const sortedTasks = this.applySorting(filteredTasks, criteria);

      // Apply pagination
      const { paginatedTasks, hasMore } = this.applyPagination(
        sortedTasks,
        criteria
      );

      const searchTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      const filtersApplied = this.getAppliedFilters(criteria);

      return {
        items: paginatedTasks,
        totalCount: filteredTasks.length,
        hasMore,
        offset: criteria.offset || 0,
        limit: criteria.limit || paginatedTasks.length,
        searchTime,
        filtersApplied,
        sortedBy: criteria.sortBy || undefined,
      };
    } catch (error) {
      if (error instanceof OrchestrationError) {
        throw error;
      }

      throw new OrchestrationError(
        'Failed to search tasks',
        'SearchOrchestrator.searchTasks',
        criteria,
        'Valid search criteria',
        'Check search parameters and try again'
      );
    }
  }

  async searchLists(criteria: SearchCriteria): Promise<SearchResult<TaskList>> {
    const startTime = Date.now();

    try {
      // Validate search criteria
      const validation = this.validator.validateSearchCriteria(criteria);
      if (!validation.isValid) {
        throw new OrchestrationError(
          `Invalid search criteria: ${validation.errors.map(e => e.message).join(', ')}`,
          'SearchOrchestrator.searchLists',
          criteria,
          'Valid search criteria',
          validation.errors.map(e => e.actionableGuidance).join('; ')
        );
      }

      // Get all lists from data layer
      const allLists = (await this.dataDelegationService.searchLists(
        criteria
      )) as TaskList[];

      // Apply text search filtering for lists
      const filteredLists = this.applyListFiltering(allLists, criteria);

      // Apply sorting for lists
      const sortedLists = this.applyListSorting(filteredLists, criteria);

      // Apply pagination
      const { paginatedTasks: paginatedLists, hasMore } = this.applyPagination(
        sortedLists,
        criteria
      );

      const searchTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      const filtersApplied = this.getAppliedFilters(criteria);

      return {
        items: paginatedLists as TaskList[],
        totalCount: filteredLists.length,
        hasMore,
        offset: criteria.offset || 0,
        limit: criteria.limit || paginatedLists.length,
        searchTime,
        filtersApplied,
        sortedBy: criteria.sortBy || undefined,
      };
    } catch (error) {
      if (error instanceof OrchestrationError) {
        throw error;
      }

      throw new OrchestrationError(
        'Failed to search lists',
        'SearchOrchestrator.searchLists',
        criteria,
        'Valid search criteria',
        'Check search parameters and try again'
      );
    }
  }

  async unifiedSearch(
    criteria: UnifiedSearchCriteria
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();

    try {
      // Validate unified search criteria
      const validation = this.validator.validateSearchCriteria(criteria);
      if (!validation.isValid) {
        throw new OrchestrationError(
          `Invalid unified search criteria: ${validation.errors.map(e => e.message).join(', ')}`,
          'SearchOrchestrator.unifiedSearch',
          criteria,
          'Valid unified search criteria',
          validation.errors.map(e => e.actionableGuidance).join('; ')
        );
      }

      // Determine what to search
      const searchTasks = criteria.searchTasks !== false; // Default to true
      const searchLists = criteria.searchLists !== false; // Default to true

      // Limit results per type if specified
      const taskCriteria = criteria.maxResultsPerType
        ? {
            ...criteria,
            limit: Math.min(criteria.limit || 50, criteria.maxResultsPerType),
          }
        : criteria;
      const listCriteria = criteria.maxResultsPerType
        ? {
            ...criteria,
            limit: Math.min(criteria.limit || 50, criteria.maxResultsPerType),
          }
        : criteria;

      // Search both tasks and lists in parallel
      const searchPromises: Promise<SearchResult<unknown>>[] = [];

      if (searchTasks) {
        searchPromises.push(this.searchTasks(taskCriteria));
      }

      if (searchLists) {
        searchPromises.push(this.searchLists(listCriteria));
      }

      const results = await Promise.all(searchPromises);

      let taskResults: SearchResult<unknown>;
      let listResults: SearchResult<unknown>;

      if (searchTasks && searchLists) {
        taskResults = results[0] || {
          items: [],
          totalCount: 0,
          hasMore: false,
          offset: 0,
          limit: 0,
          searchTime: 0,
          filtersApplied: [],
        };
        listResults = results[1] || {
          items: [],
          totalCount: 0,
          hasMore: false,
          offset: 0,
          limit: 0,
          searchTime: 0,
          filtersApplied: [],
        };
      } else if (searchTasks) {
        taskResults = results[0] || {
          items: [],
          totalCount: 0,
          hasMore: false,
          offset: 0,
          limit: 0,
          searchTime: 0,
          filtersApplied: [],
        };
        listResults = {
          items: [],
          totalCount: 0,
          hasMore: false,
          offset: 0,
          limit: 0,
          searchTime: 0,
          filtersApplied: [],
        };
      } else {
        listResults = results[0] || {
          items: [],
          totalCount: 0,
          hasMore: false,
          offset: 0,
          limit: 0,
          searchTime: 0,
          filtersApplied: [],
        };
        taskResults = {
          items: [],
          totalCount: 0,
          hasMore: false,
          offset: 0,
          limit: 0,
          searchTime: 0,
          filtersApplied: [],
        };
      }

      const totalSearchTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      const filtersApplied = this.getAppliedFilters(criteria);

      return {
        tasks: taskResults,
        lists: listResults,
        totalCount: taskResults.totalCount + listResults.totalCount,
        totalResults: taskResults.totalCount + listResults.totalCount,
        searchTime: totalSearchTime,
        tasksSearchTime: taskResults.searchTime || 0,
        listsSearchTime: listResults.searchTime || 0,
        filtersApplied,
        searchQuery: criteria.query || undefined,
      };
    } catch (error) {
      if (error instanceof OrchestrationError) {
        throw error;
      }

      throw new OrchestrationError(
        'Failed to perform unified search',
        'SearchOrchestrator.unifiedSearch',
        criteria,
        'Valid unified search criteria',
        'Check search parameters and try again'
      );
    }
  }

  async filterTasksByAgentPrompt(
    listId: string,
    hasTemplate: boolean
  ): Promise<Task[]> {
    try {
      // Get all tasks from the specified list
      const allTasks = (await this.dataDelegationService.searchTasks({
        listId,
      })) as Task[];

      // Filter by agent prompt template presence
      const filteredTasks = allTasks.filter(task => {
        const hasAgentTemplate = !!(
          task.agentPromptTemplate && task.agentPromptTemplate.length > 0
        );
        return hasAgentTemplate === hasTemplate;
      });

      return filteredTasks;
    } catch (_error) {
      throw new OrchestrationError(
        'Failed to filter tasks by agent prompt template',
        'SearchOrchestrator.filterTasksByAgentPrompt',
        { listId, hasTemplate },
        'Valid list ID and boolean flag',
        'Check list ID and try again'
      );
    }
  }

  async getTasksForDisplay(
    listId: string,
    options: {
      format: string;
      groupBy: string;
      includeCompleted: boolean;
    }
  ): Promise<Task[]> {
    try {
      // Get all tasks from the specified list
      const allTasks = (await this.dataDelegationService.searchTasks({
        listId,
      })) as Task[];

      // Filter by completion status if needed
      let filteredTasks = allTasks;
      if (!options.includeCompleted) {
        filteredTasks = allTasks.filter(task => task.status !== 'completed');
      }

      // Apply formatting and grouping logic
      return this.formatTasksForDisplay(filteredTasks, options);
    } catch (_error) {
      throw new OrchestrationError(
        'Failed to get tasks for display',
        'SearchOrchestrator.getTasksForDisplay',
        { listId, options },
        'Valid list ID and display options',
        'Check list ID and display options'
      );
    }
  }

  validate(_data: unknown): ValidationResult {
    // Validation implementation
    return { isValid: true, errors: [], warnings: [] };
  }

  handleError(error: Error, context: string): OrchestrationError {
    return new OrchestrationError(
      error.message,
      context,
      undefined,
      undefined,
      'Check the operation parameters and try again'
    );
  }

  async delegateData(_operation: unknown): Promise<unknown> {
    // Delegate to data delegation service
    return this.dataDelegationService;
  }

  /**
   * Apply filtering to tasks based on search criteria
   */
  private applyFiltering(tasks: Task[], criteria: SearchCriteria): Task[] {
    let filteredTasks = [...tasks];

    if (!criteria.filters) {
      return this.applyTextSearch(filteredTasks, criteria.query);
    }

    const filters = criteria.filters;

    // Apply text search first
    if (criteria.query) {
      filteredTasks = this.applyTextSearch(
        filteredTasks,
        criteria.query,
        filters.searchFields,
        filters.caseSensitive,
        filters.exactMatch
      );
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        filters.status!.includes(task.status)
      );
    }

    // Apply priority filter
    if (filters.priority && filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        filters.priority!.includes(task.priority)
      );
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      filteredTasks = this.applyTagFilter(
        filteredTasks,
        filters.tags,
        filters.tagOperator || 'AND'
      );
    }

    // Apply dependency filters
    if (filters.hasDependencies !== undefined) {
      filteredTasks = filteredTasks.filter(task => {
        const hasDeps = task.dependencies && task.dependencies.length > 0;
        return hasDeps === filters.hasDependencies;
      });
    }

    // Apply date range filter
    if (filters.dateRange) {
      filteredTasks = this.applyDateRangeFilter(
        filteredTasks,
        filters.dateRange
      );
    }

    // Apply duration filter
    if (filters.estimatedDuration) {
      filteredTasks = this.applyDurationFilter(
        filteredTasks,
        filters.estimatedDuration
      );
    }

    // Apply agent prompt template filter
    if (filters.hasAgentPromptTemplate !== undefined) {
      filteredTasks = filteredTasks.filter(task => {
        const hasTemplate =
          task.agentPromptTemplate && task.agentPromptTemplate.length > 0;
        return hasTemplate === filters.hasAgentPromptTemplate;
      });
    }

    // Apply completion filter
    if (filters.includeCompleted === false) {
      filteredTasks = filteredTasks.filter(task => task.status !== 'completed');
    }

    return filteredTasks;
  }

  /**
   * Apply text search with options
   */
  private applyTextSearch(
    tasks: Task[],
    query?: string,
    searchFields?: ('title' | 'description' | 'tags')[],
    caseSensitive?: boolean,
    exactMatch?: boolean
  ): Task[] {
    if (!query) return tasks;

    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const fields = searchFields || ['title', 'description', 'tags'];

    return tasks.filter(task => {
      for (const field of fields) {
        let fieldValue = '';

        switch (field) {
          case 'title':
            fieldValue = task.title || '';
            break;
          case 'description':
            fieldValue = task.description || '';
            break;
          case 'tags':
            fieldValue = (task.tags || []).join(' ');
            break;
        }

        if (!caseSensitive) {
          fieldValue = fieldValue.toLowerCase();
        }

        const matches = exactMatch
          ? fieldValue === searchQuery
          : fieldValue.includes(searchQuery);

        if (matches) return true;
      }

      return false;
    });
  }

  /**
   * Apply tag filtering with AND/OR logic
   */
  private applyTagFilter(
    tasks: Task[],
    tags: string[],
    operator: 'AND' | 'OR'
  ): Task[] {
    return tasks.filter(task => {
      const taskTags = (task.tags || []).map(tag => tag.toLowerCase());
      const searchTags = tags.map(tag => tag.toLowerCase());

      if (operator === 'AND') {
        return searchTags.every(searchTag =>
          taskTags.some(taskTag => taskTag.includes(searchTag))
        );
      } else {
        return searchTags.some(searchTag =>
          taskTags.some(taskTag => taskTag.includes(searchTag))
        );
      }
    });
  }

  /**
   * Apply date range filtering
   */
  private applyDateRangeFilter(
    tasks: Task[],
    dateRange: NonNullable<NonNullable<SearchCriteria['filters']>['dateRange']>
  ): Task[] {
    return tasks.filter(task => {
      let taskDate: Date | undefined;

      switch (dateRange.field || 'createdAt') {
        case 'createdAt':
          taskDate = task.createdAt;
          break;
        case 'updatedAt':
          taskDate = task.updatedAt;
          break;
        case 'completedAt':
          taskDate = task.completedAt;
          break;
      }

      if (!taskDate) return false;

      const date = new Date(taskDate);

      if (dateRange.start && date < new Date(dateRange.start)) return false;
      if (dateRange.end && date > new Date(dateRange.end)) return false;

      return true;
    });
  }

  /**
   * Apply duration filtering
   */
  private applyDurationFilter(
    tasks: Task[],
    duration: NonNullable<
      NonNullable<SearchCriteria['filters']>['estimatedDuration']
    >
  ): Task[] {
    return tasks.filter(task => {
      const taskDuration = task.estimatedDuration;
      if (!taskDuration) return false;

      if (duration.min !== undefined && taskDuration < duration.min)
        return false;
      if (duration.max !== undefined && taskDuration > duration.max)
        return false;

      return true;
    });
  }

  /**
   * Apply sorting to tasks
   */
  private applySorting(tasks: Task[], criteria: SearchCriteria): Task[] {
    if (!criteria.sortBy) return tasks;

    const sortedTasks = [...tasks];
    const isAscending = criteria.sortOrder !== 'desc';

    sortedTasks.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (criteria.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'estimatedDuration':
          aValue = a.estimatedDuration || 0;
          bValue = b.estimatedDuration || 0;
          break;
        default:
          return 0;
      }

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return isAscending ? comparison : -comparison;
    });

    return sortedTasks;
  }

  /**
   * Apply pagination to results
   */
  private applyPagination<T>(
    items: T[],
    criteria: SearchCriteria
  ): { paginatedTasks: T[]; hasMore: boolean } {
    const offset = criteria.offset || 0;
    const limit = criteria.limit || items.length;

    const paginatedTasks = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;

    return { paginatedTasks, hasMore };
  }

  /**
   * Apply filtering for task lists
   */
  private applyListFiltering(
    lists: TaskList[],
    criteria: SearchCriteria
  ): TaskList[] {
    let filteredLists = [...lists];

    // Apply text search for lists
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      filteredLists = filteredLists.filter(list => {
        const title = (list.title || '').toLowerCase();
        const description = (list.description || '').toLowerCase();
        const projectTag = (list.projectTag || '').toLowerCase();

        return (
          title.includes(query) ||
          description.includes(query) ||
          projectTag.includes(query)
        );
      });
    }

    return filteredLists;
  }

  /**
   * Apply sorting to task lists
   */
  private applyListSorting(
    lists: TaskList[],
    criteria: SearchCriteria
  ): TaskList[] {
    if (!criteria.sortBy) return lists;

    const sortedLists = [...lists];
    const isAscending = criteria.sortOrder !== 'desc';

    sortedLists.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (criteria.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'totalItems':
          aValue = a.totalItems || 0;
          bValue = b.totalItems || 0;
          break;
        default:
          return 0;
      }

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return isAscending ? comparison : -comparison;
    });

    return sortedLists;
  }

  /**
   * Get list of applied filters for metadata
   */
  private getAppliedFilters(criteria: SearchCriteria): string[] {
    const applied: string[] = [];

    if (criteria.query) applied.push('text-search');
    if (criteria.listId) applied.push('list-filter');

    if (criteria.filters) {
      const filters = criteria.filters;

      if (filters.status && filters.status.length > 0)
        applied.push('status-filter');
      if (filters.priority && filters.priority.length > 0)
        applied.push('priority-filter');
      if (filters.tags && filters.tags.length > 0) applied.push('tag-filter');
      if (filters.hasDependencies !== undefined)
        applied.push('dependency-filter');
      if (filters.isReady !== undefined) applied.push('ready-filter');
      if (filters.isBlocked !== undefined) applied.push('blocked-filter');
      if (filters.dateRange) applied.push('date-range-filter');
      if (filters.estimatedDuration) applied.push('duration-filter');
      if (filters.hasAgentPromptTemplate !== undefined)
        applied.push('agent-prompt-filter');
      if (filters.includeCompleted === false) applied.push('exclude-completed');
    }

    return applied;
  }

  private formatTasksForDisplay(
    tasks: Task[],
    _options: {
      format: string;
      groupBy: string;
      includeCompleted: boolean;
    }
  ): Task[] {
    // Formatting implementation - return tasks as-is for now
    // Grouping can be handled by the client if needed
    return tasks;
  }

  /**
   * Advanced search with options and performance metrics
   */
  async advancedSearch(
    criteria: SearchCriteria,
    options?: AdvancedSearchOptions
  ): Promise<SearchResultWithMetrics<Task>> {
    const startTime = Date.now();
    let filterTime = 0;
    let sortTime = 0;
    let itemsScanned = 0;
    let itemsFiltered = 0;

    try {
      // Validate criteria and options
      const criteriaValidation =
        this.validator.validateSearchCriteria(criteria);
      let optionsValidation: SearchFilterValidation = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (options) {
        optionsValidation = this.validator.validateAdvancedOptions(options);
      }

      if (!criteriaValidation.isValid || !optionsValidation.isValid) {
        const allErrors = [
          ...criteriaValidation.errors.map(e => e.message),
          ...optionsValidation.errors,
        ];
        throw new OrchestrationError(
          `Invalid search parameters: ${allErrors.join(', ')}`,
          'SearchOrchestrator.advancedSearch',
          { criteria, options },
          'Valid search criteria and options',
          [...criteriaValidation.errors.map(e => e.actionableGuidance)].join(
            '; '
          )
        );
      }

      // Get all tasks
      const allTasks = (await this.dataDelegationService.searchTasks(
        criteria
      )) as Task[];
      itemsScanned = allTasks.length;

      // Apply filtering with timing
      const filterStartTime = Date.now();
      const filteredTasks = this.applyFiltering(allTasks, criteria);
      filterTime = Date.now() - filterStartTime;
      itemsFiltered = filteredTasks.length;

      // Apply sorting with timing
      const sortStartTime = Date.now();
      const sortedTasks = this.applySorting(filteredTasks, criteria);
      sortTime = Date.now() - sortStartTime;

      // Apply pagination
      const { paginatedTasks, hasMore } = this.applyPagination(
        sortedTasks,
        criteria
      );

      const totalTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      const filtersApplied = this.getAppliedFilters(criteria);

      const metrics: SearchMetrics = {
        totalTime,
        filterTime: Math.max(1, filterTime),
        sortTime: Math.max(1, sortTime),
        itemsScanned,
        itemsFiltered,
      };

      const validation: SearchFilterValidation = {
        isValid: true,
        errors: [],
        warnings: [
          ...criteriaValidation.warnings.map(w => w.message),
          ...optionsValidation.warnings,
        ],
      };

      return {
        items: paginatedTasks,
        totalCount: filteredTasks.length,
        hasMore,
        offset: criteria.offset || 0,
        limit: criteria.limit || paginatedTasks.length,
        searchTime: totalTime,
        filtersApplied,
        sortedBy: criteria.sortBy,
        metrics,
        validation,
      };
    } catch (error) {
      if (error instanceof OrchestrationError) {
        throw error;
      }

      throw new OrchestrationError(
        'Failed to perform advanced search',
        'SearchOrchestrator.advancedSearch',
        { criteria, options },
        'Valid search criteria and options',
        'Check search parameters and advanced options'
      );
    }
  }

  /**
   * Search with fuzzy matching capabilities
   */
  async fuzzySearch(
    query: string,
    options?: {
      threshold?: number;
      searchFields?: ('title' | 'description' | 'tags')[];
      limit?: number;
    }
  ): Promise<SearchResult<Task>> {
    const startTime = Date.now();

    try {
      if (!query || query.trim().length === 0) {
        throw new OrchestrationError(
          'Query is required for fuzzy search',
          'SearchOrchestrator.fuzzySearch',
          query,
          'Non-empty string',
          'Provide a search query'
        );
      }

      const threshold = options?.threshold || 0.6;
      const searchFields = options?.searchFields || [
        'title',
        'description',
        'tags',
      ];
      const limit = options?.limit || 50;

      // Get all tasks
      const allTasks = (await this.dataDelegationService.searchTasks(
        {}
      )) as Task[];

      // Apply fuzzy matching
      const fuzzyResults = this.applyFuzzyMatching(
        allTasks,
        query,
        threshold,
        searchFields
      );

      // Apply limit
      const limitedResults = fuzzyResults.slice(0, limit);

      const searchTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms

      return {
        items: limitedResults,
        totalCount: fuzzyResults.length,
        hasMore: fuzzyResults.length > limit,
        offset: 0,
        limit: limitedResults.length,
        searchTime,
        filtersApplied: ['fuzzy-search'],
      };
    } catch (error) {
      if (error instanceof OrchestrationError) {
        throw error;
      }

      throw new OrchestrationError(
        'Failed to perform fuzzy search',
        'SearchOrchestrator.fuzzySearch',
        { query, options },
        'Valid query and options',
        'Check query and fuzzy search options'
      );
    }
  }

  /**
   * Validate search criteria
   */
  async validateSearchCriteria(criteria: SearchCriteria): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    try {
      const validation = this.validator.validateSearchCriteria(criteria);
      const suggestions: string[] = [];

      // Generate performance suggestions
      if (criteria.limit && criteria.limit > 100) {
        suggestions.push('Consider using pagination for large result sets');
      }

      if (criteria.query && criteria.query.length < 3) {
        suggestions.push('Longer search queries provide more accurate results');
      }

      return {
        isValid: validation.isValid,
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message),
        suggestions,
      };
    } catch (_error) {
      throw new OrchestrationError(
        'Failed to validate search criteria',
        'SearchOrchestrator.validateSearchCriteria',
        criteria,
        'Valid search criteria object',
        'Provide a valid search criteria object'
      );
    }
  }

  /**
   * Apply fuzzy matching to tasks
   */
  private applyFuzzyMatching(
    tasks: Task[],
    query: string,
    threshold: number,
    searchFields: ('title' | 'description' | 'tags')[]
  ): Task[] {
    const queryLower = query.toLowerCase();
    const results: { task: Task; score: number }[] = [];

    for (const task of tasks) {
      let maxScore = 0;

      for (const field of searchFields) {
        let fieldValue = '';

        switch (field) {
          case 'title':
            fieldValue = task.title || '';
            break;
          case 'description':
            fieldValue = task.description || '';
            break;
          case 'tags':
            fieldValue = (task.tags || []).join(' ');
            break;
        }

        const score = this.calculateFuzzyScore(
          queryLower,
          fieldValue.toLowerCase()
        );
        maxScore = Math.max(maxScore, score);
      }

      if (maxScore >= threshold) {
        results.push({ task, score: maxScore });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.map(result => result.task);
  }

  /**
   * Calculate fuzzy matching score using string similarity
   */
  private calculateFuzzyScore(query: string, text: string): number {
    if (!text || text.length === 0) return 0;

    if (text.includes(query)) {
      return 1.0; // Exact substring match
    }

    // Character-based similarity
    const queryChars = query.split('');
    let matches = 0;
    let textIndex = 0;

    for (const char of queryChars) {
      const foundIndex = text.indexOf(char, textIndex);
      if (foundIndex !== -1) {
        matches++;
        textIndex = foundIndex + 1;
      }
    }

    const score = matches / query.length;

    // Only return scores above a minimum threshold to filter out poor matches
    return score >= 0.3 ? score : 0;
  }
}
