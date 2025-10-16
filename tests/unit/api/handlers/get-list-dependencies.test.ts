/**
 * Unit tests for get_list handler with dependency information
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleGetList } from '../../../../src/api/handlers/get-list.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';

// Mock the logger
vi.mock('../../../../src/shared/utils/logger.js', () => ({
  LOGGER: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the DependencyResolver
const mockGetReadyItems = vi.fn();
const mockCleanup = vi.fn();

vi.mock('../../../../src/domain/tasks/dependency-manager.js', () => ({
  DependencyResolver: vi.fn().mockImplementation(() => ({
    getReadyItems: mockGetReadyItems,
    cleanup: mockCleanup,
  })),
}));

describe('handleGetList with dependency information', () => {
  let mockTaskListManager: TaskListManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock TaskListManager
    mockTaskListManager = {
      getTaskList: vi.fn(),
    } as any;
  });

  it('should include dependency information for tasks without dependencies', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    const mockTask = {
      id: '987fcdeb-51a2-43d1-9f12-345678901234',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: ['test'],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      estimatedDuration: 60,
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      description: 'Test Description',
      totalItems: 1,
      completedItems: 0,
      progress: 0,
      updatedAt: new Date('2023-01-01'),
      projectTag: 'test-project',
      items: [mockTask],
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTask]);

    const result = await handleGetList(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const response = JSON.parse(result.content[0].text);
    expect(response.tasks).toHaveLength(1);
    expect(response.tasks[0]).toMatchObject({
      id: mockTask.id,
      title: mockTask.title,
      dependencies: [],
      isReady: true,
    });
    expect(response.tasks[0]).not.toHaveProperty('blockedBy');
  });

  it('should include dependency information for tasks with dependencies', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    const dependencyId = '111e1111-e11b-11d1-a111-111111111111';
    const dependentId = '222e2222-e22b-22d2-a222-222222222222';

    const mockDependencyTask = {
      id: dependencyId,
      title: 'Dependency Task',
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockDependentTask = {
      id: dependentId,
      title: 'Dependent Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [dependencyId],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 2,
      completedItems: 1,
      progress: 50,
      updatedAt: new Date('2023-01-01'),
      items: [mockDependencyTask, mockDependentTask],
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockDependentTask]); // Dependent task is ready

    const result = await handleGetList(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const response = JSON.parse(result.content[0].text);
    expect(response.tasks).toHaveLength(2);

    // Check dependency task
    const dependencyTaskResponse = response.tasks.find(
      (t: any) => t.id === dependencyId
    );
    expect(dependencyTaskResponse).toMatchObject({
      id: dependencyId,
      dependencies: [],
      isReady: false, // Completed tasks are not ready
    });

    // Check dependent task
    const dependentTaskResponse = response.tasks.find(
      (t: any) => t.id === dependentId
    );
    expect(dependentTaskResponse).toMatchObject({
      id: dependentId,
      dependencies: [dependencyId],
      isReady: true,
    });
    expect(dependentTaskResponse).not.toHaveProperty('blockedBy');
  });

  it('should include blockedBy information for blocked tasks', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    const dependencyId = '111e1111-e11b-11d1-a111-111111111111';
    const dependentId = '222e2222-e22b-22d2-a222-222222222222';

    const mockDependencyTask = {
      id: dependencyId,
      title: 'Dependency Task',
      status: TaskStatus.PENDING, // Not completed
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockDependentTask = {
      id: dependentId,
      title: 'Dependent Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [dependencyId],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 2,
      completedItems: 0,
      progress: 0,
      updatedAt: new Date('2023-01-01'),
      items: [mockDependencyTask, mockDependentTask],
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockDependencyTask]); // Only dependency task is ready

    const result = await handleGetList(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const response = JSON.parse(result.content[0].text);
    expect(response.tasks).toHaveLength(2);

    // Check dependency task
    const dependencyTaskResponse = response.tasks.find(
      (t: any) => t.id === dependencyId
    );
    expect(dependencyTaskResponse).toMatchObject({
      id: dependencyId,
      dependencies: [],
      isReady: true,
    });

    // Check dependent task (should be blocked)
    const dependentTaskResponse = response.tasks.find(
      (t: any) => t.id === dependentId
    );
    expect(dependentTaskResponse).toMatchObject({
      id: dependentId,
      dependencies: [dependencyId],
      isReady: false,
      blockedBy: [dependencyId],
    });
  });

  it('should handle multiple dependencies correctly', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    const dep1Id = '111e1111-e11b-11d1-a111-111111111111';
    const dep2Id = '222e2222-e22b-22d2-a222-222222222222';
    const dependentId = '333e3333-e33b-33d3-a333-333333333333';

    const mockDep1Task = {
      id: dep1Id,
      title: 'Dependency 1',
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockDep2Task = {
      id: dep2Id,
      title: 'Dependency 2',
      status: TaskStatus.PENDING, // Not completed
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockDependentTask = {
      id: dependentId,
      title: 'Dependent Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [dep1Id, dep2Id],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 3,
      completedItems: 1,
      progress: 33.33,
      updatedAt: new Date('2023-01-01'),
      items: [mockDep1Task, mockDep2Task, mockDependentTask],
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockDep2Task]); // Only dep2 is ready

    const result = await handleGetList(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const response = JSON.parse(result.content[0].text);
    expect(response.tasks).toHaveLength(3);

    // Check dependent task (should be blocked by dep2 only, since dep1 is completed)
    const dependentTaskResponse = response.tasks.find(
      (t: any) => t.id === dependentId
    );
    expect(dependentTaskResponse).toMatchObject({
      id: dependentId,
      dependencies: [dep1Id, dep2Id],
      isReady: false,
      blockedBy: [dep2Id], // Only blocked by the pending dependency
    });
  });

  it('should handle list not found error', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(null);

    const result = await handleGetList(request, mockTaskListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Task list not found');
  });

  it('should handle Validation errors', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: 'invalid-uuid',
        },
      },
    };

    const result = await handleGetList(request, mockTaskListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌');
  });

  it('should call cleanup on dependency resolver', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'get_list',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 0,
      completedItems: 0,
      progress: 0,
      updatedAt: new Date('2023-01-01'),
      items: [],
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([]);

    await handleGetList(request, mockTaskListManager);

    expect(mockCleanup).toHaveBeenCalled();
  });
});
