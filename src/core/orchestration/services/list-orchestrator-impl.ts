/**
 * List orchestrator implementation
 * Centralized task list management with validation
 */

import { DataDelegationService } from '../../../data/delegation/data-delegation-service.js';
import { TaskList } from '../../../domain/models/task-list.js';
import {
  OrchestrationError,
  ValidationError,
  ListNotFoundError,
} from '../../../shared/errors/orchestration-error.js';
import {
  CreateListData,
  UpdateListData,
  ListFilters,
} from '../../../shared/types/list-operations';
import { ValidationResult } from '../../../shared/types/validation.js';
import { DataOperation } from '../interfaces/base-orchestrator.js';
import { ListOrchestrator } from '../interfaces/list-orchestrator.js';
import { ListValidator } from '../validators/list-validator.js';

export class ListOrchestratorImpl implements ListOrchestrator {
  constructor(
    private validator: ListValidator,
    private dataDelegation: DataDelegationService
  ) {}

  async createList(data: CreateListData): Promise<TaskList> {
    const validationResult = this.validate(data);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'List creation validation failed',
        'List Creation',
        data,
        'Valid list data',
        validationResult.errors.map(e => e.message).join('; ')
      );
    }

    const operation: DataOperation = {
      type: 'create',
      entity: 'list',
      data,
    };

    try {
      const list = (await this.delegateData(operation)) as TaskList;
      return list;
    } catch (error) {
      throw this.handleError(error as Error, 'List Creation');
    }
  }

  async updateList(id: string, data: UpdateListData): Promise<TaskList> {
    const validationResult = this.validate(data);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'List update validation failed',
        'List Update',
        data,
        'Valid list update data',
        validationResult.errors.map(e => e.message).join('; ')
      );
    }

    const operation: DataOperation = {
      type: 'update',
      entity: 'list',
      data: { id, ...data },
    };

    try {
      const list = (await this.delegateData(operation)) as TaskList;
      if (!list) {
        throw new ListNotFoundError(id);
      }
      return list;
    } catch (error) {
      throw this.handleError(error as Error, 'List Update');
    }
  }

  async getList(id: string, includeCompleted?: boolean): Promise<TaskList> {
    const operation: DataOperation = {
      type: 'read',
      entity: 'list',
      filters: { id, includeCompleted },
    };

    try {
      const list = (await this.delegateData(operation)) as TaskList;
      if (!list) {
        throw new ListNotFoundError(id);
      }
      return list;
    } catch (error) {
      throw this.handleError(error as Error, 'List Retrieval');
    }
  }

  async getAllLists(filters?: ListFilters): Promise<TaskList[]> {
    const operation: DataOperation = {
      type: 'search',
      entity: 'list',
      filters: filters as Record<string, unknown>,
    };

    try {
      const lists = (await this.delegateData(operation)) as TaskList[];
      return lists || [];
    } catch (error) {
      throw this.handleError(error as Error, 'List Search');
    }
  }

  async deleteList(id: string): Promise<void> {
    const operation: DataOperation = {
      type: 'delete',
      entity: 'list',
      filters: { id },
    };

    try {
      await this.delegateData(operation);
    } catch (error) {
      throw this.handleError(error as Error, 'List Deletion');
    }
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

  // Bulk operations (not available in MCP)
  async createBulkLists(lists: CreateListData[]): Promise<TaskList[]> {
    const results: TaskList[] = [];

    for (const listData of lists) {
      try {
        const list = await this.createList(listData);
        results.push(list);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk List Creation');
      }
    }

    return results;
  }

  async updateBulkLists(
    updates: Array<{ id: string; data: UpdateListData }>
  ): Promise<TaskList[]> {
    const results: TaskList[] = [];

    for (const update of updates) {
      try {
        const list = await this.updateList(update.id, update.data);
        results.push(list);
      } catch (error) {
        throw this.handleError(error as Error, 'Bulk List Update');
      }
    }

    return results;
  }

  async deleteBulkLists(listIds: string[]): Promise<number> {
    let deletedCount = 0;

    for (const listId of listIds) {
      try {
        await this.deleteList(listId);
        deletedCount++;
      } catch (_error) {
        // Continue with other deletions even if one fails
      }
    }

    return deletedCount;
  }
}
