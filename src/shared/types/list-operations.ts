/**
 * List operation types for orchestration layer
 * Defines data structures for task list CRUD operations
 */

export interface CreateListData {
  title: string;
  description?: string;
  projectTag?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateListData {
  title?: string;
  description?: string;
  projectTag?: string;
  metadata?: Record<string, unknown>;
}

export interface ListFilters {
  projectTag?: string;
  hasCompletedTasks?: boolean;
  hasIncompleteTasks?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

export interface ListSearchOptions {
  query?: string;
  filters?: ListFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'progress';
  sortOrder?: 'asc' | 'desc';
}
