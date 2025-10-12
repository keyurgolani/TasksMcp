/**
 * Task orchestrator interface for centralized task management
 * Handles all task-related operations with business rule enforcement
 */

import { Task, TaskStatus, Priority } from '../../../domain/models/task';
import {
  CreateTaskData,
  UpdateTaskData,
} from '../../../shared/types/task-operations';

import { BaseOrchestrator } from './base-orchestrator';

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
}
