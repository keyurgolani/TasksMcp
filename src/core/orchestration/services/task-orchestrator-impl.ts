/**
 * Task orchestrator implementation
 * Centralized task management with business rule enforcement
 */

import { DataDelegationService } from '../../../data/delegation/data-delegation-service';
import {
  Task,
  TaskStatus,
  Priority,
  VALID_TRANSITIONS,
} from '../../../domain/models/task';
import {
  OrchestrationError,
  ValidationError,
  StatusTransitionError,
  TaskNotFoundError,
} from '../../../shared/errors/orchestration-error';
import {
  CreateTaskData,
  UpdateTaskData,
} from '../../../shared/types/task-operations';
import { ValidationResult } from '../../../shared/types/validation';
import { DataOperation } from '../interfaces/base-orchestrator';
import { TaskOrchestrator } from '../interfaces/task-orchestrator';
import { TaskValidator } from '../validators/task-validator';

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
    const newTags = currentTask.tags.filter(tag => !tags.includes(tag));

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
}
