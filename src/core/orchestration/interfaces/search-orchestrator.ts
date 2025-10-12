/**
 * Search orchestrator interface for unified search across tasks and lists
 * Handles multi-criteria search, filtering, and pagination
 */

import { Task } from '../../../domain/models/task';
import { TaskList } from '../../../domain/models/task-list';
import {
  SearchCriteria,
  SearchResult,
  UnifiedSearchCriteria,
  UnifiedSearchResult,
} from '../../../shared/types/search';

import { BaseOrchestrator } from './base-orchestrator';

export interface SearchOrchestrator extends BaseOrchestrator {
  /**
   * Searches tasks with comprehensive criteria
   */
  searchTasks(criteria: SearchCriteria): Promise<SearchResult<Task>>;

  /**
   * Searches task lists with comprehensive criteria
   */
  searchLists(criteria: SearchCriteria): Promise<SearchResult<TaskList>>;

  /**
   * Unified search across both tasks and lists
   */
  unifiedSearch(criteria: UnifiedSearchCriteria): Promise<UnifiedSearchResult>;

  /**
   * Filters tasks by agent prompt template presence
   */
  filterTasksByAgentPrompt(
    listId: string,
    hasTemplate: boolean
  ): Promise<Task[]>;
}
