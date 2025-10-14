/**
 * Unit tests for show_tasks handler with dependency status display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleShowTasks } from '../../../../src/api/handlers/show-tasks.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
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
const mockGetReadyItems = vi.fn();
const mockCleanup = vi.fn();

vi.mock('../../../../src/domain/tasks/dependency-manager.js', () => ({
  DependencyResolver: vi.fn().mockImplementation(() => ({
    getReadyItems: mockGetReadyItems,
    cleanup: mockCleanup,
  })),
}));

describe('handleShowTasks with dependency status display', () => {
  let mockTaskListManager: TaskListManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock TaskListManager
    mockTaskListManager = {
      getTaskList: vi.fn(),
    } as any;
  });

  const createMockTasks = () => {
    const task1 = {
      id: '111e1111-e11b-11d1-a111-111111111111',
      title: 'Task 1 - No Dependencies',
      description: 'A task with no dependencies',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      tags: ['tag1'],
      dependencies: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      estimatedDuration: 60,
    };

    const task2 = {
      id: '222e2222-e22b-22d2-a222-222222222222',
      title: 'Task 2 - Ready with Dependencies',
      description: 'A task that is ready despite having dependencies',
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      tags: ['tag2'],
      dependencies: ['333e3333-e33b-33d3-a333-333333333333'],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      estimatedDuration: 90,
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
      description: 'A task blocked by pending dependencies',
      status: TaskStatus.PENDING,
      priority: Priority.LOW,
      tags: ['tag4'],
      dependencies: ['555e5555-e55b-55d5-a555-555555555555'],
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

  it('should display dependency status in compact format', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
          groupBy: 'none',
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      description: 'Test Description',
      totalItems: 5,
      completedItems: 1,
      progress: 20,
      updatedAt: new Date('2023-01-01'),
      items: mockTasks,
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([
      mockTasks[0],
      mockTasks[1],
      mockTasks[4],
    ]); // Tasks 1, 2, 5 are ready

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;

    // Check that dependency icons are included
    expect(output).toContain('🆓'); // No dependencies icon
    expect(output).toContain('✅'); // Ready with dependencies icon
    expect(output).toContain('⛔'); // Blocked icon

    // Check that dependency counts are shown
    expect(output).toContain('Dependencies: 1'); // Tasks with dependencies show count

    // Check task titles are present
    expect(output).toContain('Task 1 - No Dependencies');
    expect(output).toContain('Task 2 - Ready with Dependencies');
    expect(output).toContain('Task 4 - Blocked');
  });

  it('should display dependency status in detailed format', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
          groupBy: 'none',
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      description: 'Test Description',
      totalItems: 5,
      completedItems: 1,
      progress: 20,
      updatedAt: new Date('2023-01-01'),
      items: mockTasks,
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([
      mockTasks[0],
      mockTasks[1],
      mockTasks[4],
    ]); // Tasks 1, 2, 5 are ready

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;

    // Check that dependency icons are included in task headers
    expect(output).toContain('🆓'); // No dependencies icon
    expect(output).toContain('✅'); // Ready with dependencies icon
    expect(output).toContain('⛔'); // Blocked icon

    // Check that dependency information is in metadata
    expect(output).toContain('Dependencies: 1 (Ready)'); // Ready task with dependencies
    expect(output).toContain('Dependencies: 1 (Blocked)'); // Blocked task

    // Check task descriptions are present
    expect(output).toContain('A task with no dependencies');
    expect(output).toContain(
      'A task that is ready despite having dependencies'
    );
    expect(output).toContain('A task blocked by pending dependencies');
  });

  it('should group tasks by status with dependency indicators', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
          groupBy: 'status',
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 5,
      completedItems: 1,
      progress: 20,
      updatedAt: new Date('2023-01-01'),
      items: mockTasks,
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([
      mockTasks[0],
      mockTasks[1],
      mockTasks[4],
    ]);

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;

    // Check that status grouping headers are present
    expect(output).toContain('## Pending');
    expect(output).toContain('## Completed');

    // Check that dependency icons are still shown within groups
    expect(output).toContain('🆓');
    expect(output).toContain('✅');
    expect(output).toContain('⛔');
  });

  it('should group tasks by priority with dependency indicators', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
          groupBy: 'priority',
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 5,
      completedItems: 1,
      progress: 20,
      updatedAt: new Date('2023-01-01'),
      items: mockTasks,
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([
      mockTasks[0],
      mockTasks[1],
      mockTasks[4],
    ]);

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;

    // Check that priority grouping headers are present
    expect(output).toContain('## High Priority');
    expect(output).toContain('## Medium Priority');
    expect(output).toContain('## Low Priority');

    // Check that dependency icons are still shown within groups
    expect(output).toContain('🆓');
    expect(output).toContain('✅');
    expect(output).toContain('⛔');
  });

  it('should handle summary format (no dependency changes needed)', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      description: 'Test Description',
      totalItems: 5,
      completedItems: 1,
      progress: 20,
      updatedAt: new Date('2023-01-01'),
      projectTag: 'test-project',
      items: mockTasks,
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([
      mockTasks[0],
      mockTasks[1],
      mockTasks[4],
    ]);

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;

    // Summary format should work as before (no dependency icons needed)
    expect(output).toContain('# Test List');
    expect(output).toContain('Task 1 - No Dependencies');
    expect(output).toContain('Task 2 - Ready with Dependencies');
    expect(output).toContain('Task 3 - Completed Dependency');
    expect(output).toContain('Task 4 - Blocked');
  });

  it('should handle empty task list', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
        },
      },
    };

    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Empty List',
      totalItems: 0,
      completedItems: 0,
      progress: 0,
      updatedAt: new Date('2023-01-01'),
      items: [],
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([]);

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;
    expect(output).toContain('No tasks to display.');
  });

  it('should handle list not found error', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(null);

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Task list not found');
  });

  it('should handle Validation errors', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: 'invalid-uuid',
        },
      },
    };

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌');
  });

  it('should call cleanup on dependency resolver', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
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

    await handleShowTasks(request, mockTaskListManager);

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should exclude completed tasks when includeCompleted=false', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'show_tasks',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
          format: 'detailed',
          includeCompleted: false,
        },
      },
    };

    const mockTasks = createMockTasks();
    const mockList = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test List',
      totalItems: 5,
      completedItems: 1,
      progress: 20,
      updatedAt: new Date('2023-01-01'),
      items: mockTasks,
    };

    mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(mockList);
    mockGetReadyItems.mockReturnValue([
      mockTasks[0],
      mockTasks[1],
      mockTasks[4],
    ]);

    const result = await handleShowTasks(request, mockTaskListManager);

    expect(result.isError).toBeFalsy();

    const output = result.content[0].text;

    // Should not contain the completed task
    expect(output).not.toContain('Task 3 - Completed Dependency');

    // Should contain the pending tasks
    expect(output).toContain('Task 1 - No Dependencies');
    expect(output).toContain('Task 2 - Ready with Dependencies');
    expect(output).toContain('Task 4 - Blocked');
    expect(output).toContain('Task 5 - Pending Dependency');
  });
});
