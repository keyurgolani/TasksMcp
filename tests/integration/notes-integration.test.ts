/**
 * Integration tests for notes display in todo list retrieval operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { Priority, TaskStatus } from '../../src/shared/types/todo.js';
import { TestCleanup } from '../setup.js';
import { createTodoListManager } from '../utils/test-helpers.js';

import type { ImplementationNote as _ImplementationNote } from '../../src/shared/types/todo.js';

describe('Notes Integration Tests', () => {
  let todoListManager: TodoListManager;
  let storage: MemoryStorageBackend;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    todoListManager = createTodoListManager(storage);
    await todoListManager.initialize();

    // Register for automatic cleanup
    TestCleanup.registerStorage(storage);
    TestCleanup.registerManager(todoListManager);
  });

  afterEach(async () => {
    // Cleanup is handled automatically by test setup
  });

  describe('getTodoList with notes', () => {
    it('should handle empty notes gracefully', async () => {
      // Create a todo list
      const createResult = await todoListManager.createTodoList({
        title: 'Test List',
        description: 'A test list',
        tasks: [
          {
            title: 'Test Task',
            description: 'A test task',
            priority: Priority.MEDIUM,
          },
        ],
      });

      // Retrieve the list
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
      });

      expect(result).toBeDefined();
      expect(result?.implementationNotes).toBeDefined();
      expect(result?.implementationNotes).toEqual([]);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]?.implementationNotes).toEqual([]);
    });

    it('should include formatted list-level notes in response', async () => {
      // Create a todo list
      const createResult = await todoListManager.createTodoList({
        title: 'Test List with Notes',
        description: 'A test list',
        tasks: [
          {
            title: 'Test Task',
            description: 'A test task',
            priority: Priority.MEDIUM,
          },
        ],
      });

      // Add implementation notes to the list using TodoListManager
      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_list_note',
        noteContent:
          'This is a list-level implementation note with important details about the project setup',
        noteType: 'technical',
      });

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_list_note',
        noteContent: 'Decision to use TypeScript for this project',
        noteType: 'decision',
      });

      // Retrieve the list
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
      });

      expect(result).toBeDefined();
      expect(result?.implementationNotes).toBeDefined();
      expect(result?.implementationNotes).toHaveLength(2);

      // Check that notes are properly formatted
      const technicalNote = result?.implementationNotes?.find(
        note => note.type === 'technical'
      );
      expect(technicalNote).toBeDefined();
      expect(technicalNote).toMatchObject({
        type: 'technical',
        isTruncated: false,
      });
      expect(technicalNote?.content).toContain(
        'list-level implementation note'
      );
      expect(technicalNote?.createdAt).toBeInstanceOf(Date);

      const decisionNote = result?.implementationNotes?.find(
        note => note.type === 'decision'
      );
      expect(decisionNote).toBeDefined();
      expect(decisionNote).toMatchObject({
        type: 'decision',
        isTruncated: false,
      });
    });

    it('should include formatted task-level notes in response', async () => {
      // Create a todo list
      const createResult = await todoListManager.createTodoList({
        title: 'Test List',
        description: 'A test list',
        tasks: [
          {
            title: 'Test Task with Notes',
            description: 'A test task',
            priority: Priority.HIGH,
          },
        ],
      });

      // Add implementation notes to the task using TodoListManager
      const taskId = createResult.items[0]?.id;
      expect(taskId).toBeDefined();

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_task_note',
        itemId: taskId,
        noteContent:
          'This task requires careful consideration of the API design patterns',
        noteType: 'technical',
      });

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_task_note',
        itemId: taskId,
        noteContent:
          'Learning: Found that async/await pattern works better here',
        noteType: 'learning',
      });

      // Retrieve the list
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
      });

      expect(result).toBeDefined();
      expect(result?.items).toHaveLength(1);

      const taskWithNotes = result?.items[0];
      expect(taskWithNotes?.implementationNotes).toBeDefined();
      expect(taskWithNotes?.implementationNotes).toHaveLength(2);

      // Check that task notes are properly formatted
      const technicalTaskNote = taskWithNotes?.implementationNotes?.find(
        note => note.type === 'technical'
      );
      expect(technicalTaskNote).toBeDefined();
      expect(technicalTaskNote).toMatchObject({
        type: 'technical',
        isTruncated: false,
      });
      expect(technicalTaskNote?.content).toContain('API design patterns');

      const learningTaskNote = taskWithNotes?.implementationNotes?.find(
        note => note.type === 'learning'
      );
      expect(learningTaskNote).toBeDefined();
      expect(learningTaskNote).toMatchObject({
        type: 'learning',
        isTruncated: false,
      });
    });

    it('should truncate long notes for display', async () => {
      // Create a todo list
      const createResult = await todoListManager.createTodoList({
        title: 'Test List',
        description: 'A test list',
        tasks: [
          {
            title: 'Test Task',
            description: 'A test task',
            priority: Priority.LOW,
          },
        ],
      });

      // Add a very long note using TodoListManager
      const longContent =
        'This is a very long implementation note that should be truncated when displayed in the todo list response. '.repeat(
          10
        );

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_list_note',
        noteContent: longContent,
        noteType: 'general',
      });

      // Retrieve the list
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
      });

      expect(result).toBeDefined();
      expect(result?.implementationNotes).toHaveLength(1);

      const longNote = result?.implementationNotes?.[0];
      expect(longNote?.isTruncated).toBe(true);
      expect(longNote?.content.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(longNote?.content).toContain('...');
    });

    it('should handle lists and tasks with no notes gracefully', async () => {
      // Create a todo list without notes
      const createResult = await todoListManager.createTodoList({
        title: 'Test List Without Notes',
        description: 'A test list',
        tasks: [
          {
            title: 'Test Task Without Notes',
            description: 'A test task',
            priority: Priority.MEDIUM,
          },
        ],
      });

      // Retrieve the list
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
      });

      expect(result).toBeDefined();
      expect(result?.implementationNotes).toEqual([]);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]?.implementationNotes).toEqual([]);
    });

    it('should distinguish between task-level and list-level notes', async () => {
      // Create a todo list
      const createResult = await todoListManager.createTodoList({
        title: 'Test List',
        description: 'A test list',
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            priority: Priority.HIGH,
          },
          {
            title: 'Task 2',
            description: 'Second task',
            priority: Priority.LOW,
          },
        ],
      });

      // Add notes at both levels using TodoListManager
      const task1Id = createResult.items[0]?.id;
      const task2Id = createResult.items[1]?.id;
      expect(task1Id).toBeDefined();
      expect(task2Id).toBeDefined();

      // Add list-level note
      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_list_note',
        noteContent: 'This is a list-level note about the overall project',
        noteType: 'general',
      });

      // Add task-level notes
      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_task_note',
        itemId: task1Id,
        noteContent: 'This is a note specific to task 1',
        noteType: 'technical',
      });

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_task_note',
        itemId: task2Id,
        noteContent: 'This is a note specific to task 2',
        noteType: 'decision',
      });

      // Retrieve the list
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
      });

      expect(result).toBeDefined();

      // Check list-level notes
      expect(result?.implementationNotes).toHaveLength(1);
      expect(result?.implementationNotes?.[0]?.content).toContain(
        'list-level note'
      );

      // Check task-level notes
      expect(result?.items).toHaveLength(2);

      const task1 = result?.items[0];
      expect(task1?.implementationNotes).toHaveLength(1);
      expect(task1?.implementationNotes?.[0]?.content).toContain(
        'specific to task 1'
      );

      const task2 = result?.items[1];
      expect(task2?.implementationNotes).toHaveLength(1);
      expect(task2?.implementationNotes?.[0]?.content).toContain(
        'specific to task 2'
      );
    });

    it('should maintain note formatting with filtering and pagination', async () => {
      // Create a todo list with multiple tasks
      const createResult = await todoListManager.createTodoList({
        title: 'Test List',
        description: 'A test list',
        tasks: [
          {
            title: 'Completed Task',
            description: 'A completed task',
            priority: Priority.HIGH,
          },
          {
            title: 'Pending Task',
            description: 'A pending task',
            priority: Priority.MEDIUM,
          },
        ],
      });

      // Update first task to completed and add notes
      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'update_status',
        itemId: createResult.items[0]?.id,
        itemData: { status: TaskStatus.COMPLETED },
      });

      // Add notes to both tasks using TodoListManager
      const completedTaskId = createResult.items[0]?.id;
      const pendingTaskId = createResult.items[1]?.id;
      expect(completedTaskId).toBeDefined();
      expect(pendingTaskId).toBeDefined();

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_task_note',
        itemId: completedTaskId,
        noteContent: 'This task was completed successfully',
        noteType: 'general',
      });

      await todoListManager.updateTodoList({
        listId: createResult.id,
        action: 'add_task_note',
        itemId: pendingTaskId,
        noteContent: 'This task is still pending',
        noteType: 'technical',
      });

      // Retrieve with filtering (exclude completed)
      const result = await todoListManager.getTodoList({
        listId: createResult.id,
        includeCompleted: false,
      });

      expect(result).toBeDefined();
      expect(result?.items).toHaveLength(1);

      // The remaining task should still have its notes properly formatted
      const pendingTask = result?.items[0];
      expect(pendingTask?.status).toBe(TaskStatus.PENDING);
      expect(pendingTask?.implementationNotes).toHaveLength(1);
      expect(pendingTask?.implementationNotes?.[0]?.content).toContain(
        'still pending'
      );
    });
  });
});
