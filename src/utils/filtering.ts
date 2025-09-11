/**
 * Utility functions for filtering, sorting, and paginating todo items
 */

import {
  TaskStatus,
  Priority,
  type TodoItem,
  type GetTodoListFilters,
  type GetTodoListSorting,
  type GetTodoListPagination,
} from '../types/todo.js';
import { logger } from './logger.js';

export class FilteringUtils {
  /**
   * Apply filters to a list of todo items
   */
  static applyFilters(
    items: TodoItem[],
    filters: GetTodoListFilters
  ): TodoItem[] {
    try {
      logger.debug('Applying filters to items', {
        itemCount: items.length,
        filterCount: Object.keys(filters).length,
      });

      let filteredItems = [...items];

      // Status filter
      if (filters.status !== undefined) {
        const statusArray = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        filteredItems = filteredItems.filter(item =>
          statusArray.includes(item.status)
        );
      }

      // Priority filter
      if (filters.priority !== undefined) {
        const priorityArray = Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority];
        filteredItems = filteredItems.filter(item =>
          priorityArray.includes(item.priority)
        );
      }

      // Tags filter (item must have ALL specified tags)
      if (filters.tags && filters.tags.length > 0) {
        const tagsToFilter = filters.tags;
        filteredItems = filteredItems.filter(item =>
          tagsToFilter.every(tag => item.tags.includes(tag))
        );
      }

      // Assignee filter (if we add assignee field to TodoItem in the future)
      if (filters.assignee !== undefined) {
        const assigneeFilter = filters.assignee;
        filteredItems = filteredItems.filter(item => {
          const assignee = (item.metadata['assignee'] as string) ?? '';
          return assignee.toLowerCase().includes(assigneeFilter.toLowerCase());
        });
      }

      // Due date filters (if we add dueDate field to TodoItem in the future)
      if (filters.dueDateBefore !== undefined) {
        const { dueDateBefore } = filters;
        filteredItems = filteredItems.filter(item => {
          const dueDate = item.metadata['dueDate'] as Date;
          return Boolean(dueDate) && dueDate <= dueDateBefore;
        });
      }

      if (filters.dueDateAfter !== undefined) {
        const { dueDateAfter } = filters;
        filteredItems = filteredItems.filter(item => {
          const dueDate = item.metadata['dueDate'] as Date;
          return Boolean(dueDate) && dueDate >= dueDateAfter;
        });
      }

      // Created date filters
      if (filters.createdBefore !== undefined) {
        const { createdBefore } = filters;
        filteredItems = filteredItems.filter(
          item => item.createdAt <= createdBefore
        );
      }

      if (filters.createdAfter !== undefined) {
        const { createdAfter } = filters;
        filteredItems = filteredItems.filter(
          item => item.createdAt >= createdAfter
        );
      }

      // Description filter
      if (filters.hasDescription !== undefined) {
        const hasDescriptionFilter = filters.hasDescription;
        filteredItems = filteredItems.filter(item => {
          const hasDesc =
            item.description !== undefined &&
            item.description.trim().length > 0;
          return hasDescriptionFilter === true ? hasDesc : !hasDesc;
        });
      }

      // Dependencies filter
      if (filters.hasDependencies !== undefined) {
        const hasDependenciesFilter = filters.hasDependencies;
        filteredItems = filteredItems.filter(item => {
          const hasDeps = item.dependencies.length > 0;
          return hasDependenciesFilter === true ? hasDeps : !hasDeps;
        });
      }

      // Estimated duration filters
      if (filters.estimatedDurationMin !== undefined) {
        const minDuration = filters.estimatedDurationMin;
        filteredItems = filteredItems.filter(
          item => (item.estimatedDuration ?? 0) >= minDuration
        );
      }

      if (filters.estimatedDurationMax !== undefined) {
        const maxDuration = filters.estimatedDurationMax;
        filteredItems = filteredItems.filter(
          item => (item.estimatedDuration ?? 0) <= maxDuration
        );
      }

      // Text search filter
      if (
        filters.searchText !== undefined &&
        filters.searchText.trim().length > 0
      ) {
        const searchTerm = filters.searchText.toLowerCase().trim();
        filteredItems = filteredItems.filter(item => {
          const titleMatch = item.title.toLowerCase().includes(searchTerm);
          const descMatch =
            item.description?.toLowerCase().includes(searchTerm) ?? false;
          const tagMatch = item.tags.some(tag =>
            tag.toLowerCase().includes(searchTerm)
          );
          return titleMatch || descMatch || tagMatch;
        });
      }

      logger.debug('Filters applied successfully', {
        originalCount: items.length,
        filteredCount: filteredItems.length,
      });

      return filteredItems;
    } catch (error) {
      logger.error('Failed to apply filters', { error });
      throw error;
    }
  }

  /**
   * Sort todo items based on specified criteria
   */
  static applySorting(
    items: TodoItem[],
    sorting: GetTodoListSorting
  ): TodoItem[] {
    try {
      logger.debug('Applying sorting to items', {
        itemCount: items.length,
        field: sorting.field,
        direction: sorting.direction,
      });

      const sortedItems = [...items].sort((a, b) => {
        let comparison = 0;

        switch (sorting.field) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'priority':
            comparison = a.priority - b.priority;
            break;
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updatedAt':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'completedAt': {
            // Handle optional completedAt field
            const aCompleted = a.completedAt?.getTime() ?? 0;
            const bCompleted = b.completedAt?.getTime() ?? 0;
            comparison = aCompleted - bCompleted;
            break;
          }
          case 'estimatedDuration': {
            const aDuration = a.estimatedDuration ?? 0;
            const bDuration = b.estimatedDuration ?? 0;
            comparison = aDuration - bDuration;
            break;
          }
          default:
            logger.warn('Unknown sorting field', { field: sorting.field });
            return 0;
        }

        return sorting.direction === 'desc' ? -comparison : comparison;
      });

      logger.debug('Sorting applied successfully', {
        itemCount: sortedItems.length,
      });

      return sortedItems;
    } catch (error) {
      logger.error('Failed to apply sorting', { error });
      throw error;
    }
  }

  /**
   * Apply pagination to a list of items
   */
  static applyPagination(
    items: TodoItem[],
    pagination: GetTodoListPagination
  ): {
    items: TodoItem[];
    totalCount: number;
    hasMore: boolean;
  } {
    try {
      const totalCount = items.length;
      const limit = pagination.limit ?? totalCount; // Default to all items if no limit
      const offset = pagination.offset ?? 0;

      logger.debug('Applying pagination to items', {
        totalCount,
        limit,
        offset,
      });

      // Validate pagination parameters
      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      if (limit < 1 && pagination.limit !== undefined) {
        throw new Error('Limit must be positive');
      }

      if (offset >= totalCount && totalCount > 0) {
        throw new Error('Offset exceeds total item count');
      }

      const paginatedItems = items.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;

      logger.debug('Pagination applied successfully', {
        totalCount,
        returnedCount: paginatedItems.length,
        hasMore,
      });

      return {
        items: paginatedItems,
        totalCount,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to apply pagination', { error });
      throw error;
    }
  }

  /**
   * Apply all processing steps: filter, sort, and paginate
   */
  static processItems(
    items: TodoItem[],
    filters?: GetTodoListFilters,
    sorting?: GetTodoListSorting,
    pagination?: GetTodoListPagination
  ): {
    items: TodoItem[];
    totalCount: number;
    filteredCount: number;
    hasMore: boolean;
  } {
    try {
      logger.debug('Processing items with filters, sorting, and pagination', {
        originalCount: items.length,
        hasFilters: !!filters,
        hasSorting: !!sorting,
        hasPagination: !!pagination,
      });

      let processedItems = [...items];
      const originalCount = items.length;

      // Step 1: Apply filters
      if (filters && Object.keys(filters).length > 0) {
        processedItems = this.applyFilters(processedItems, filters);
      }

      const filteredCount = processedItems.length;

      // Step 2: Apply sorting
      if (sorting) {
        processedItems = this.applySorting(processedItems, sorting);
      }

      // Step 3: Apply pagination
      let paginationResult = {
        items: processedItems,
        totalCount: filteredCount,
        hasMore: false,
      };

      if (pagination) {
        paginationResult = this.applyPagination(processedItems, pagination);
      }

      logger.info('Items processed successfully', {
        originalCount,
        filteredCount,
        finalCount: paginationResult.items.length,
        hasMore: paginationResult.hasMore,
      });

      return {
        items: paginationResult.items,
        totalCount: originalCount,
        filteredCount,
        hasMore: paginationResult.hasMore,
      };
    } catch (error) {
      logger.error('Failed to process items', { error });
      throw error;
    }
  }

  /**
   * Validate filter parameters
   */
  static validateFilters(filters: GetTodoListFilters): void {
    // Validate status values
    if (filters.status !== undefined) {
      const statusArray = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      const validStatuses = Object.values(TaskStatus);
      statusArray.forEach(status => {
        if (!validStatuses.includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }
      });
    }

    // Validate priority values
    if (filters.priority !== undefined) {
      const priorityArray = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      const validPriorities = Object.values(Priority);
      priorityArray.forEach(priority => {
        if (!validPriorities.includes(priority)) {
          throw new Error(`Invalid priority: ${priority}`);
        }
      });
    }

    // Validate date ranges
    if (filters.createdBefore && filters.createdAfter) {
      if (filters.createdBefore <= filters.createdAfter) {
        throw new Error('createdBefore must be after createdAfter');
      }
    }

    if (filters.dueDateBefore && filters.dueDateAfter) {
      if (filters.dueDateBefore <= filters.dueDateAfter) {
        throw new Error('dueDateBefore must be after dueDateAfter');
      }
    }

    // Validate duration ranges
    if (
      filters.estimatedDurationMin !== undefined &&
      filters.estimatedDurationMin < 0
    ) {
      throw new Error('estimatedDurationMin must be non-negative');
    }

    if (
      filters.estimatedDurationMax !== undefined &&
      filters.estimatedDurationMax < 0
    ) {
      throw new Error('estimatedDurationMax must be non-negative');
    }

    if (
      filters.estimatedDurationMin !== undefined &&
      filters.estimatedDurationMax !== undefined &&
      filters.estimatedDurationMin > filters.estimatedDurationMax
    ) {
      throw new Error(
        'estimatedDurationMin must be less than or equal to estimatedDurationMax'
      );
    }
  }

  /**
   * Validate sorting parameters
   */
  static validateSorting(sorting: GetTodoListSorting): void {
    const validFields = [
      'title',
      'status',
      'priority',
      'createdAt',
      'updatedAt',
      'completedAt',
      'estimatedDuration',
    ];
    if (!validFields.includes(sorting.field)) {
      throw new Error(`Invalid sorting field: ${sorting.field}`);
    }

    const validDirections = ['asc', 'desc'];
    if (!validDirections.includes(sorting.direction)) {
      throw new Error(`Invalid sorting direction: ${sorting.direction}`);
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(pagination: GetTodoListPagination): void {
    if (pagination.limit !== undefined && pagination.limit < 1) {
      throw new Error('Pagination limit must be positive');
    }

    if (pagination.offset !== undefined && pagination.offset < 0) {
      throw new Error('Pagination offset must be non-negative');
    }

    // Set reasonable limits to prevent abuse
    if (pagination.limit !== undefined && pagination.limit > 1000) {
      throw new Error('Pagination limit cannot exceed 1000');
    }
  }
}
