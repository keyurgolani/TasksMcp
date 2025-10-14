import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleAddTaskTags } from '../../../../src/api/handlers/add-task-tags.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { TaskList } from '../../../../src/shared/types/task-list.js';
import type { Task } from '../../../../src/shared/types/task.js';

describe('handleAddTaskTags', () => {
  let mockTaskListManager: TaskListManager;
  let mockTaskList: TaskList;
  let mockTask: Task;

  beforeEach(() => {
    mockTask = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test Task',
      description: 'A test task',
      status: 'pending',
      priority: 3,
      tags: ['existing-tag'],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      dependencies: [],
      estimatedDuration: 60,
      metadata: {},
      implementationNotes: [],
      exitCriteria: [],
    };

    mockTaskList = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test List',
      description: 'A test list',
      items: [mockTask],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      projectTag: 'test-project',
      totalItems: 1,
      completedItems: 0,
      progress: 0,
      metadata: {},
      implementationNotes: [],
    };

    mockTaskListManager = {
      getTaskList: vi.fn(),
      updateTaskList: vi.fn(),
    } as unknown as TaskListManager;
  });

  describe('successful requests', () => {
    it('should add new tags to a task', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['new-tag', 'another-tag'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['existing-tag', 'new-tag', 'another-tag'],
        updatedAt: new Date('2024-01-01T01:00:00.000Z'),
      };

      const updatedList = {
        ...mockTaskList,
        items: [updatedTask],
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedList
      );

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(response.tags).toEqual(['existing-tag', 'new-tag', 'another-tag']);

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update_item',
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        itemData: {
          tags: ['existing-tag', 'new-tag', 'another-tag'],
        },
      });
    });

    it('should handle duplicate tags by deduplicating', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['existing-tag', 'new-tag'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['existing-tag', 'new-tag'],
        updatedAt: new Date('2024-01-01T01:00:00.000Z'),
      };

      const updatedList = {
        ...mockTaskList,
        items: [updatedTask],
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedList
      );

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual(['existing-tag', 'new-tag']);
    });

    it('should handle task with no existing tags', async () => {
      const taskWithoutTags = {
        ...mockTask,
        tags: [],
      };

      const listWithTaskWithoutTags = {
        ...mockTaskList,
        items: [taskWithoutTags],
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['first-tag'],
          },
        },
      };

      const updatedTask = {
        ...taskWithoutTags,
        tags: ['first-tag'],
        updatedAt: new Date('2024-01-01T01:00:00.000Z'),
      };

      const updatedList = {
        ...mockTaskList,
        items: [updatedTask],
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithTaskWithoutTags
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedList
      );

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual(['first-tag']);
    });
  });

  describe('Validation errors', () => {
    it('should return error for invalid listId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: 'invalid-uuid',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['new-tag'],
          },
        },
      };

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID');
    });

    it('should return error for invalid taskId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: 'invalid-uuid',
            tags: ['new-tag'],
          },
        },
      };

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID');
    });

    it('should return error for empty tags array', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: [],
          },
        },
      };

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('>=1 items');
    });

    it('should return error for too many tags', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
          },
        },
      };

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('<=10 items');
    });

    it('should return error for tag that is too long', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['x'.repeat(51)],
          },
        },
      };

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('<=50 characters');
    });
  });

  describe('business logic errors', () => {
    it('should return error when task list not found', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440099',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['new-tag'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(null);

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Task list not found');
    });

    it('should return error when task not found', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440099',
            tags: ['new-tag'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Task not found');
    });

    it('should return error when task not found after update', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['new-tag'],
          },
        },
      };

      const updatedListWithoutTask = {
        ...mockTaskList,
        items: [],
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedListWithoutTask
      );

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Task not found after tag update'
      );
    });

    it('should handle updateTaskList throwing an error', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['new-tag'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockRejectedValue(
        new Error('Update failed')
      );

      const result = await handleAddTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Update failed');
    });
  });
});
