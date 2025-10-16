/**
 * Task orchestrator interface for centralized task management
 * Handles all task-related operations with business rule enforcement
 */

import { Task, TaskStatus, Priority } from '../../../domain/models/task.js';
import {
  CreateTaskData,
  UpdateTaskData,
  SearchTasksData,
} from '../../../shared/types/task-operations';

import { BaseOrchestrator } from './base-orchestrator.js';

export interface TaskOrchestrator extends BaseOrchestrator {
  /**
   * Creates a new task with validation
   */
  createTask(data: CreateTaskData): Promise<Task>;

  /**
   * Updates an existing task with validation
   */
  updateTask(id: string, data: UpdateTaskData): Promise<Task>;

  /**
   * Sets task status with transition validation
   */
  setTaskStatus(id: string, status: TaskStatus): Promise<Task>;

  /**
   * Sets task priority with validation
   */
  setTaskPriority(id: string, priority: Priority): Promise<Task>;

  /**
   * Adds tags to a task with validation
   */
  addTaskTags(id: string, tags: string[]): Promise<Task>;

  /**
   * Removes tags from a task
   */
  removeTaskTags(id: string, tags: string[]): Promise<Task>;

  /**
   * Gets a task by ID
   */
  getTask(id: string): Promise<Task>;

  /**
   * Deletes a task permanently
   */
  deleteTask(id: string): Promise<void>;

  /**
   * Completes a task with validation
   */
  completeTask(id: string): Promise<Task>;

  /**
   * Sets task exit criteria
   */
  setTaskExitCriteria(id: string, exitCriteria: string[]): Promise<Task>;

  /**
   * Updates exit criteria status
   */
  updateExitCriteria(
    taskId: string,
    criteriaId: string,
    updates: {
      isMet?: boolean;
      notes?: string;
    }
  ): Promise<Task>;

  /**
   * Searches tasks with criteria
   */
  searchTasks(criteria: SearchTasksData): Promise<{
    tasks: Task[];
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  }>;

  // Bulk operations (not available in MCP)
  /**
   * Creates multiple tasks in bulk
   */
  createBulkTasks(tasks: CreateTaskData[]): Promise<Task[]>;

  /**
   * Updates multiple tasks in bulk
   */
  updateBulkTasks(
    updates: Array<{ id: string; data: UpdateTaskData }>
  ): Promise<Task[]>;

  /**
   * Deletes multiple tasks in bulk
   */
  deleteBulkTasks(taskIds: string[]): Promise<number>;

  /**
   * Completes multiple tasks in bulk
   */
  completeBulkTasks(taskIds: string[]): Promise<Task[]>;

  /**
   * Sets priority for multiple tasks in bulk
   */
  setBulkTaskPriority(taskIds: string[], priority: Priority): Promise<Task[]>;

  /**
   * Adds tags to multiple tasks in bulk
   */
  addBulkTaskTags(taskIds: string[], tags: string[]): Promise<Task[]>;

  /**
   * Removes tags from multiple tasks in bulk
   */
  removeBulkTaskTags(taskIds: string[], tags: string[]): Promise<Task[]>;
}
