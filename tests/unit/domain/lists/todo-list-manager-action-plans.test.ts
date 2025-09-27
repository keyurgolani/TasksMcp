/**
 * Integration tests for TodoListManager action plan functionality
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TodoListManager } from '../../../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../../../src/infrastructure/storage/memory-storage.js';
import { TestCleanup } from '../../../setup.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/todo.js';

describe('TodoListManager Action Plan Integration', () => {
  let manager: TodoListManager;
  let storage: MemoryStorageBackend;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    manager = new TodoListManager(storage);
    await manager.initialize();
    
    // Register for automatic cleanup
    TestCleanup.registerStorage(storage);
    TestCleanup.registerManager(manager);
  });

  describe('createTodoList with action plans', () => {
    test('creates todo list with tasks that have action plans', async () => {
      const input = {
        title: 'Test Project',
        description: 'A test project with action plans',
        tasks: [
          {
            title: 'Task with action plan',
            description: 'A task that has a detailed action plan',
            priority: Priority.HIGH,
            actionPlan: '- Step 1: Research\n- Step 2: Design\n- Step 3: Implement\n- Step 4: Test',
          },
          {
            title: 'Task without action plan',
            description: 'A simple task',
            priority: Priority.MEDIUM,
          },
        ],
        context: 'test-project',
      };

      const todoList = await manager.createTodoList(input);

      expect(todoList.items).toHaveLength(2);
      
      const taskWithPlan = todoList.items[0];
      const taskWithoutPlan = todoList.items[1];

      expect(taskWithPlan?.actionPlan).toBeDefined();
      expect(taskWithPlan?.actionPlan?.steps).toHaveLength(4);
      expect(taskWithPlan?.actionPlan?.steps[0]?.content).toBe('Step 1: Research');
      expect(taskWithPlan?.actionPlan?.steps[3]?.content).toBe('Step 4: Test');

      expect(taskWithoutPlan?.actionPlan).toBeUndefined();
    });

    test('handles invalid action plan gracefully', async () => {
      const input = {
        title: 'Test Project',
        tasks: [
          {
            title: 'Task with invalid action plan',
            actionPlan: '', // Empty action plan should be handled gracefully
          },
        ],
        context: 'test-project',
      };

      const todoList = await manager.createTodoList(input);

      expect(todoList.items).toHaveLength(1);
      expect(todoList.items[0]?.actionPlan).toBeUndefined(); // Should not have action plan due to validation failure
    });
  });

  describe('updateTodoList with action plan operations', () => {
    let listId: string;
    let itemId: string;

    beforeEach(async () => {
      const todoList = await manager.createTodoList({
        title: 'Test List',
        tasks: [
          {
            title: 'Test Task',
            actionPlan: '- Step 1: Start\n- Step 2: Continue\n- Step 3: Finish',
          },
        ],
        context: 'test',
      });
      listId = todoList.id;
      itemId = todoList.items[0]!.id;
    });

    test('updates action plan content', async () => {
      const updatedList = await manager.updateTodoList({
        listId,
        action: 'update_action_plan',
        itemId,
        itemData: {
          actionPlan: '- New Step 1\n- New Step 2\n- New Step 3\n- New Step 4',
        },
      });

      const updatedItem = updatedList.items.find(item => item.id === itemId);
      expect(updatedItem?.actionPlan?.steps).toHaveLength(4);
      expect(updatedItem?.actionPlan?.steps[0]?.content).toBe('New Step 1');
      expect(updatedItem?.actionPlan?.version).toBe(2); // Should increment version
    });

    test('updates step progress', async () => {
      // First get the step ID
      const list = await manager.getTodoList({ listId });
      const item = list?.items.find(item => item.id === itemId);
      const stepId = item?.actionPlan?.steps[0]?.id;

      expect(stepId).toBeDefined();

      const updatedList = await manager.updateTodoList({
        listId,
        action: 'update_step_progress',
        itemId,
        stepId: stepId!,
        stepStatus: 'completed',
        stepNotes: 'Completed this step successfully',
      });

      const updatedItem = updatedList.items.find(item => item.id === itemId);
      const updatedStep = updatedItem?.actionPlan?.steps.find(step => step.id === stepId);
      
      expect(updatedStep?.status).toBe('completed');
      expect(updatedStep?.notes).toBe('Completed this step successfully');
      expect(updatedStep?.completedAt).toBeInstanceOf(Date);
    });

    test('auto-updates task status based on action plan progress', async () => {
      // Get all step IDs
      const list = await manager.getTodoList({ listId });
      const item = list?.items.find(item => item.id === itemId);
      const stepIds = item?.actionPlan?.steps.map(step => step.id) || [];

      expect(stepIds).toHaveLength(3);

      // Complete first step - should change task to in_progress
      let updatedList = await manager.updateTodoList({
        listId,
        action: 'update_step_progress',
        itemId,
        stepId: stepIds[0]!,
        stepStatus: 'completed',
      });

      let updatedItem = updatedList.items.find(item => item.id === itemId);
      expect(updatedItem?.status).toBe(TaskStatus.IN_PROGRESS);

      // Complete all remaining steps - should change task to completed
      for (let i = 1; i < stepIds.length; i++) {
        updatedList = await manager.updateTodoList({
          listId,
          action: 'update_step_progress',
          itemId,
          stepId: stepIds[i]!,
          stepStatus: 'completed',
        });
      }

      updatedItem = updatedList.items.find(item => item.id === itemId);
      expect(updatedItem?.status).toBe(TaskStatus.COMPLETED);
      expect(updatedItem?.completedAt).toBeInstanceOf(Date);
    });

    test('adds new item with action plan', async () => {
      const updatedList = await manager.updateTodoList({
        listId,
        action: 'add_item',
        itemData: {
          title: 'New Task with Plan',
          description: 'A new task',
          priority: Priority.HIGH,
          actionPlan: '- Research phase\n- Development phase\n- Testing phase',
        },
      });

      expect(updatedList.items).toHaveLength(2);
      
      const newItem = updatedList.items.find(item => item.title === 'New Task with Plan');
      expect(newItem?.actionPlan).toBeDefined();
      expect(newItem?.actionPlan?.steps).toHaveLength(3);
      expect(newItem?.actionPlan?.steps[0]?.content).toBe('Research phase');
    });

    test('updates existing item with new action plan', async () => {
      const updatedList = await manager.updateTodoList({
        listId,
        action: 'update_item',
        itemId,
        itemData: {
          title: 'Updated Task Title',
          actionPlan: '- Updated Step 1\n- Updated Step 2',
        },
      });

      const updatedItem = updatedList.items.find(item => item.id === itemId);
      expect(updatedItem?.title).toBe('Updated Task Title');
      expect(updatedItem?.actionPlan?.steps).toHaveLength(2);
      expect(updatedItem?.actionPlan?.steps[0]?.content).toBe('Updated Step 1');
      expect(updatedItem?.actionPlan?.version).toBe(2);
    });
  });

  describe('action plan progress tracking', () => {
    let listId: string;
    let itemId: string;

    beforeEach(async () => {
      const todoList = await manager.createTodoList({
        title: 'Progress Test List',
        tasks: [
          {
            title: 'Task with Progress',
            actionPlan: '- Step 1\n- Step 2\n- Step 3\n- Step 4\n- Step 5',
          },
        ],
        context: 'progress-test',
      });
      listId = todoList.id;
      itemId = todoList.items[0]!.id;
    });

    test('gets action plan progress', async () => {
      const progress = await manager.getActionPlanProgress(listId, itemId);

      expect(progress).toBeDefined();
      expect(progress?.progress).toBe(0); // No steps completed initially
      expect(progress?.statusText).toBe('Not started');
      expect(progress?.completedToday).toBe(0);
    });

    test('tracks progress as steps are completed', async () => {
      // Get step IDs
      const list = await manager.getTodoList({ listId });
      const item = list?.items.find(item => item.id === itemId);
      const stepIds = item?.actionPlan?.steps.map(step => step.id) || [];

      // Complete first two steps
      await manager.updateTodoList({
        listId,
        action: 'update_step_progress',
        itemId,
        stepId: stepIds[0]!,
        stepStatus: 'completed',
      });

      await manager.updateTodoList({
        listId,
        action: 'update_step_progress',
        itemId,
        stepId: stepIds[1]!,
        stepStatus: 'completed',
      });

      const progress = await manager.getActionPlanProgress(listId, itemId);

      expect(progress?.progress).toBe(40); // 2/5 = 40%
      expect(progress?.statusText).toContain('2/5 steps completed');
      expect(progress?.completedToday).toBe(2);
    });

    test('gets tasks with action plans', async () => {
      // Add another task without action plan
      await manager.updateTodoList({
        listId,
        action: 'add_item',
        itemData: {
          title: 'Task without plan',
        },
      });

      const tasksWithPlans = await manager.getTasksWithActionPlans(listId);

      expect(tasksWithPlans).toHaveLength(1); // Only one task has action plan
      expect(tasksWithPlans[0]?.item.id).toBe(itemId);
      expect(tasksWithPlans[0]?.progressSummary.progress).toBe(0);
    });
  });

  describe('error handling', () => {
    test('handles missing item for action plan update', async () => {
      const todoList = await manager.createTodoList({
        title: 'Test List',
        context: 'test',
      });

      await expect(
        manager.updateTodoList({
          listId: todoList.id,
          action: 'update_action_plan',
          itemId: 'non-existent-id',
          itemData: {
            actionPlan: '- Some plan',
          },
        })
      ).rejects.toThrow('Item not found: non-existent-id');
    });

    test('handles missing action plan for step progress update', async () => {
      const todoList = await manager.createTodoList({
        title: 'Test List',
        tasks: [
          {
            title: 'Task without action plan',
          },
        ],
        context: 'test',
      });

      const itemId = todoList.items[0]!.id;

      await expect(
        manager.updateTodoList({
          listId: todoList.id,
          action: 'update_step_progress',
          itemId,
          stepId: 'some-step-id',
          stepStatus: 'completed',
        })
      ).rejects.toThrow(`Item does not have an action plan: ${itemId}`);
    });

    test('handles invalid step ID for progress update', async () => {
      const todoList = await manager.createTodoList({
        title: 'Test List',
        tasks: [
          {
            title: 'Task with action plan',
            actionPlan: '- Step 1\n- Step 2',
          },
        ],
        context: 'test',
      });

      const itemId = todoList.items[0]!.id;

      await expect(
        manager.updateTodoList({
          listId: todoList.id,
          action: 'update_step_progress',
          itemId,
          stepId: 'invalid-step-id',
          stepStatus: 'completed',
        })
      ).rejects.toThrow('Step not found: invalid-step-id');
    });
  });
});