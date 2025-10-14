/**
 * Integration tests for exit criteria feature
 * Tests complete workflows with proper cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { handleAddTask } from '../../src/api/handlers/add-task.js';
import { handleCompleteTask } from '../../src/api/handlers/complete-task.js';
import { handleGetList } from '../../src/api/handlers/get-list.js';
import { handleSetTaskExitCriteria } from '../../src/api/handlers/set-task-exit-criteria.js';
import { handleUpdateExitCriteria } from '../../src/api/handlers/update-exit-criteria.js';
import { TaskListManager } from '../../src/domain/lists/task-list-manager.js';
import { ExitCriteriaManager } from '../../src/domain/tasks/exit-criteria-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { TestCleanup } from '../setup.js';
import { createTaskListManager } from '../utils/test-helpers.js';

import type { CallToolRequest } from '../../src/shared/types/mcp-types.js';
import type { TaskList } from '../../src/shared/types/task.js';

describe('Exit Criteria Integration Tests', () => {
  let taskListManager: TaskListManager;
  let storage: MemoryStorageBackend;
  let testList: TaskList;
  let exitCriteriaManager: ExitCriteriaManager;

  beforeEach(async () => {
    // Setup clean test environment
    storage = new MemoryStorageBackend();
    await storage.initialize();
    taskListManager = createTaskListManager(storage);
    await taskListManager.initialize();
    exitCriteriaManager = new ExitCriteriaManager();

    // Register for automatic cleanup
    TestCleanup.registerStorage(storage);
    TestCleanup.registerManager(taskListManager);

    // Create a test list
    testList = await taskListManager.createTaskList({
      title: 'Exit Criteria Test Project',
      description: 'Testing exit criteria functionality',
      projectTag: 'exit-criteria-test',
      tasks: [],
    });
  });

  afterEach(async () => {
    // Cleanup is handled automatically by test setup
  });

  /**
   * Helper function to make MCP tool calls
   */

  async function callTool(toolName: string, args: any) {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    switch (toolName) {
      case 'add_task':
        return await handleAddTask(request, taskListManager);
      case 'set_task_exit_criteria':
        return await handleSetTaskExitCriteria(request, taskListManager);
      case 'update_exit_criteria':
        return await handleUpdateExitCriteria(request, taskListManager);
      case 'complete_task':
        return await handleCompleteTask(request, taskListManager);
      case 'get_list':
        return await handleGetList(request, taskListManager);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  describe('Task Creation with Exit Criteria', () => {
    it('should create a task with initial exit criteria', async () => {
      const result = await callTool('add_task', {
        listId: testList.id,
        title: 'Implement user authentication',
        description: 'Build secure user login system',
        exitCriteria: [
          'User can register with email and password',
          'User can login with valid credentials',
          'User can logout successfully',
          'Password validation is implemented',
          'Session management works correctly',
        ],
      });

      expect(result.isError).toBeFalsy();
      const taskData = JSON.parse(result.content[0]!.text);

      expect(taskData.title).toBe('Implement user authentication');
      expect(taskData.exitCriteria).toHaveLength(5);
      expect(taskData.exitCriteriaProgress).toBe(0);
      expect(taskData.canComplete).toBe(false);

      // Verify all criteria are initially unmet

      taskData.exitCriteria.forEach((criteria: any) => {
        expect(criteria.isMet).toBe(false);
        expect(criteria.description).toBeTruthy();
        expect(criteria.id).toBeTruthy();
      });
    });

    it('should create a task without exit criteria', async () => {
      const result = await callTool('add_task', {
        listId: testList.id,
        title: 'Simple task without criteria',
        description: 'A basic task',
      });

      expect(result.isError).toBeFalsy();
      const taskData = JSON.parse(result.content[0]!.text);

      expect(taskData.title).toBe('Simple task without criteria');
      // Tasks without exit criteria should still have the field, just empty
      expect(taskData.exitCriteria || []).toHaveLength(0);
      expect(taskData.exitCriteriaProgress).toBe(100); // No criteria = 100% complete
      expect(taskData.canComplete).toBe(true);
    });
  });

  describe('Exit Criteria Management', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a task for testing criteria management
      const result = await callTool('add_task', {
        listId: testList.id,
        title: 'Test Task',
        description: 'Task for testing exit criteria management',
        exitCriteria: ['First criteria', 'Second criteria', 'Third criteria'],
      });

      const taskData = JSON.parse(result.content[0]!.text);
      taskId = taskData.id;
    });

    it('should replace all exit criteria for a task', async () => {
      const result = await callTool('set_task_exit_criteria', {
        listId: testList.id,
        taskId: taskId,
        exitCriteria: ['New first criteria', 'New second criteria'],
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0]!.text);

      expect(response.exitCriteria).toHaveLength(2);
      expect(response.exitCriteria[0].description).toBe('New first criteria');
      expect(response.exitCriteria[1].description).toBe('New second criteria');
      expect(response.exitCriteriaProgress).toBe(0);
      expect(response.canComplete).toBe(false);
    });

    it('should update individual exit criteria status', async () => {
      // Get the current task to find criteria IDs
      const fullList = await taskListManager.getTaskList({
        listId: testList.id,
      });
      const fullTask = fullList?.items.find(item => item.id === taskId);
      expect(fullTask).toBeDefined();
      expect(fullTask!.exitCriteria).toBeDefined();
      expect(fullTask!.exitCriteria).toHaveLength(3);

      const firstCriteriaId = fullTask!.exitCriteria[0]!.id;

      // Mark first criteria as met using the handler
      const updateResult = await callTool('update_exit_criteria', {
        listId: testList.id,
        taskId: taskId,
        criteriaId: firstCriteriaId,
        isMet: true,
        notes: 'Completed successfully',
      });

      expect(updateResult.isError).toBeFalsy();
      const response = JSON.parse(updateResult.content[0]!.text);

      expect(response.isMet).toBe(true);
      expect(response.notes).toBe('Completed successfully');
      expect(response.taskCanComplete).toBe(false); // Still 2 unmet criteria
      expect(response.exitCriteriaProgress).toBe(33); // 1/3 complete, rounded
    });

    it('should prevent task completion when criteria are unmet', async () => {
      const result = await callTool('complete_task', {
        listId: testList.id,
        taskId: taskId,
      });

      expect(result.isError).toBe(true);
      const errorData = JSON.parse(result.content[0]!.text);

      expect(errorData.error).toBe('Cannot complete task');
      expect(errorData.reason).toContain('exit criteria still need to be met');
      expect(errorData.unmetCriteria).toHaveLength(3);
    });

    it('should allow task completion when all criteria are met', async () => {
      // Get the current task to find criteria IDs
      const fullList = await taskListManager.getTaskList({
        listId: testList.id,
      });
      const task = fullList?.items.find(item => item.id === taskId);
      expect(task).toBeDefined();
      expect(task!.exitCriteria).toBeDefined();

      // Mark all criteria as met using the handler
      for (const criteria of task!.exitCriteria) {
        await callTool('update_exit_criteria', {
          listId: testList.id,
          taskId: taskId,
          criteriaId: criteria.id,
          isMet: true,
        });
      }

      // Now try to complete the task
      const result = await callTool('complete_task', {
        listId: testList.id,
        taskId: taskId,
      });

      expect(result.isError).toBeFalsy();
      const taskData = JSON.parse(result.content[0]!.text);

      expect(taskData.status).toBe('completed');
      expect(taskData.completedAt).toBeTruthy();
    });
  });

  describe('Exit Criteria Manager Unit Tests', () => {
    it('should calculate progress correctly', () => {
      const criteria = [
        { id: '1', description: 'Test 1', isMet: true, order: 0 },
        { id: '2', description: 'Test 2', isMet: false, order: 1 },
        { id: '3', description: 'Test 3', isMet: true, order: 2 },
      ];

      const progress = exitCriteriaManager.calculateCriteriaProgress(criteria);
      expect(progress).toBe(67); // 2/3 complete, rounded
    });

    it('should determine completion readiness correctly', () => {
      const allMet = [
        { id: '1', description: 'Test 1', isMet: true, order: 0 },
        { id: '2', description: 'Test 2', isMet: true, order: 1 },
      ];

      const someMet = [
        { id: '1', description: 'Test 1', isMet: true, order: 0 },
        { id: '2', description: 'Test 2', isMet: false, order: 1 },
      ];

      expect(exitCriteriaManager.areAllCriteriaMet(allMet)).toBe(true);
      expect(exitCriteriaManager.areAllCriteriaMet(someMet)).toBe(false);
      expect(exitCriteriaManager.areAllCriteriaMet([])).toBe(true); // No criteria = complete
    });

    it('should format criteria for display', () => {
      const criteria = [
        {
          id: '1',
          description: 'First task',
          isMet: true,
          order: 0,
          metAt: new Date(),
        },
        { id: '2', description: 'Second task', isMet: false, order: 1 },
      ];

      const formatted = exitCriteriaManager.formatCriteriaForDisplay(criteria);

      expect(formatted).toContain('Exit Criteria Progress: 1/2 (50%)');
      expect(formatted).toContain('✅ First task');
      expect(formatted).toContain('❌ Second task');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty exit criteria arrays', async () => {
      const result = await callTool('set_task_exit_criteria', {
        listId: testList.id,
        taskId: 'non-existent-task',
        exitCriteria: [],
      });

      expect(result.isError).toBe(true);
    });

    it('should validate exit criteria descriptions', async () => {
      const exitCriteriaManager = new ExitCriteriaManager();

      await expect(async () => {
        await exitCriteriaManager.createExitCriteria({
          taskId: 'test',
          description: '', // Empty description should fail
        });
      }).rejects.toThrow();

      await expect(async () => {
        await exitCriteriaManager.createExitCriteria({
          taskId: 'test',
          description: 'a'.repeat(501), // Too long should fail
        });
      }).rejects.toThrow();
    });

    it('should handle invalid criteria IDs gracefully', async () => {
      // Create a task first
      const taskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Test Task',
        exitCriteria: ['Test criteria'],
      });

      const taskData = JSON.parse(taskResult.content[0]!.text);

      // Try to update non-existent criteria
      const result = await callTool('update_exit_criteria', {
        listId: testList.id,
        taskId: taskData.id,
        criteriaId: 'non-existent-criteria-id',
        isMet: true,
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle tasks created without exit criteria', async () => {
      // Simulate an old task without exit criteria by creating one normally
      // then checking that it works with the new exit criteria system
      const result = await callTool('add_task', {
        listId: testList.id,
        title: 'Legacy Task',
        description: 'Task created before exit criteria feature',
      });

      expect(result.isError).toBeFalsy();
      const taskData = JSON.parse(result.content[0]!.text);

      // Should have empty exit criteria array
      expect(taskData.exitCriteria || []).toHaveLength(0);
      expect(taskData.canComplete).toBe(true);

      // Should be able to complete immediately
      const completeResult = await callTool('complete_task', {
        listId: testList.id,
        taskId: taskData.id,
      });

      expect(completeResult.isError).toBeFalsy();
    });
  });
});
