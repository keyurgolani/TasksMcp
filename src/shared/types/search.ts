/**
 * Search types for orchestration layer
 * Defines structures for comprehensive search and filtering
 */

export interface SearchCriteria {
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface UnifiedSearchCriteria extends SearchCriteria {
  searchTasks?: boolean;
  searchLists?: boolean;
}

export interface UnifiedSearchResult {
  tasks: SearchResult<unknown>;
  lists: SearchResult<unknown>;
  totalResults: number;
}
