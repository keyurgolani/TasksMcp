import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleRemoveTaskTags } from '../../../../src/api/handlers/remove-task-tags.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { TaskList } from '../../../../src/shared/types/task-list.js';
import type { Task } from '../../../../src/shared/types/task.js';

describe('handleRemoveTaskTags', () => {
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
      tags: ['tag1', 'tag2', 'tag3'],
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
    it('should remove existing tags from a task', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1', 'tag3'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['tag2'],
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

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(response.tags).toEqual(['tag2']);

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update_item',
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        itemData: {
          tags: ['tag2'],
        },
      });
    });

    it('should remove all tags when all existing tags are specified', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1', 'tag2', 'tag3'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: [],
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

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual([]);
    });

    it('should remove single tag correctly', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag2'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['tag1', 'tag3'],
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

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual(['tag1', 'tag3']);
    });

    it('should handle removing non-existent tags gracefully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['non-existent-tag'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['tag1', 'tag2', 'tag3'], // No change since tag doesn't exist
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

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle mixed existing and non-existent tags', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1', 'non-existent-tag', 'tag3'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['tag2'], // Only tag1 and tag3 removed, non-existent-tag ignored
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

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual(['tag2']);
    });

    it('should handle task with no existing tags', async () => {
      const taskWithNoTags = {
        ...mockTask,
        tags: [],
      };

      const listWithNoTagsTask = {
        ...mockTaskList,
        items: [taskWithNoTags],
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['any-tag'],
          },
        },
      };

      const updatedTask = {
        ...taskWithNoTags,
        tags: [], // No change since no tags exist
        updatedAt: new Date('2024-01-01T01:00:00.000Z'),
      };

      const updatedList = {
        ...listWithNoTagsTask,
        items: [updatedTask],
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithNoTagsTask
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedList
      );

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual([]);
    });

    it('should return proper response format with all required fields', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['tag2', 'tag3'],
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

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);

      // Verify all required response fields are present
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('title');
      expect(response).toHaveProperty('description');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('priority');
      expect(response).toHaveProperty('tags');
      expect(response).toHaveProperty('createdAt');
      expect(response).toHaveProperty('updatedAt');
      expect(response).toHaveProperty('estimatedDuration');

      // Verify field values
      expect(response.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(response.title).toBe('Test Task');
      expect(response.description).toBe('A test task');
      expect(response.status).toBe('pending');
      expect(response.priority).toBe(3);
      expect(response.tags).toEqual(['tag2', 'tag3']);
      expect(response.estimatedDuration).toBe(60);
    });
  });

  describe('Validation errors', () => {
    it('should return error for invalid listId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: 'invalid-uuid',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1'],
          },
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID');
    });

    it('should return error for invalid taskId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: 'invalid-task-uuid',
            tags: ['tag1'],
          },
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID');
    });

    it('should return error when task list not found', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440099',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(null);

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Task list not found');
    });

    it('should return error when task not found in list', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440099',
            tags: ['tag1'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Task not found');
    });

    it('should return error for empty tags array', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: [],
          },
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('>=1 items');
    });

    it('should return error for tags array exceeding maximum length', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: Array.from({ length: 11 }, (_, i) => `tag${i + 1}`),
          },
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('<=10 items');
    });

    it('should return error for tag exceeding maximum length', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['a'.repeat(51)], // 51 characters, exceeds max of 50
          },
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('<=50 characters');
    });

    it('should return error for missing required parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            // Missing taskId and tags
          },
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'expected string, received undefined'
      );
    });
  });

  describe('error handling', () => {
    it('should handle TaskListManager.getTaskList throwing an error', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Database connection failed');
    });

    it('should handle TaskListManager.updateTaskList throwing an error', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1'],
          },
        },
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockRejectedValue(
        new Error('Update operation failed')
      );

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Update operation failed');
    });

    it('should handle case where task is not found after update', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1'],
          },
        },
      };

      const updatedListWithoutTask = {
        ...mockTaskList,
        items: [], // Task disappeared after update
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        mockTaskList
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedListWithoutTask
      );

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Task not found after tag removal'
      );
    });

    it('should handle malformed request parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: null, // Malformed arguments
        },
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'expected object, received null'
      );
    });

    it('should handle request with undefined params', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: undefined, // No params at all
      };

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      // Should handle gracefully without crashing
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('logging and debugging', () => {
    it('should call TaskListManager methods with correct parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['tag1', 'tag2'],
          },
        },
      };

      const updatedTask = {
        ...mockTask,
        tags: ['tag3'],
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

      await handleRemoveTaskTags(request, mockTaskListManager);

      // Verify getTaskList was called with correct parameters
      expect(mockTaskListManager.getTaskList).toHaveBeenCalledWith({
        listId: '550e8400-e29b-41d4-a716-446655440000',
      });

      // Verify updateTaskList was called with correct parameters
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update_item',
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        itemData: {
          tags: ['tag3'], // Only tag3 should remain after removing tag1 and tag2
        },
      });
    });

    it('should handle case where task has undefined tags property', async () => {
      const taskWithUndefinedTags = {
        ...mockTask,
        tags: undefined as any, // Simulate undefined tags
      };

      const listWithUndefinedTagsTask = {
        ...mockTaskList,
        items: [taskWithUndefinedTags],
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove_task_tags',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            tags: ['any-tag'],
          },
        },
      };

      const updatedTask = {
        ...taskWithUndefinedTags,
        tags: [], // Should handle undefined gracefully
        updatedAt: new Date('2024-01-01T01:00:00.000Z'),
      };

      const updatedList = {
        ...listWithUndefinedTagsTask,
        items: [updatedTask],
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithUndefinedTagsTask
      );
      vi.mocked(mockTaskListManager.updateTaskList).mockResolvedValue(
        updatedList
      );

      const result = await handleRemoveTaskTags(request, mockTaskListManager);

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.tags).toEqual([]);
    });
  });
});
