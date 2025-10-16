/**
 * List orchestrator interface for task list management
 * Handles all list-related operations with validation
 */

import { TaskList } from '../../../domain/models/task-list.js';
import {
  CreateListData,
  UpdateListData,
  ListFilters,
} from '../../../shared/types/list-operations';

import { BaseOrchestrator } from './base-orchestrator.js';

export interface ListOrchestrator extends BaseOrchestrator {
  /**
   * Creates a new task list with validation
   */
  createList(data: CreateListData): Promise<TaskList>;

  /**
   * Updates an existing task list with validation
   */
  updateList(id: string, data: UpdateListData): Promise<TaskList>;

  /**
   * Gets a task list by ID
   */
  getList(id: string, includeCompleted?: boolean): Promise<TaskList>;

  /**
   * Gets all task lists with optional filtering
   */
  getAllLists(filters?: ListFilters): Promise<TaskList[]>;

  /**
   * Deletes a task list permanently
   */
  deleteList(id: string): Promise<void>;

  // Bulk operations (not available in MCP)
  /**
   * Creates multiple task lists in bulk
   */
  createBulkLists(lists: CreateListData[]): Promise<TaskList[]>;

  /**
   * Updates multiple task lists in bulk
   */
  updateBulkLists(
    updates: Array<{ id: string; data: UpdateListData }>
  ): Promise<TaskList[]>;

  /**
   * Deletes multiple task lists in bulk
   */
  deleteBulkLists(listIds: string[]): Promise<number>;
}
