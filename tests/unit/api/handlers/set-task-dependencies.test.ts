/**
 * Unit tests for SetTaskDependenciesHandler
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

import { handleSetTaskDependencies } from '../../../../src/api/handlers/set-task-dependencies.js';
import { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import { MemoryStorageBackend } from '../../../../src/infrastructure/storage/memory-storage.js';
import {
  TaskStatus,
  Priority,
  type TaskList,
  type Task,
} from '../../../../src/shared/types/task.js';
import { createTaskListManager } from '../../../utils/test-helpers.js';

import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';

describe('SetTaskDependenciesHandler', () => {
  let manager: TaskListManager;
  let storage: MemoryStorageBackend;
  let testList: TaskList;
  let task1: Task;
  let task2: Task;
  let task3: Task;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize(); // Initialize storage before creating manager
    manager = createTaskListManager(storage);
    await manager.initialize();

    // Create a test list with multiple tasks
    testList = await manager.createTaskList({
      title: 'Test Dependencies List',
      description: 'A list for testing dependencies',
      tasks: [
        {
          title: 'Task 1',
          description: 'First task',
          priority: Priority.HIGH,
        },
        {
          title: 'Task 2',
          description: 'Second task',
          priority: Priority.MEDIUM,
        },
        {
          title: 'Task 3',
          description: 'Third task',
          priority: Priority.LOW,
        },
      ],
      projectTag: 'test-project',
    });

    task1 = testList.items[0]!;
    task2 = testList.items[1]!;
    task3 = testList.items[2]!;
  });

  describe('Valid dependency operations', () => {
    test('sets dependencies for a task successfully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.id).toBe(task2.id);
      expect(responseData.dependencies).toEqual([task1.id]);
      expect(responseData.message).toContain(
        'Dependencies updated successfully'
      );
    });

    test('sets multiple dependencies for a task', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [task1.id, task2.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([task1.id, task2.id]);
    });

    test('removes all dependencies by passing empty array', async () => {
      // First set some dependencies
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task2.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      // Then remove them
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([]);
    });

    test('removes all dependencies when dependencyIds parameter is omitted', async () => {
      // First set some dependencies
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task2.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      // Then remove them by omitting dependencyIds parameter
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            // dependencyIds parameter is omitted - should default to empty array
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([]);
      expect(responseData.message).toContain(
        'Dependencies updated successfully'
      );
    });

    test('replaces existing dependencies', async () => {
      // First set initial dependencies
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task3.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      // Then replace with different dependencies
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [task2.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([task2.id]);
    });
  });

  describe('Validation errors', () => {
    test('returns error for invalid list ID', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: '00000000-0000-0000-0000-000000000000',
            taskId: task1.id,
            dependencyIds: [],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Task list with ID');
      expect(result.content[0]?.text).toContain('not found');
    });

    test('returns error for invalid task ID', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: '00000000-0000-0000-0000-000000000000',
            dependencyIds: [],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Task with ID');
      expect(result.content[0]?.text).toContain('not found');
    });

    test('returns error for non-existent dependency IDs', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: ['00000000-0000-0000-0000-000000000000'],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
      expect(result.content[0]?.text).toContain('Invalid dependencies');
    });

    test('prevents self-dependency', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: [task1.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
      expect(result.content[0]?.text).toContain('cannot depend on itself');
    });

    test('prevents circular dependencies', async () => {
      // Set task2 to depend on task1
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task2.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      // Try to set task1 to depend on task2 (creates circular dependency)
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: [task2.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
      expect(result.content[0]?.text).toContain(
        'Circular dependencies detected'
      );
    });

    test('enforces maximum dependency limit', async () => {
      // Create more tasks to exceed the limit
      const extraTasks = [];
      for (let i = 0; i < 52; i++) {
        const extraList = await manager.createTaskList({
          title: `Extra List ${i}`,
          tasks: [{ title: `Extra Task ${i}` }],
        });
        extraTasks.push(extraList.items[0]!.id);
      }

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: extraTasks.slice(0, 51), // 51 dependencies (exceeds limit of 50)
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });
  });

  describe('Optional dependencyIds parameter handling', () => {
    test('handles undefined dependencyIds parameter correctly', async () => {
      // First set some dependencies
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task2.id,
              dependencyIds: [task1.id, task3.id],
            },
          },
        },
        manager
      );

      // Verify dependencies were set
      const listWithDeps = await manager.getTaskList({ listId: testList.id });
      const taskWithDeps = listWithDeps?.items.find(t => t.id === task2.id);
      expect(taskWithDeps?.dependencies).toEqual([task1.id, task3.id]);

      // Now clear dependencies by omitting the parameter
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            // dependencyIds parameter is undefined/omitted
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([]);
      expect(responseData.message).toContain(
        'Dependencies updated successfully'
      );
    });

    test('handles empty array dependencyIds parameter correctly', async () => {
      // First set some dependencies
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task3.id,
              dependencyIds: [task1.id, task2.id],
            },
          },
        },
        manager
      );

      // Verify dependencies were set
      const listWithDeps = await manager.getTaskList({ listId: testList.id });
      const taskWithDeps = listWithDeps?.items.find(t => t.id === task3.id);
      expect(taskWithDeps?.dependencies).toEqual([task1.id, task2.id]);

      // Now clear dependencies with explicit empty array
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [], // Explicit empty array
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([]);
      expect(responseData.message).toContain(
        'Dependencies updated successfully'
      );
    });

    test('validates that both undefined and empty array clear all dependencies equally', async () => {
      // Set up two tasks with the same dependencies
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task2.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task3.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      // Clear task2 dependencies with undefined parameter
      const undefinedRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            // dependencyIds is undefined
          },
        },
      };

      // Clear task3 dependencies with empty array
      const emptyArrayRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [],
          },
        },
      };

      const undefinedResult = await handleSetTaskDependencies(
        undefinedRequest,
        manager
      );
      const emptyArrayResult = await handleSetTaskDependencies(
        emptyArrayRequest,
        manager
      );

      // Both should succeed
      expect(undefinedResult.isError).toBeFalsy();
      expect(emptyArrayResult.isError).toBeFalsy();

      // Both should result in empty dependencies
      const undefinedResponseData = JSON.parse(
        undefinedResult.content[0]?.text as string
      );
      const emptyArrayResponseData = JSON.parse(
        emptyArrayResult.content[0]?.text as string
      );

      expect(undefinedResponseData.dependencies).toEqual([]);
      expect(emptyArrayResponseData.dependencies).toEqual([]);
    });

    test('validates optional parameter with schema validation', async () => {
      // Test that the schema correctly validates when dependencyIds is omitted
      const requestWithoutDependencyIds: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            // No dependencyIds parameter
          },
        },
      };

      const result = await handleSetTaskDependencies(
        requestWithoutDependencyIds,
        manager
      );

      // Should not fail validation
      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([]);
    });

    test('validates that optional parameter still enforces array constraints when provided', async () => {
      // Test that when dependencyIds is provided, it still validates as an array
      const requestWithInvalidDependencyIds: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: 'not-an-array' as any, // Invalid type
          },
        },
      };

      const result = await handleSetTaskDependencies(
        requestWithInvalidDependencyIds,
        manager
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });
  });

  describe('Input validation', () => {
    test('validates UUID format for listId', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: 'invalid-uuid',
            taskId: task1.id,
            dependencyIds: [],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('validates UUID format for taskId', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: 'invalid-uuid',
            dependencyIds: [],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('validates UUID format for dependency IDs', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: ['invalid-uuid'],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('requires all required parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            // Missing taskId (dependencyIds is now optional)
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('accepts only required parameters when dependencyIds is omitted', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            // dependencyIds is omitted - should work fine
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    test('handles completed task dependencies with warnings', async () => {
      // Complete task1
      await manager.updateTaskList({
        listId: testList.id,
        action: 'update_status',
        itemId: task1.id,
        itemData: { status: TaskStatus.COMPLETED },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.warnings).toBeDefined();
      expect(responseData.warnings.length).toBeGreaterThan(0);
      expect(responseData.message).toContain('warnings');
    });

    test('handles complex dependency chains', async () => {
      // Create a chain: task3 -> task2 -> task1
      await handleSetTaskDependencies(
        {
          method: 'tools/call',
          params: {
            name: 'set_task_dependencies',
            arguments: {
              listId: testList.id,
              taskId: task2.id,
              dependencyIds: [task1.id],
            },
          },
        },
        manager
      );

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [task2.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.dependencies).toEqual([task2.id]);
    });

    test('handles storage errors gracefully', async () => {
      // Mock storage to throw an error
      const _originalGetTaskList = manager.getTaskList;
      vi.spyOn(manager, 'getTaskList').mockRejectedValueOnce(
        new Error('Storage error')
      );

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: [],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Error: Storage error');

      // Restore original method
      vi.restoreAllMocks();
    });
  });

  describe('Response format', () => {
    test('returns correct response structure', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const responseData = JSON.parse(result.content[0]?.text as string);

      // Check required TaskResponse fields
      expect(responseData.id).toBe(task2.id);
      expect(responseData.title).toBe(task2.title);
      expect(responseData.status).toBe(task2.status);
      expect(responseData.priority).toBe(task2.priority);
      expect(responseData.tags).toEqual(task2.tags);
      expect(responseData.createdAt).toBeDefined();
      expect(responseData.updatedAt).toBeDefined();

      // Check dependency-specific fields
      expect(responseData.dependencies).toEqual([task1.id]);
      expect(responseData.message).toBeDefined();
      expect(responseData.warnings).toBeDefined();
    });

    test('includes warnings in response when present', async () => {
      // Complete task1 to generate warnings
      await manager.updateTaskList({
        listId: testList.id,
        action: 'update_status',
        itemId: task1.id,
        itemData: { status: TaskStatus.COMPLETED },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      };

      const result = await handleSetTaskDependencies(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.warnings).toHaveLength(1);
      expect(responseData.message).toContain('1 warnings');
    });
  });
});
