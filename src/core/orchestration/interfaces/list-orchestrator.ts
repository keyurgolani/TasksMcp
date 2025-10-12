/**
 * List orchestrator interface for task list management
 * Handles all list-related operations with validation
 */

import { TaskList } from '../../../domain/models/task-list';
import {
  CreateListData,
  UpdateListData,
  ListFilters,
} from '../../../shared/types/list-operations';

import { BaseOrchestrator } from './base-orchestrator';

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
}
