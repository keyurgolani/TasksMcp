import { describe, it, expect, afterEach, vi } from 'vitest';
import { DataSourceRouter, type DataSourceConfig } from '../../../../src/infrastructure/storage/data-source-router.js';
import type { StorageBackend } from '../../../../src/shared/types/storage.js';
import type { TodoList } from '../../../../src/shared/types/todo.js';

function createMockTodoList(): TodoList {
  return {
    id: 'test-list',
    title: 'Test List',
    description: 'Test description',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    context: 'test',
    isArchived: false,
    totalItems: 0,
    completedItems: 0,
    progress: 0,
    analytics: {
      totalItems: 0,
      completedItems: 0,
      inProgressItems: 0,
      blockedItems: 0,
      progress: 0,
      averageCompletionTime: 0,
      estimatedTimeRemaining: 0,
      velocityMetrics: { itemsPerDay: 0, completionRate: 0 },
      complexityDistribution: {},
      tagFrequency: {},
      dependencyGraph: [],
    },
    metadata: {},
    projectTag: 'test',
    implementationNotes: [],
  };
}

class MockStorageBackend implements StorageBackend {
  public saveCallCount = 0;
  async initialize(): Promise<void> {}
  async healthCheck(): Promise<boolean> { return true; }
  async save(): Promise<void> { this.saveCallCount++; }
  async load(): Promise<TodoList | null> { return createMockTodoList(); }
  async delete(): Promise<void> {}
  async list(): Promise<[]> { return []; }
  async shutdown(): Promise<void> {}
  async loadAllData(): Promise<{ version: string; todoLists: TodoList[] }> {
    return { version: '1.0', todoLists: [] };
  }
  async saveAllData(): Promise<void> {}
}

vi.mock('../../../../src/infrastructure/storage/storage-factory.js', () => ({
  StorageFactory: {
    createStorage: vi.fn(async () => new MockStorageBackend()),
  },
}));

describe('DataSourceRouter', () => {
  let router: DataSourceRouter;

  afterEach(async () => {
    if (router) {
      await router.shutdown();
    }
    vi.clearAllMocks();
  });

  it('should initialize data sources', async () => {
    const config: DataSourceConfig[] = [{
      id: 'source1',
      name: 'Source 1',
      type: 'filesystem',
      priority: 100,
      readonly: false,
      enabled: true,
      config: { type: 'file', file: { dataDirectory: './data' } },
    }];

    router = new DataSourceRouter(config);
    await router.initialize();

    const status = router.getStatus();
    expect(status.total).toBe(1);
    expect(status.healthy).toBe(1);
  });

  it('should route read operations', async () => {
    const config: DataSourceConfig[] = [{
      id: 'primary',
      name: 'Primary',
      type: 'filesystem',
      priority: 100,
      readonly: false,
      enabled: true,
      config: { type: 'file', file: { dataDirectory: './data' } },
    }];

    router = new DataSourceRouter(config);
    await router.initialize();

    const result = await router.routeOperation<TodoList | null>({
      type: 'read',
      key: 'test-key',
    }, {});

    expect(result).toBeTruthy();
    expect(result?.id).toBe('test-list');
  });

  it('should route write operations', async () => {
    const config: DataSourceConfig[] = [{
      id: 'primary',
      name: 'Primary',
      type: 'filesystem',
      priority: 100,
      readonly: false,
      enabled: true,
      config: { type: 'file', file: { dataDirectory: './data' } },
    }];

    router = new DataSourceRouter(config);
    await router.initialize();

    await router.routeOperation({
      type: 'write',
      key: 'test-key',
      data: createMockTodoList(),
    }, {});

    const backend = router.getBackend('primary') as MockStorageBackend;
    expect(backend.saveCallCount).toBe(1);
  });
});
