/**
 * Unit tests for filter_tasks handler with dependency filters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleFilterTasks } from '../../../../src/api/handlers/filter-tasks.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { TodoListManager } from '../../../../src/domain/lists/todo-list-manager.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/todo.js';

// Mock the logger
vi.mock('../../../../src/shared/utils/logger.js', () => ({
  logger: {
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

describe('handleFilterTasks with dependency filters', () => {
  let mockTodoListManager: TodoListManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock TodoListManager
    mockTodoListManager = {
      getTodoList: vi.fn(),
    } as any;
  });

  const createMockTasks = () => {
    const task1 = {
      id: '111e1111-e11b-11d1-a111-111111111111',
      title: 'Task 1 - No Dependencies',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: ['tag1'],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const task2 = {
      id: '222e2222-e22b-22d2-a222-222222222222',
      title: 'Task 2 - With Dependencies (Ready)',
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      tags: ['tag2'],
      dependencies: ['333e3333-e33b-33d3-a333-333333333333'], // Depends on completed task
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const task3 = {
      id: '333e3333-e33b-33d3-a333-333333333333',
      title: 'Task 3 - Completed Dependency',
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      tags: ['tag3'],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const task4 = {
      id: '444e4444-e44b-44d4-a444-444444444444',
      title: 'Task 4 - Blocked',
      status: TaskStatus.PENDING,
      priority: Priority.LOW,
      tags: ['tag4'],
      dependencies: ['555e5555-e55b-55d5-a555-555555555555'], // Depends on pending task
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const task5 = {
      id: '555e5555-e55b-55d5-a555-555555555555',
      title: 'Task 5 - Pending Dependency',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: ['tag5'],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    return [task1, task2, task3, task4, task5];
  };

  it('should filter tasks by hasDependencies=true', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          hasDependencies: true,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(2); // Tasks 2 and 4 have dependencies
    expect(response.results.map((t: any) => t.id)).toEqual([
      '222e2222-e22b-22d2-a222-222222222222',
      '444e4444-e44b-44d4-a444-444444444444',
    ]);
  });

  it('should filter tasks by hasDependencies=false', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          hasDependencies: false,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]);

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(3); // Tasks 1, 3, 5 have no dependencies
    expect(response.results.map((t: any) => t.id)).toEqual([
      '111e1111-e11b-11d1-a111-111111111111',
      '333e3333-e33b-33d3-a333-333333333333',
      '555e5555-e55b-55d5-a555-555555555555',
    ]);
  });

  it('should filter tasks by isReady=true', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isReady: true,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(3); // Tasks 1, 2, 5 are ready
    expect(response.results.map((t: any) => t.id)).toEqual([
      '111e1111-e11b-11d1-a111-111111111111',
      '222e2222-e22b-22d2-a222-222222222222',
      '555e5555-e55b-55d5-a555-555555555555',
    ]);
    
    // Check that all returned tasks have isReady: true
    response.results.forEach((task: any) => {
      expect(task.isReady).toBe(true);
    });
  });

  it('should filter tasks by isReady=false', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isReady: false,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(2); // Tasks 3, 4 are not ready
    expect(response.results.map((t: any) => t.id)).toEqual([
      '333e3333-e33b-33d3-a333-333333333333',
      '444e4444-e44b-44d4-a444-444444444444',
    ]);
    
    // Check that all returned tasks have isReady: false
    response.results.forEach((task: any) => {
      expect(task.isReady).toBe(false);
    });
  });

  it('should filter tasks by isBlocked=true', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isBlocked: true,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(1); // Only Task 4 is blocked (has dependencies and not ready)
    expect(response.results[0].id).toBe('444e4444-e44b-44d4-a444-444444444444');
    expect(response.results[0].isReady).toBe(false);
    expect(response.results[0].dependencies).toHaveLength(1);
  });

  it('should filter tasks by isBlocked=false', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isBlocked: false,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(4); // All tasks except Task 4 are not blocked
    expect(response.results.map((t: any) => t.id)).toEqual([
      '111e1111-e11b-11d1-a111-111111111111',
      '222e2222-e22b-22d2-a222-222222222222',
      '333e3333-e33b-33d3-a333-333333333333',
      '555e5555-e55b-55d5-a555-555555555555',
    ]);
  });

  it('should combine dependency filters with existing filters', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'pending',
          hasDependencies: true,
          isReady: true,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(1); // Only Task 2 matches all criteria
    expect(response.results[0].id).toBe('222e2222-e22b-22d2-a222-222222222222');
    expect(response.results[0].status).toBe('pending');
    expect(response.results[0].dependencies).toHaveLength(1);
    expect(response.results[0].isReady).toBe(true);
  });

  it('should include blockedBy information in results', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isBlocked: true,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: mockTasks,
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([mockTasks[0], mockTasks[1], mockTasks[4]]); // Tasks 1, 2, 5 are ready

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    
    const response = JSON.parse(result.content[0].text);
    expect(response.results).toHaveLength(1);
    expect(response.results[0].blockedBy).toEqual(['555e5555-e55b-55d5-a555-555555555555']);
  });

  it('should handle list not found error', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isReady: true,
        },
      },
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(null);

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Todo list not found');
  });

  it('should handle validation errors', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: 'invalid-uuid',
          isReady: true,
        },
      },
    };

    const result = await handleFilterTasks(request, mockTodoListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌');
  });

  it('should call cleanup on dependency resolver', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'filter_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          isReady: true,
        },
      },
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      items: [],
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([]);

    await handleFilterTasks(request, mockTodoListManager);

    expect(mockCleanup).toHaveBeenCalled();
  });
});