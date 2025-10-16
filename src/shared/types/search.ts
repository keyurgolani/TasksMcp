/**
 * Search types for orchestration layer
 * Defines structures for search and filtering
 */

import { TaskStatus, Priority } from './task';

export interface SearchCriteria {
  // Text search
  query?: string;
  listId?: string;
  projectTag?: string;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Filtering options
  filters?: {
    // Status filtering
    status?: TaskStatus[];

    // Priority filtering
    priority?: Priority[];

    // Tag filtering
    tags?: string[];
    tagOperator?: 'AND' | 'OR';

    // Dependency filtering
    hasDependencies?: boolean;
    isReady?: boolean;
    isBlocked?: boolean;

    // Date range filtering
    dateRange?: {
      start?: string;
      end?: string;
      field?: 'createdAt' | 'updatedAt' | 'completedAt';
    };

    // Duration filtering
    estimatedDuration?: {
      min?: number;
      max?: number;
    };

    // Agent prompt template filtering
    hasAgentPromptTemplate?: boolean;

    // Completion filtering
    includeCompleted?: boolean;

    // Text search options
    searchFields?: ('title' | 'description' | 'tags')[];
    caseSensitive?: boolean;
    exactMatch?: boolean;

    // Project filtering
    projectTag?: string;
  };
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;

  // Search metadata
  searchTime?: number; // milliseconds
  filtersApplied?: string[];
  sortedBy?: string | undefined;

  // Convenience properties for controllers
  tasks?: T[];
  lists?: T[];
  total?: number;
}

export interface UnifiedSearchCriteria extends SearchCriteria {
  searchTasks?: boolean;
  searchLists?: boolean;
  includeCompleted?: boolean;

  // Cross-entity search options
  includeMetadata?: boolean;
  includeDependencyInfo?: boolean;
  maxResultsPerType?: number;
}

export interface UnifiedSearchResult {
  tasks: SearchResult<unknown>;
  lists: SearchResult<unknown>;
  totalResults: number;
  totalCount: number;

  // Search performance metrics
  searchTime: number;
  tasksSearchTime: number;
  listsSearchTime: number;

  // Search metadata
  filtersApplied: string[];
  searchQuery?: string | undefined;
}

// Advanced search options
export interface AdvancedSearchOptions {
  // Text search configuration
  fuzzySearch?: boolean;
  fuzzyThreshold?: number; // 0-1, lower = more strict
  highlightMatches?: boolean;

  // Performance options
  maxSearchTime?: number; // milliseconds

  // Result formatting
  includeScore?: boolean;
  includeExplanation?: boolean;
}

// Search performance metrics
export interface SearchMetrics {
  totalTime: number;
  filterTime: number;
  sortTime: number;
  itemsScanned: number;
  itemsFiltered: number;
}

// Search filter validation
export interface SearchFilterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Search result with metadata
export interface SearchResultWithMetrics<T> extends SearchResult<T> {
  metrics: SearchMetrics;
  validation: SearchFilterValidation;
  relatedQueries?: string[];
}
