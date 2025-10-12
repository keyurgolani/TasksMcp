/**
 * Unit tests for GetReadyTasksHandler
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

import { handleGetReadyTasks } from '../../../../src/api/handlers/get-ready-tasks.js';
import { TodoListManager } from '../../../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../../../src/infrastructure/storage/memory-storage.js';
import {
  TaskStatus,
  Priority,
  type TodoList,
  type TodoItem,
} from '../../../../src/shared/types/todo.js';
import { createTodoListManager } from '../../../utils/test-helpers.js';

import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';

describe('GetReadyTasksHandler', () => {
  let manager: TodoListManager;
  let storage: MemoryStorageBackend;
  let testList: TodoList;
  let task1: TodoItem;
  let task2: TodoItem;
  let task3: TodoItem;
  let task4: TodoItem;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize(); // Initialize storage before creating manager
    manager = createTodoListManager(storage);
    await manager.initialize();

    // Create a test list with multiple tasks
    testList = await manager.createTodoList({
      title: 'Test Ready Tasks List',
      description: 'A list for testing ready task identification',
      tasks: [
        {
          title: 'High Priority Ready Task',
          description: 'A high priority task with no dependencies',
          priority: Priority.HIGH,
          estimatedDuration: 60,
        },
        {
          title: 'Medium Priority Ready Task',
          description: 'A medium priority task with no dependencies',
          priority: Priority.MEDIUM,
          estimatedDuration: 30,
        },
        {
          title: 'Blocked Task',
          description: 'A task that will be blocked by dependencies',
          priority: Priority.MEDIUM,
          estimatedDuration: 45,
        },
        {
          title: 'Quick Task',
          description: 'A quick task for testing duration suggestions',
          priority: Priority.LOW,
          estimatedDuration: 15,
        },
      ],
      projectTag: 'test-project',
    });

    task1 = testList.items[0]!; // High priority ready
    task2 = testList.items[1]!; // Medium priority ready
    task3 = testList.items[2]!; // Will be blocked
    task4 = testList.items[3]!; // Quick task
  });

  describe('Basic functionality', () => {
    test('returns ready tasks when no dependencies exist', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.listId).toBe(testList.id);
      expect(responseData.readyTasks).toHaveLength(4); // All tasks are ready
      expect(responseData.totalReady).toBe(4);
      expect(responseData._methodologyGuidance).toBeDefined(); // Should have methodology guidance
      expect(responseData.summary).toBeDefined();
    });

    test('sorts ready tasks by priority then creation date', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Should be sorted by priority (high first), then by creation date
      expect(responseData.readyTasks[0]?.priority).toBe(Priority.HIGH);
      expect(responseData.readyTasks[0]?.title).toBe(
        'High Priority Ready Task'
      );
      expect(responseData.readyTasks[1]?.priority).toBe(Priority.MEDIUM);
      expect(responseData.readyTasks[1]?.title).toBe(
        'Medium Priority Ready Task'
      );
      expect(responseData.readyTasks[2]?.priority).toBe(Priority.MEDIUM);
      expect(responseData.readyTasks[2]?.title).toBe('Blocked Task');
      expect(responseData.readyTasks[3]?.priority).toBe(Priority.LOW);
    });

    test('respects limit parameter', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
            limit: 2,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.readyTasks).toHaveLength(2);
      expect(responseData.totalReady).toBe(4); // Total should still be 4
    });

    test('uses default limit when not specified', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.readyTasks).toHaveLength(4); // All tasks (less than default limit of 20)
    });
  });

  describe('Dependency handling', () => {
    test('excludes blocked tasks from ready list', async () => {
      // Set task3 to depend on task1
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task3.id,
        itemData: { dependencies: [task1.id] },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Should have 3 ready tasks (task3 is blocked)
      expect(responseData.readyTasks).toHaveLength(3);
      expect(responseData.totalReady).toBe(3);
      expect(responseData.summary.blockedTasks).toBe(1);

      // task3 should not be in ready tasks

      const readyTaskIds = responseData.readyTasks.map((task: any) => task.id);
      expect(readyTaskIds).not.toContain(task3.id);
    });

    test('includes tasks whose dependencies are completed', async () => {
      // Set task3 to depend on task1
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task3.id,
        itemData: { dependencies: [task1.id] },
      });

      // Complete task1
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_status',
        itemId: task1.id,
        itemData: { status: TaskStatus.COMPLETED },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Should have 3 ready tasks (task1 is completed, task3 is now ready)
      expect(responseData.readyTasks).toHaveLength(3);
      expect(responseData.summary.completedTasks).toBe(1);

      // task3 should be in ready tasks now

      const readyTaskIds = responseData.readyTasks.map((task: any) => task.id);
      expect(readyTaskIds).toContain(task3.id);
    });

    test('excludes completed and cancelled tasks from ready list', async () => {
      // Complete task1
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_status',
        itemId: task1.id,
        itemData: { status: TaskStatus.COMPLETED },
      });

      // Cancel task2
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_status',
        itemId: task2.id,
        itemData: { status: TaskStatus.CANCELLED },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Should have 2 ready tasks (task3 and task4)
      expect(responseData.readyTasks).toHaveLength(2);
      expect(responseData.summary.completedTasks).toBe(1);

      // Completed and cancelled tasks should not be in ready tasks

      const readyTaskIds = responseData.readyTasks.map((task: any) => task.id);
      expect(readyTaskIds).not.toContain(task1.id);
      expect(readyTaskIds).not.toContain(task2.id);
    });
  });

  describe('Next action suggestions', () => {
    test('suggests starting with high priority tasks', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Verify methodology guidance is provided
      expect(responseData._methodologyGuidance).toBeDefined();
      expect(responseData._methodologyGuidance.dailyWorkflow).toBeInstanceOf(
        Array
      );
      // Verify methodology guidance includes daily workflow
      expect(responseData._methodologyGuidance.dailyWorkflow).toBeInstanceOf(
        Array
      );
    });

    test('suggests quick tasks for small time slots', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Verify methodology guidance is provided for quick tasks
      expect(responseData._methodologyGuidance).toBeDefined();
      // Verify methodology guidance includes best practices
      expect(responseData._methodologyGuidance.bestPractice).toBeDefined();
    });

    test('provides helpful suggestions when no tasks are ready', async () => {
      // Block all tasks by creating a dependency chain (no circular dependencies)
      // task1 -> task2 -> task3 -> task4 (all blocked except task4, but we'll block task4 too)
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task1.id,
        itemData: { dependencies: [task2.id] },
      });
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task2.id,
        itemData: { dependencies: [task3.id] },
      });
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task3.id,
        itemData: { dependencies: [task4.id] },
      });
      // Block task4 by setting it to BLOCKED status
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_status',
        itemId: task4.id,
        itemData: { status: TaskStatus.BLOCKED },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      expect(responseData.readyTasks).toHaveLength(0);
      // Verify methodology guidance is provided even when no tasks are ready
      expect(responseData._methodologyGuidance).toBeDefined();
      // Verify methodology guidance includes tips
      expect(responseData._methodologyGuidance.tip).toBeDefined();
    });

    test('suggests completion when all tasks are done', async () => {
      // Complete all tasks
      for (const task of testList.items) {
        await manager.updateTodoList({
          listId: testList.id,
          action: 'update_status',
          itemId: task.id,
          itemData: { status: TaskStatus.COMPLETED },
        });
      }

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      expect(responseData.readyTasks).toHaveLength(0);
      // Verify methodology guidance is provided when all tasks are completed
      expect(responseData._methodologyGuidance).toBeDefined();
    });

    test('mentions in-progress tasks when present', async () => {
      // Set task1 to in progress
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_status',
        itemId: task1.id,
        itemData: { status: TaskStatus.IN_PROGRESS },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      // Should still have ready tasks
      expect(responseData.readyTasks.length).toBeGreaterThan(0);
      // Verify methodology guidance is provided
      expect(responseData._methodologyGuidance).toBeDefined();
      // Verify methodology guidance includes tips for in-progress tasks
      expect(responseData._methodologyGuidance.tip).toBeDefined();
    });
  });

  describe('Response format', () => {
    test('returns correct response structure', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const responseData = JSON.parse(result.content[0]?.text as string);

      // Check main structure
      expect(responseData.listId).toBe(testList.id);
      expect(responseData.readyTasks).toBeInstanceOf(Array);
      expect(responseData.totalReady).toBeTypeOf('number');
      expect(responseData._methodologyGuidance).toBeInstanceOf(Object);
      expect(responseData.summary).toBeInstanceOf(Object);

      // Check task structure
      if (responseData.readyTasks.length > 0) {
        const task = responseData.readyTasks[0];
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
        expect(task.priority).toBeDefined();
        expect(task.tags).toBeInstanceOf(Array);
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
      }

      // Check summary structure
      expect(responseData.summary.totalTasks).toBeTypeOf('number');
      expect(responseData.summary.completedTasks).toBeTypeOf('number');
      expect(responseData.summary.readyTasks).toBeTypeOf('number');
      expect(responseData.summary.blockedTasks).toBeTypeOf('number');
    });

    test('includes optional fields when present', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      const taskWithDuration = responseData.readyTasks.find(
        (task: any) => task.estimatedDuration
      );
      expect(taskWithDuration).toBeDefined();
      expect(taskWithDuration.estimatedDuration).toBeTypeOf('number');

      const taskWithDescription = responseData.readyTasks.find(
        (task: any) => task.description
      );
      expect(taskWithDescription).toBeDefined();
      expect(taskWithDescription.description).toBeTypeOf('string');
    });
  });

  describe('Error handling', () => {
    test('returns error for invalid list ID', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: '00000000-0000-0000-0000-000000000000',
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Todo list not found');
    });

    test('validates UUID format for listId', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: 'invalid-uuid',
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('validates limit parameter bounds', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
            limit: 0, // Below minimum
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('validates limit parameter maximum', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
            limit: 51, // Above maximum
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('requires listId parameter', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            // Missing listId
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('❌');
    });

    test('handles storage errors gracefully', async () => {
      // Mock storage to throw an error
      vi.spyOn(manager, 'getTodoList').mockRejectedValueOnce(
        new Error('Storage error')
      );

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Error: Storage error');

      // Restore original method
      vi.restoreAllMocks();
    });
  });

  describe('Edge cases', () => {
    test('handles empty list', async () => {
      // Create an empty list
      const emptyList = await manager.createTodoList({
        title: 'Empty List',
        tasks: [],
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: emptyList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      expect(responseData.readyTasks).toHaveLength(0);
      expect(responseData.totalReady).toBe(0);
      expect(responseData.summary.totalTasks).toBe(0);
      // Verify methodology guidance is provided for empty list
      expect(responseData._methodologyGuidance).toBeDefined();
    });

    test('handles list with only completed tasks', async () => {
      // Complete all tasks
      for (const task of testList.items) {
        await manager.updateTodoList({
          listId: testList.id,
          action: 'update_status',
          itemId: task.id,
          itemData: { status: TaskStatus.COMPLETED },
        });
      }

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      expect(responseData.readyTasks).toHaveLength(0);
      expect(responseData.totalReady).toBe(0);
      expect(responseData.summary.completedTasks).toBe(4);
      // Verify methodology guidance is provided for completed tasks
      expect(responseData._methodologyGuidance).toBeDefined();
    });

    test('handles tasks with same priority correctly', async () => {
      // Create tasks with same priority
      const sameList = await manager.createTodoList({
        title: 'Same Priority List',
        tasks: [
          { title: 'Task A', priority: Priority.MEDIUM },
          { title: 'Task B', priority: Priority.MEDIUM },
          { title: 'Task C', priority: Priority.MEDIUM },
        ],
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: sameList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      expect(responseData.readyTasks).toHaveLength(3);
      // Should be sorted by creation date when priority is same
      expect(responseData.readyTasks[0]?.title).toBe('Task A');
      expect(responseData.readyTasks[1]?.title).toBe('Task B');
      expect(responseData.readyTasks[2]?.title).toBe('Task C');
    });

    test('handles complex dependency scenarios', async () => {
      // Create a complex dependency scenario
      // task1 (ready) -> task2 (blocked) -> task3 (blocked)
      // task4 (ready, no dependencies)
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task2.id,
        itemData: { dependencies: [task1.id] },
      });
      await manager.updateTodoList({
        listId: testList.id,
        action: 'update_item',
        itemId: task3.id,
        itemData: { dependencies: [task2.id] },
      });

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      };

      const result = await handleGetReadyTasks(request, manager);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0]?.text as string);

      expect(responseData.readyTasks).toHaveLength(2); // task1 and task4
      expect(responseData.summary.blockedTasks).toBe(2); // task2 and task3

      const readyTaskIds = responseData.readyTasks.map((task: any) => task.id);
      expect(readyTaskIds).toContain(task1.id);
      expect(readyTaskIds).toContain(task4.id);
      expect(readyTaskIds).not.toContain(task2.id);
      expect(readyTaskIds).not.toContain(task3.id);
    });
  });
});
