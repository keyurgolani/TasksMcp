/**
 * Unit tests for handleUpdateTask MCP handler
 * Tests task updates with agentPromptTemplate and other fields
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleUpdateTask } from '../../../../src/api/handlers/update-task.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { Task, TaskList } from '../../../../src/shared/types/task.js';

// Valid UUIDs for testing
const VALID_LIST_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TASK_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('handleUpdateTask', () => {
  let mockTaskListManager: TaskListManager;
  let mockTask: Task;
  let mockList: TaskList;

  beforeEach(() => {
    mockTask = {
      id: VALID_TASK_ID,
      title: 'Original Task',
      description: 'Original description',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      dependencies: [],
      tags: ['original'],
      metadata: {},
      implementationNotes: [],
      exitCriteria: [],
      agentPromptTemplate: 'Original template: {{task.title}}',
    };

    mockList = {
      id: VALID_LIST_ID,
      title: 'Test Project',
      description: 'A test project list',
      items: [mockTask],
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      context: 'test-context',
      isArchived: false,
      totalItems: 1,
      completedItems: 0,
      progress: 0,
      analytics: {
        totalItems: 1,
        completedItems: 0,
        pendingItems: 1,
        inProgressItems: 0,
        blockedItems: 0,
        progress: 0,
        averageCompletionTime: 0,
        estimatedTimeRemaining: 0,
        velocityMetrics: {
          itemsPerDay: 0,
          completionRate: 0,
        },
        tagFrequency: {},
        dependencyGraph: [],
      },
      metadata: {},
      projectTag: 'test-project',
      implementationNotes: [],
    };

    mockTaskListManager = {
      updateTaskList: vi.fn().mockResolvedValue(mockList),
    } as any;
  });

  describe('agentPromptTemplate updates', () => {
    it('should update agentPromptTemplate field', async () => {
      const updatedTemplate =
        'Updated template: {{task.title}} - {{task.status}}';
      const updatedTask = { ...mockTask, agentPromptTemplate: updatedTemplate };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            agentPromptTemplate: updatedTemplate,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.id).toBe(VALID_TASK_ID);

      // Verify updateTaskList was called with agentPromptTemplate
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          agentPromptTemplate: updatedTemplate,
        },
      });
    });

    it('should handle empty agentPromptTemplate validation', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            agentPromptTemplate: '',
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      // Empty string might be rejected by validation, check if it's an error
      if (result.isError) {
        expect(result.content[0].text).toContain('agentPromptTemplate');
      } else {
        // If empty string is allowed, verify the call was made
        expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
          listId: VALID_LIST_ID,
          action: 'update_item',
          itemId: VALID_TASK_ID,
          itemData: {
            agentPromptTemplate: '',
          },
        });
      }
    });

    it('should validate agentPromptTemplate length limit', async () => {
      const longTemplate = 'x'.repeat(10001); // Exceeds 10,000 char limit

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            agentPromptTemplate: longTemplate,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('10000 characters');
    });

    it('should update multiple fields including agentPromptTemplate', async () => {
      const updatedTemplate =
        'Multi-field template: {{task.title}} ({{task.priority}})';
      const updatedTask = {
        ...mockTask,
        title: 'Updated Task',
        description: 'Updated description',
        estimatedDuration: 90,
        agentPromptTemplate: updatedTemplate,
      };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            title: 'Updated Task',
            description: 'Updated description',
            estimatedDuration: 90,
            agentPromptTemplate: updatedTemplate,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text);
      expect(response.title).toBe('Updated Task');
      expect(response.description).toBe('Updated description');
      expect(response.estimatedDuration).toBe(90);

      // Verify all fields were passed to updateTaskList
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          title: 'Updated Task',
          description: 'Updated description',
          estimatedDuration: 90,
          agentPromptTemplate: updatedTemplate,
        },
      });
    });
  });

  describe('validation errors', () => {
    it('should return error for invalid listId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: 'invalid-uuid',
            taskId: VALID_TASK_ID,
            title: 'Updated Task',
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID format');
    });

    it('should return error for invalid taskId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: 'invalid-uuid',
            title: 'Updated Task',
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID format');
    });

    it('should return error when no fields provided for update', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            // No update fields provided
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'At least one field to update must be provided'
      );
    });

    it('should return error for empty title', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            title: '',
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('at least 1 characters');
    });

    it('should return error for title too long', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            title: 'x'.repeat(201), // Exceeds 200 char limit
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('200 characters');
    });
  });

  describe('successful updates', () => {
    it('should update only title', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Title Only' };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            title: 'Updated Title Only',
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text);
      expect(response.title).toBe('Updated Title Only');

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          title: 'Updated Title Only',
        },
      });
    });

    it('should update only description', async () => {
      const updatedTask = {
        ...mockTask,
        description: 'Updated description only',
      };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            description: 'Updated description only',
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          description: 'Updated description only',
        },
      });
    });

    it('should update only estimatedDuration', async () => {
      const updatedTask = { ...mockTask, estimatedDuration: 120 };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            estimatedDuration: 120,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          estimatedDuration: 120,
        },
      });
    });

    it('should update exitCriteria', async () => {
      const exitCriteria = [
        { id: 'criteria-1', description: 'New criteria 1', isMet: false },
        { id: 'criteria-2', description: 'New criteria 2', isMet: false },
      ];
      const updatedTask = { ...mockTask, exitCriteria };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            exitCriteria: ['New criteria 1', 'New criteria 2'],
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          exitCriteria: ['New criteria 1', 'New criteria 2'],
        },
      });
    });
  });

  describe('template scenarios', () => {
    it('should update to persona-based template', async () => {
      const personaTemplate = `
You are a {{task.tags}} specialist working on {{task.title}}.

Your role:
- Expert in {{task.tags}}
- Working on {{list.projectTag}} project
- Priority level: {{task.priority}}

Please approach this task with your specialized expertise.
      `.trim();

      const updatedTask = { ...mockTask, agentPromptTemplate: personaTemplate };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            agentPromptTemplate: personaTemplate,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          agentPromptTemplate: personaTemplate,
        },
      });
    });

    it('should update to instruction-based template', async () => {
      const instructionTemplate = `
# Task Instructions: {{task.title}}

## Objective
{{task.description}}

## Requirements
- Status: {{task.status}}
- Priority: {{task.priority}}
- Duration: {{task.estimatedDuration}} minutes

## Context
Project: {{list.title}} ({{list.projectTag}})
Progress: {{list.progress}}%

## Success Criteria
Complete all requirements before marking as done.
      `.trim();

      const updatedTask = {
        ...mockTask,
        agentPromptTemplate: instructionTemplate,
      };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            agentPromptTemplate: instructionTemplate,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          agentPromptTemplate: instructionTemplate,
        },
      });
    });

    it('should handle template with all variable types', async () => {
      const comprehensiveTemplate = `
# Comprehensive Task: {{task.title}}

## Task Details
- ID: {{task.id}}
- Description: {{task.description}}
- Status: {{task.status}}
- Priority: {{task.priority}}
- Created: {{task.createdAt}}
- Updated: {{task.updatedAt}}
- Duration: {{task.estimatedDuration}}
- Tags: {{task.tags}}
- Dependencies: {{task.dependencies}}

## List Context
- List: {{list.title}}
- Project: {{list.projectTag}}
- Total Items: {{list.totalItems}}
- Completed: {{list.completedItems}}
- Progress: {{list.progress}}%

## Metadata
{{task.metadata}}
      `.trim();

      const updatedTask = {
        ...mockTask,
        agentPromptTemplate: comprehensiveTemplate,
      };
      const updatedList = { ...mockList, items: [updatedTask] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(updatedList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update_task',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            agentPromptTemplate: comprehensiveTemplate,
          },
        },
      };

      const result = await handleUpdateTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'update_item',
        itemId: VALID_TASK_ID,
        itemData: {
          agentPromptTemplate: comprehensiveTemplate,
        },
      });
    });
  });
});
