/**
 * Search validator for orchestration layer
 * Validates search criteria according to domain rules
 */

import {
  SearchCriteria,
  SearchFilterValidation,
  AdvancedSearchOptions,
} from '../../../shared/types/search.js';
import { TaskStatus } from '../../../shared/types/task.js';
import {
  ValidationResult,
  ValidationError,
} from '../../../shared/types/validation.js';

export class SearchValidator {
  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (data && typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Search criteria must be an object',
        currentValue: data,
        expectedValue: 'object',
        actionableGuidance: 'Provide a valid search criteria object',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  validateSearchCriteria(criteria: SearchCriteria): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate basic parameters
    this.validateBasicParameters(criteria, errors, warnings);

    // Validate filters
    if (criteria.filters) {
      this.validateFilters(criteria.filters, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.map(w => ({ field: 'general', message: w })),
    };
  }

  validateAdvancedOptions(
    options: AdvancedSearchOptions
  ): SearchFilterValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate fuzzy search threshold
    if (options.fuzzyThreshold !== undefined) {
      if (options.fuzzyThreshold < 0 || options.fuzzyThreshold > 1) {
        errors.push('Fuzzy threshold must be between 0 and 1');
      } else if (options.fuzzyThreshold < 0.3) {
        warnings.push('Very low fuzzy threshold may return too many results');
      }
    }

    // Validate max search time
    if (options.maxSearchTime !== undefined) {
      if (options.maxSearchTime < 100) {
        warnings.push(
          'Very low max search time may result in incomplete results'
        );
      } else if (options.maxSearchTime > 30000) {
        warnings.push('High max search time may impact performance');
      }
    }

    // Provide suggestions
    if (options.fuzzySearch && !options.fuzzyThreshold) {
      suggestions.push(
        'Consider setting fuzzyThreshold for better fuzzy search results'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  private validateBasicParameters(
    criteria: SearchCriteria,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    // Validate limit
    if (criteria.limit !== undefined) {
      if (criteria.limit < 1 || criteria.limit > 500) {
        errors.push({
          field: 'limit',
          message: 'Limit must be between 1 and 500',
          currentValue: criteria.limit,
          expectedValue: 'number between 1 and 500',
          actionableGuidance: 'Set limit to a value between 1 and 500',
        });
      } else if (criteria.limit > 100) {
        warnings.push('Large limit values may impact performance');
      }
    }

    // Validate offset
    if (criteria.offset !== undefined && criteria.offset < 0) {
      errors.push({
        field: 'offset',
        message: 'Offset must be non-negative',
        currentValue: criteria.offset,
        expectedValue: 'non-negative number',
        actionableGuidance: 'Set offset to 0 or a positive number',
      });
    }

    // Validate sort order
    if (criteria.sortOrder && !['asc', 'desc'].includes(criteria.sortOrder)) {
      errors.push({
        field: 'sortOrder',
        message: 'Sort order must be "asc" or "desc"',
        currentValue: criteria.sortOrder,
        expectedValue: '"asc" or "desc"',
        actionableGuidance:
          'Use "asc" for ascending or "desc" for descending order',
      });
    }

    // Validate query length
    if (criteria.query !== undefined) {
      if (criteria.query.length === 0) {
        warnings.push('Empty query string may return all results');
      } else if (criteria.query.length > 1000) {
        errors.push({
          field: 'query',
          message: 'Query string must be 1000 characters or less',
          currentValue: criteria.query.length,
          expectedValue: 'string with 1000 characters or less',
          actionableGuidance:
            'Shorten the query string to 1000 characters or less',
        });
      }
    }

    // Validate listId format
    if (criteria.listId !== undefined) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(criteria.listId)) {
        errors.push({
          field: 'listId',
          message: 'List ID must be a valid UUID',
          currentValue: criteria.listId,
          expectedValue: 'valid UUID format',
          actionableGuidance: 'Provide a valid UUID for the list ID',
        });
      }
    }
  }

  private validateFilters(
    filters: NonNullable<SearchCriteria['filters']>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    // Validate status filter
    if (filters.status) {
      const validStatuses: TaskStatus[] = [
        TaskStatus.PENDING,
        TaskStatus.IN_PROGRESS,
        TaskStatus.COMPLETED,
        TaskStatus.BLOCKED,
        TaskStatus.CANCELLED,
      ];
      const invalidStatuses = filters.status.filter(
        status => !validStatuses.includes(status)
      );
      if (invalidStatuses.length > 0) {
        errors.push({
          field: 'filters.status',
          message: `Invalid status values: ${invalidStatuses.join(', ')}`,
          currentValue: invalidStatuses,
          expectedValue: validStatuses.join(', '),
          actionableGuidance:
            'Use only valid status values: pending, in_progress, completed, blocked, cancelled',
        });
      }
    }

    // Validate priority filter
    if (filters.priority) {
      const invalidPriorities = filters.priority.filter(p => p < 1 || p > 5);
      if (invalidPriorities.length > 0) {
        errors.push({
          field: 'filters.priority',
          message: `Priority values must be between 1 and 5: ${invalidPriorities.join(', ')}`,
          currentValue: invalidPriorities,
          expectedValue: 'numbers between 1 and 5',
          actionableGuidance:
            'Use priority values between 1 (minimal) and 5 (critical)',
        });
      }
    }

    // Validate tag operator
    if (filters.tagOperator && !['AND', 'OR'].includes(filters.tagOperator)) {
      errors.push({
        field: 'filters.tagOperator',
        message: 'Tag operator must be "AND" or "OR"',
        currentValue: filters.tagOperator,
        expectedValue: '"AND" or "OR"',
        actionableGuidance:
          'Use "AND" to require all tags or "OR" to match any tag',
      });
    }

    // Validate tags
    if (filters.tags) {
      const longTags = filters.tags.filter(tag => tag.length > 50);
      if (longTags.length > 0) {
        errors.push({
          field: 'filters.tags',
          message: 'Tag names must be 50 characters or less',
          currentValue: longTags,
          expectedValue: 'strings with 50 characters or less',
          actionableGuidance: 'Shorten tag names to 50 characters or less',
        });
      }

      if (filters.tags.length > 20) {
        warnings.push('Large number of tags may impact search performance');
      }
    }

    // Validate date range
    if (filters.dateRange) {
      this.validateDateRange(filters.dateRange, errors, warnings);
    }

    // Validate duration filter
    if (filters.estimatedDuration) {
      this.validateDurationFilter(filters.estimatedDuration, errors, warnings);
    }

    // Validate search fields
    if (filters.searchFields) {
      const validFields = ['title', 'description', 'tags'];
      const invalidFields = filters.searchFields.filter(
        field => !validFields.includes(field)
      );
      if (invalidFields.length > 0) {
        errors.push({
          field: 'filters.searchFields',
          message: `Invalid search fields: ${invalidFields.join(', ')}`,
          currentValue: invalidFields,
          expectedValue: validFields.join(', '),
          actionableGuidance:
            'Use only valid search fields: title, description, tags',
        });
      }
    }
  }

  private validateDateRange(
    dateRange: NonNullable<NonNullable<SearchCriteria['filters']>['dateRange']>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    // Validate date format
    if (dateRange.start) {
      try {
        const startDate = new Date(dateRange.start);
        if (isNaN(startDate.getTime())) {
          errors.push({
            field: 'filters.dateRange.start',
            message: 'Invalid start date format',
            currentValue: dateRange.start,
            expectedValue: 'valid ISO date string',
            actionableGuidance:
              'Use ISO date format (e.g., "2023-12-01T00:00:00Z")',
          });
        }
      } catch {
        errors.push({
          field: 'filters.dateRange.start',
          message: 'Invalid start date format',
          currentValue: dateRange.start,
          expectedValue: 'valid ISO date string',
          actionableGuidance:
            'Use ISO date format (e.g., "2023-12-01T00:00:00Z")',
        });
      }
    }

    if (dateRange.end) {
      try {
        const endDate = new Date(dateRange.end);
        if (isNaN(endDate.getTime())) {
          errors.push({
            field: 'filters.dateRange.end',
            message: 'Invalid end date format',
            currentValue: dateRange.end,
            expectedValue: 'valid ISO date string',
            actionableGuidance:
              'Use ISO date format (e.g., "2023-12-01T23:59:59Z")',
          });
        }
      } catch {
        errors.push({
          field: 'filters.dateRange.end',
          message: 'Invalid end date format',
          currentValue: dateRange.end,
          expectedValue: 'valid ISO date string',
          actionableGuidance:
            'Use ISO date format (e.g., "2023-12-01T23:59:59Z")',
        });
      }
    }

    // Validate date range logic
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      if (startDate >= endDate) {
        errors.push({
          field: 'filters.dateRange',
          message: 'Start date must be before end date',
          currentValue: { start: dateRange.start, end: dateRange.end },
          expectedValue: 'start date before end date',
          actionableGuidance:
            'Ensure the start date is earlier than the end date',
        });
      }

      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        warnings.push('Large date ranges may impact search performance');
      }
    }

    // Validate field
    if (
      dateRange.field &&
      !['createdAt', 'updatedAt', 'completedAt'].includes(dateRange.field)
    ) {
      errors.push({
        field: 'filters.dateRange.field',
        message:
          'Date field must be "createdAt", "updatedAt", or "completedAt"',
        currentValue: dateRange.field,
        expectedValue: '"createdAt", "updatedAt", or "completedAt"',
        actionableGuidance: 'Use one of the valid date fields for filtering',
      });
    }
  }

  private validateDurationFilter(
    duration: NonNullable<
      NonNullable<SearchCriteria['filters']>['estimatedDuration']
    >,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    // Validate min duration
    if (duration.min !== undefined && duration.min < 1) {
      errors.push({
        field: 'filters.estimatedDuration.min',
        message: 'Minimum duration must be at least 1 minute',
        currentValue: duration.min,
        expectedValue: 'number >= 1',
        actionableGuidance: 'Set minimum duration to 1 minute or more',
      });
    }

    // Validate max duration
    if (duration.max !== undefined && duration.max < 1) {
      errors.push({
        field: 'filters.estimatedDuration.max',
        message: 'Maximum duration must be at least 1 minute',
        currentValue: duration.max,
        expectedValue: 'number >= 1',
        actionableGuidance: 'Set maximum duration to 1 minute or more',
      });
    }

    // Validate range logic
    if (duration.min !== undefined && duration.max !== undefined) {
      if (duration.min >= duration.max) {
        errors.push({
          field: 'filters.estimatedDuration',
          message: 'Minimum duration must be less than maximum duration',
          currentValue: { min: duration.min, max: duration.max },
          expectedValue: 'min < max',
          actionableGuidance:
            'Ensure minimum duration is less than maximum duration',
        });
      }

      if (duration.max - duration.min > 10080) {
        // 1 week in minutes
        warnings.push('Large duration ranges may return many results');
      }
    }
  }
}
