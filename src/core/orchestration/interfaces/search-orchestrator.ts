/**
 * Search orchestrator interface for unified search across tasks and lists
 * Handles multi-criteria search, filtering, and pagination
 */

import { TaskList } from '../../../domain/models/task-list.js';
import { Task } from '../../../domain/models/task.js';
import {
  SearchCriteria,
  SearchResult,
  UnifiedSearchCriteria,
  UnifiedSearchResult,
  AdvancedSearchOptions,
  SearchResultWithMetrics,
} from '../../../shared/types/search';

import { BaseOrchestrator } from './base-orchestrator.js';

export interface SearchOrchestrator extends BaseOrchestrator {
  /**
   * Searches tasks with criteria and filtering
   */
  searchTasks(criteria: SearchCriteria): Promise<SearchResult<Task>>;

  /**
   * Searches task lists with criteria and filtering
   */
  searchLists(criteria: SearchCriteria): Promise<SearchResult<TaskList>>;

  /**
   * Unified search across both tasks and lists with performance metrics
   */
  unifiedSearch(criteria: UnifiedSearchCriteria): Promise<UnifiedSearchResult>;

  /**
   * Filters tasks by agent prompt template presence
   */
  filterTasksByAgentPrompt(
    listId: string,
    hasTemplate: boolean
  ): Promise<Task[]>;

  /**
   * Gets tasks for display with formatting options
   */
  getTasksForDisplay(
    listId: string,
    options: {
      format: string;
      groupBy: string;
      includeCompleted: boolean;
    }
  ): Promise<Task[]>;

  /**
   * Advanced search with options and performance metrics
   */
  advancedSearch(
    criteria: SearchCriteria,
    options?: AdvancedSearchOptions
  ): Promise<SearchResultWithMetrics<Task>>;

  /**
   * Search with fuzzy matching capabilities
   */
  fuzzySearch(
    query: string,
    options?: {
      threshold?: number;
      searchFields?: ('title' | 'description' | 'tags')[];
      limit?: number;
    }
  ): Promise<SearchResult<Task>>;

  /**
   * Validate search criteria
   */
  validateSearchCriteria(criteria: SearchCriteria): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }>;
}
