/**
 * DataSourceRouter Adapter
 * Adapts DataSourceRouter to work as a StorageBackend
 */

import {
  StorageBackend,
  SaveOptions,
  LoadOptions,
  ListOptions,
} from '../../shared/types/storage.js';
import { TaskList, TaskListSummary } from '../../shared/types/task.js';

import { DataSourceRouter } from './data-source-router.js';

export class DataSourceRouterAdapter extends StorageBackend {
  constructor(private router: DataSourceRouter) {
    super();
  }

  async save(
    key: string,
    data: TaskList,
    options?: SaveOptions
  ): Promise<void> {
    await this.router.routeOperation({
      type: 'write',
      key,
      data,
      options: (options as Record<string, unknown>) || {},
    });
  }

  async load(key: string, options?: LoadOptions): Promise<TaskList | null> {
    try {
      const result = await this.router.routeOperation<TaskList>({
        type: 'read',
        key,
        options: (options as Record<string, unknown>) || {},
      });
      return result;
    } catch (_error) {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.router.routeOperation({
      type: 'delete',
      key,
    });
  }

  // Override for DataAccessService compatibility
  async deleteEntity(
    _entity: string,
    filters?: Record<string, unknown>
  ): Promise<void> {
    if (filters?.['id']) {
      await this.delete(filters['id'] as string);
    }
  }

  async list(options?: ListOptions): Promise<TaskListSummary[]> {
    const result = await this.router.routeOperation<TaskListSummary[]>({
      type: 'read',
      options: (options as Record<string, unknown>) || {},
    });
    return Array.isArray(result) ? result : [];
  }

  async initialize(): Promise<void> {
    await this.router.initialize();
  }

  async healthCheck(): Promise<boolean> {
    const status = this.router.getStatus();
    return status.healthy > 0;
  }

  async shutdown(): Promise<void> {
    await this.router.shutdown();
  }

  async loadAllData(): Promise<
    import('../../shared/types/storage.js').StorageData
  > {
    const lists = await this.list();
    return {
      version: '1.0.0',
      taskLists: lists as unknown as TaskList[],
    };
  }

  async saveAllData(
    data: import('../../shared/types/storage.js').StorageData,
    options?: SaveOptions
  ): Promise<void> {
    for (const list of data.taskLists) {
      await this.save(list.id, list, options);
    }
  }

  // DataAccessService-like methods for compatibility
  async create(_entity: string, data: unknown): Promise<unknown> {
    const entityData = data as { id: string };
    await this.save(entityData.id, data as TaskList);
    return data;
  }

  async read(
    _entity: string,
    filters?: Record<string, unknown>
  ): Promise<unknown> {
    if (filters?.['id']) {
      return await this.load(filters['id'] as string);
    }
    return await this.list();
  }

  async update(_entity: string, data: unknown): Promise<unknown> {
    const entityData = data as { id: string };
    await this.save(entityData.id, data as TaskList);
    return data;
  }

  async search(
    _entity: string,
    criteria?: Record<string, unknown>
  ): Promise<unknown> {
    return await this.list(criteria as ListOptions);
  }
}
