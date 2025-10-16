/**
 * Task orchestrator implementation
 * Centralized task management with business rule enforcement
 */

import { DataDelegationService } from '../../../data/delegation/data-delegation-service.js';
import {
  Task,
  TaskStatus,
  Priority,
  VALID_TRANSITIONS,
} from '../../../domain/models/task.js';
import {
  OrchestrationError,
  ValidationError,
  StatusTransitionError,
  TaskNotFoundError,
} from '../../../shared/errors/orchestration-error.js';
import {
  CreateTaskData,
  UpdateTaskData,
  SearchTasksData,
} from '../../../shared/types/task-operations';
import { ValidationResult } from '../../../shared/types/validation.js';
import { DataOperation } from '../interfaces/base-orchestrator.js';
import { TaskOrchestrator } from '../interfaces/task-orchestrator.js';
import { TaskValidator } from '../validators/task-validator.js';

export class TaskOrchestratorImpl implements TaskOrchestrator {
  constructor(
    private validator: TaskValidator,
    private dataDelegation: DataDelegationService
  ) {}

  async createTask(data: CreateTaskData): Promise<Task> {
    const validationResult = this.validate(data);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'Task creation validation failed',
        'Task Creation',
        data,
        'Valid task data',
        validationResult.errors.map(e => e.message).join('; ')
      );
    }

    const operation: DataOperation = {
      type: 'create',
      entity: 'task',
      data,
    };

    try {
      const task = (await this.delegateData(operation)) as Task;
      return task;
    } catch (error) {
      throw this.handleError(error as Error, 'Task Creation');
    }
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const validationResult = this.validate(data);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'Task update validation failed',
        'Task Update',
        data,
        'Valid task update data',
        validationResult.errors.map(e => e.message).join('; ')
      );
    }

    const operation: DataOperation = {
      type: 'update',
      entity: 'task',
      data: { id, ...data },
    };

    try {
      const task = (await this.delegateData(operation)) as Task;
      if (!task) {
        throw new TaskNotFoundError(id);
      }
      return task;
    } catch (error) {
      throw this.handleError(error as Error, 'Task Update');
    }
  }

  async setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    // First get the current task to validate transition
    const currentTask = await this.getTask(id);

    // Allow same status (no-op transitions)
    if (currentTask.status === status) {
      return currentTask;
    }

    const validTransitions = VALID_TRANSITIONS[currentTask.status];

    if (!validTransitions.includes(status)) {
      throw new StatusTransitionError(
        `Invalid status transition from ${currentTask.status} to ${status}`,
        currentTask.status,
        status,
        validTransitions
      );
    }

    return this.updateTask(id, {
      status,
      ...(status === TaskStatus.COMPLETED && { completedAt: new Date() }),
    });
  }

  async setTaskPriority(id: string, priority: Priority): Promise<Task> {
    if (priority < Priority.MINIMAL || priority > Priority.CRITICAL) {
      throw new ValidationError(
        'Invalid priority value',
        'Task Priority Update',
        priority,
        `Priority between ${Priority.MINIMAL} and ${Priority.CRITICAL}`,
        `Priority must be between ${Priority.MINIMAL} (minimal) and ${Priority.CRITICAL} (critical)`
      );
    }

    return this.updateTask(id, { priority });
  }

  async addTaskTags(id: string, tags: string[]): Promise<Task> {
    const validationResult = this.validator.validateTags(tags);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'Tag validation failed',
        'Task Tag Addition',
        tags,
        'Valid tags',
        validationResult.errors.map(e => e.message).join('; ')
      );
    }

    const currentTask = await this.getTask(id);
    const newTags = [...new Set([...currentTask.tags, ...tags])];

    return this.updateTask(id, { tags: newTags });
  }

  async removeTaskTags(id: string, tags: string[]): Promise<Task> {
    const currentTask = await this.getTask(id);
    const newTags = currentTask.tags.filter(
      (tag: string) => !tags.includes(tag)
    );

    return this.updateTask(id, { tags: newTags });
  }

  async getTask(id: string): Promise<Task> {
    const operation: DataOperation = {
      type: 'read',
      entity: 'task',
      filters: { id },
    };

    try {
      const task = (await this.delegateData(operation)) as Task;
      if (!task) {
        throw new TaskNotFoundError(id);
      }

      // Skip block reason calculation during task retrieval to avoid circular dependencies
      // Block reasons can be calculated on-demand when specifically requested

      return task;
    } catch (error) {
      throw this.handleError(error as Error, 'Task Retrieval');
    }
  }

  async deleteTask(id: string): Promise<void> {
    const operation: DataOperation = {
      type: 'delete',
      entity: 'task',
      filters: { id },
    };

    try {
      await this.delegateData(operation);
    } catch (error) {
      throw this.handleError(error as Error, 'Task Deletion');
    }
  }

  async completeTask(id: string): Promise<Task> {
    return this.setTaskStatus(id, TaskStatus.COMPLETED);
  }

  async setTaskExitCriteria(id: string, exitCriteria: string[]): Promise<Task> {
    // Verify task exists (will throw if not found)
    await this.getTask(id);

    const newExitCriteria = exitCriteria.map(description => ({
      id: crypto.randomUUID(),
      description,
      isMet: false,
      updatedAt: new Date(),
    }));

    const operation: DataOperation = {
      type: 'update',
      entity: 'task',
      data: { id, exitCriteria: newExitCriteria },
    };

    const result = await this.delegateData(operation);
    return result as Task;
  }

  async updateExitCriteria(
    taskId: string,
    criteriaId: string,
    updates: {
      isMet?: boolean;
      notes?: string;
    }
  ): Promise<Task> {
    const currentTask = await this.getTask(taskId);

    const updatedExitCriteria = currentTask.exitCriteria.map(criteria => {
      if (criteria.id === criteriaId) {
        return {
          ...criteria,
          ...(updates.isMet !== undefined && { isMet: updates.isMet }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          updatedAt: new Date(),
        };
      }
      return criteria;
    });

    const operation: DataOperation = {
      type: 'update',
      entity: 'task',
      data: { id: taskId, exitCriteria: updatedExitCriteria },
    };

    const result = await this.delegateData(operation);
    return result as Task;
  }

  validate(data: unknown): ValidationResult {
    return this.validator.validate(data);
  }

  handleError(error: Error, context: string): OrchestrationError {
    if (error instanceof OrchestrationError) {
      return error;
    }

    return new OrchestrationError(
      error.message,
      context,
      undefined,
      undefined,
      'Check the error details and ensure all required fields are provided correctly'
    );
  }

  async delegateData(operation: DataOperation): Promise<unknown> {
    return this.dataDelegation.execute(operation);
  }

  async searchTasks(criteria: SearchTasksData): Promise<{
    tasks: Task[];
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  }> {
    const operation: DataOperation = {
      type: 'search',
      entity: 'task',
      filters: criteria as Record<string, unknown>,
    };

    try {
      const result = (await this.delegateData(operation)) as {
        tasks: Task[];
        total: number;
        offset: number;
        limit: number;
        hasMore: boolean;
      };

      // Skip block reason calculation during search to avoid performance issues
      // Block reasons can be calculated on-demand when needed
      return result;
    } catch (error) {
      throw this.handleError(error as Error, 'Task Search');
    }
  }

  // Bulk operations (not available in MCP)
  async createBulkTasks(tasks: CreateTaskData[]): Promise<Task[]> {
    const results: Task[] = [];

    for (const taskData of tasks) {
      try {
        const task = await this.createTask(taskData);
        results.push(task);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk Task Creation');
      }
    }

    return results;
  }

  async updateBulkTasks(
    updates: Array<{ id: string; data: UpdateTaskData }>
  ): Promise<Task[]> {
    const results: Task[] = [];

    for (const update of updates) {
      try {
        const task = await this.updateTask(update.id, update.data);
        results.push(task);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk Task Update');
      }
    }

    return results;
  }

  async deleteBulkTasks(taskIds: string[]): Promise<number> {
    let deletedCount = 0;

    for (const taskId of taskIds) {
      try {
        await this.deleteTask(taskId);
        deletedCount++;
      } catch (_error) {
        // Continue with other deletions even if one fails
      }
    }

    return deletedCount;
  }

  async completeBulkTasks(taskIds: string[]): Promise<Task[]> {
    const results: Task[] = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.completeTask(taskId);
        results.push(task);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk Task Completion');
      }
    }

    return results;
  }

  async setBulkTaskPriority(
    taskIds: string[],
    priority: Priority
  ): Promise<Task[]> {
    const results: Task[] = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.setTaskPriority(taskId, priority);
        results.push(task);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk Task Priority Update');
      }
    }

    return results;
  }

  async addBulkTaskTags(taskIds: string[], tags: string[]): Promise<Task[]> {
    const results: Task[] = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.addTaskTags(taskId, tags);
        results.push(task);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk Task Tag Addition');
      }
    }

    return results;
  }

  async removeBulkTaskTags(taskIds: string[], tags: string[]): Promise<Task[]> {
    const results: Task[] = [];

    for (const taskId of taskIds) {
      try {
        const task = await this.removeTaskTags(taskId, tags);
        results.push(task);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk Task Tag Removal');
      }
    }

    return results;
  }
}
