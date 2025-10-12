/**
 * Unit tests for add_task handler with dependency support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleAddTask } from '../../../../src/api/handlers/add-task.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/todo.js';

import type { TodoListManager } from '../../../../src/domain/lists/todo-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';

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
const mockValidateDependencies = vi.fn();
const mockGetReadyItems = vi.fn();
const mockCleanup = vi.fn();

vi.mock('../../../../src/domain/tasks/dependency-manager.js', () => ({
  DependencyResolver: vi.fn().mockImplementation(() => ({
    validateDependencies: mockValidateDependencies,
    getReadyItems: mockGetReadyItems,
    cleanup: mockCleanup,
  })),
}));

// Mock the ExitCriteriaManager
const mockCalculateCriteriaProgress = vi.fn();
const mockAreAllCriteriaMet = vi.fn();

vi.mock('../../../../src/domain/tasks/exit-criteria-manager.js', () => ({
  ExitCriteriaManager: vi.fn().mockImplementation(() => ({
    calculateCriteriaProgress: mockCalculateCriteriaProgress,
    areAllCriteriaMet: mockAreAllCriteriaMet,
  })),
}));

describe('handleAddTask with dependencies', () => {
  let mockTodoListManager: TodoListManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up default mock return values
    mockCalculateCriteriaProgress.mockReturnValue(0);
    mockAreAllCriteriaMet.mockReturnValue(true);

    // Mock TodoListManager
    mockTodoListManager = {
      getTodoList: vi.fn(),
      updateTodoList: vi.fn(),
    } as any;
  });

  it('should add task without dependencies successfully', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          description: 'Test Description',
          priority: 3,
        },
      },
    };

    const mockTask = {
      id: '987fcdeb-51a2-43d1-9f12-345678901234',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [],
      exitCriteria: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockResult = {
      items: [mockTask],
    };

    mockTodoListManager.updateTodoList = vi.fn().mockResolvedValue(mockResult);
    mockGetReadyItems.mockReturnValue([mockTask]);

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain(mockTask.id);
    expect(result.content[0].text).toContain('"isReady": true');
    expect(result.content[0].text).toContain('"dependencies": []');
  });

  it('should add task with valid dependencies successfully', async () => {
    const dependencyId = '111e1111-e11b-11d1-a111-111111111111';
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          dependencies: [dependencyId],
        },
      },
    };

    const mockDependencyTask = {
      id: dependencyId,
      title: 'Dependency Task',
      status: TaskStatus.COMPLETED,
      dependencies: [],
      exitCriteria: [],
    };

    const mockNewTask = {
      id: '987fcdeb-51a2-43d1-9f12-345678901234',
      title: 'Test Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [dependencyId],
      exitCriteria: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockExistingList = {
      items: [mockDependencyTask],
    };

    const mockResult = {
      items: [mockDependencyTask, mockNewTask],
    };

    mockTodoListManager.getTodoList = vi
      .fn()
      .mockResolvedValue(mockExistingList);
    mockTodoListManager.updateTodoList = vi.fn().mockResolvedValue(mockResult);
    mockValidateDependencies.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    mockGetReadyItems.mockReturnValue([mockNewTask]);

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain(mockNewTask.id);
    expect(result.content[0].text).toContain('"isReady": true');
    expect(result.content[0].text).toContain(dependencyId);
  });

  it('should reject task with invalid dependencies', async () => {
    const invalidDependencyId = '999e9999-e99b-99d9-a999-999999999999';
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          dependencies: [invalidDependencyId],
        },
      },
    };

    const mockExistingList = {
      items: [], // No existing tasks
    };

    mockTodoListManager.getTodoList = vi
      .fn()
      .mockResolvedValue(mockExistingList);
    mockValidateDependencies.mockReturnValue({
      isValid: false,
      errors: [
        'Invalid dependencies: 999e9999-e99b-99d9-a999-999999999999 do not exist',
      ],
      warnings: [],
    });

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid UUID format');
  });

  it('should reject task with circular dependencies', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          dependencies: ['111e1111-e11b-11d1-a111-111111111111'],
        },
      },
    };

    const mockExistingList = {
      items: [
        {
          id: '111e1111-e11b-11d1-a111-111111111111',
          title: 'Existing Task',
          dependencies: [],
        },
      ],
    };

    mockTodoListManager.getTodoList = vi
      .fn()
      .mockResolvedValue(mockExistingList);
    mockValidateDependencies.mockReturnValue({
      isValid: false,
      errors: [
        'Circular dependencies detected: temp-validation-id -> 111e1111-e11b-11d1-a111-111111111111',
      ],
      warnings: [],
      circularDependencies: [
        ['temp-validation-id', '111e1111-e11b-11d1-a111-111111111111'],
      ],
    });

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Dependency validation failed');
    expect(result.content[0].text).toContain('Circular dependencies detected');
  });

  it('should handle blocked task correctly', async () => {
    const dependencyId = '111e1111-e11b-11d1-a111-111111111111';
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          dependencies: [dependencyId],
        },
      },
    };

    const mockDependencyTask = {
      id: dependencyId,
      title: 'Dependency Task',
      status: TaskStatus.PENDING, // Not completed
      dependencies: [],
      exitCriteria: [],
    };

    const mockNewTask = {
      id: '987fcdeb-51a2-43d1-9f12-345678901234',
      title: 'Test Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [dependencyId],
      exitCriteria: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockExistingList = {
      items: [mockDependencyTask],
    };

    const mockResult = {
      items: [mockDependencyTask, mockNewTask],
    };

    mockTodoListManager.getTodoList = vi
      .fn()
      .mockResolvedValue(mockExistingList);
    mockTodoListManager.updateTodoList = vi.fn().mockResolvedValue(mockResult);
    mockValidateDependencies.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    mockGetReadyItems.mockReturnValue([]); // Task is not ready

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain(mockNewTask.id);
    expect(result.content[0].text).toContain('"isReady": false');
    expect(result.content[0].text).toContain(dependencyId);
    expect(result.content[0].text).toContain('"blockedBy"');
  });

  it('should handle validation errors gracefully', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: 'invalid-uuid',
          title: '',
        },
      },
    };

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌');
  });

  it('should handle missing list error', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          dependencies: ['111e1111-e11b-11d1-a111-111111111111'],
        },
      },
    };

    mockTodoListManager.getTodoList = vi.fn().mockResolvedValue(null);

    const result = await handleAddTask(request, mockTodoListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Todo list not found');
  });

  it('should log warnings for dependencies on completed tasks', async () => {
    const dependencyId = '111e1111-e11b-11d1-a111-111111111111';
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'add_task',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          dependencies: [dependencyId],
        },
      },
    };

    const mockDependencyTask = {
      id: dependencyId,
      title: 'Completed Task',
      status: TaskStatus.COMPLETED,
      dependencies: [],
      exitCriteria: [],
    };

    const mockExistingList = {
      items: [mockDependencyTask],
    };

    const mockNewTask = {
      id: 'new-task-id',
      title: 'Test Task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: [],
      dependencies: [dependencyId],
      exitCriteria: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTodoListManager.getTodoList = vi
      .fn()
      .mockResolvedValue(mockExistingList);
    mockTodoListManager.updateTodoList = vi.fn().mockResolvedValue({
      items: [mockDependencyTask, mockNewTask],
    });
    mockValidateDependencies.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['Dependencies on completed items: Completed Task'],
    });
    mockGetReadyItems.mockReturnValue([mockNewTask]);

    const result = await handleAddTask(request, mockTodoListManager);

    // Should still succeed but log warnings
    expect(result.isError).toBeFalsy();
    expect(mockValidateDependencies).toHaveBeenCalled();
  });
});
