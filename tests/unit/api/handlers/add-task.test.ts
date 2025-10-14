/**
 * Unit tests for handleAddTask MCP handler
 * Tests task creation with agentPromptTemplate and other fields
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleAddTask } from '../../../../src/api/handlers/add-task.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { Task, TaskList } from '../../../../src/shared/types/task.js';

// Valid UUIDs for testing
const VALID_LIST_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TASK_ID = '550e8400-e29b-41d4-a716-446655440001';
const _VALID_DEP_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('handleAddTask', () => {
  let mockTaskListManager: TaskListManager;
  let mockList: TaskList;
  let mockTask: Task;

  beforeEach(() => {
    mockTask = {
      id: VALID_TASK_ID,
      title: 'Test Task',
      description: 'A test task',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      dependencies: [],
      tags: [],
      metadata: {},
      implementationNotes: [],
      exitCriteria: [],
    };

    mockList = {
      id: VALID_LIST_ID,
      title: 'Test Project',
      description: 'A test project list',
      items: [mockTask],
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      context: 'test-context',
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
      getTaskList: vi.fn().mockResolvedValue(mockList),
      updateTaskList: vi.fn().mockResolvedValue(mockList),
    } as any;
  });

  describe('agentPromptTemplate field', () => {
    it('should create task with agentPromptTemplate', async () => {
      const taskWithTemplate = {
        ...mockTask,
        agentPromptTemplate: 'Task: {{task.title}} - {{task.description}}',
      };
      const listWithTemplate = { ...mockList, items: [taskWithTemplate] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(listWithTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            description: 'A test task',
            agentPromptTemplate: 'Task: {{task.title}} - {{task.description}}',
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.title).toBe('Test Task');
      expect(response.description).toBe('A test task');

      // Verify updateTaskList was called with agentPromptTemplate
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: expect.objectContaining({
          title: 'Test Task',
          description: 'A test task',
          agentPromptTemplate: 'Task: {{task.title}} - {{task.description}}',
        }),
      });
    });

    it('should create task without agentPromptTemplate when not provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            description: 'A test task',
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      // Verify updateTaskList was called without agentPromptTemplate
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: expect.not.objectContaining({
          agentPromptTemplate: expect.anything(),
        }),
      });
    });

    it('should validate agentPromptTemplate length limit', async () => {
      const longTemplate = 'x'.repeat(10001); // Exceeds 10,000 char limit

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            agentPromptTemplate: longTemplate,
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('<=10000 characters');
    });

    it('should handle complex agentPromptTemplate with multiple variables', async () => {
      const complexTemplate = `
# Task: {{task.title}}

## Description
{{task.description}}

## Context
- Status: {{task.status}}
- Priority: {{task.priority}}
- Tags: {{task.tags}}
- List: {{list.title}}
- Project: {{list.projectTag}}

## Instructions
Please work on this task according to the requirements.
      `.trim();

      const taskWithComplexTemplate = {
        ...mockTask,
        agentPromptTemplate: complexTemplate,
      };
      const listWithComplexTemplate = {
        ...mockList,
        items: [taskWithComplexTemplate],
      };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(listWithComplexTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            description: 'A test task',
            agentPromptTemplate: complexTemplate,
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      // Verify updateTaskList was called with complex template
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: expect.objectContaining({
          agentPromptTemplate: complexTemplate,
        }),
      });
    });
  });

  describe('Validation errors', () => {
    it('should return error for invalid listId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: 'invalid-uuid',
            title: 'Test Task',
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID');
    });

    it('should return error for missing title', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            // Missing title
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('expected string');
    });

    it('should return error for empty title', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: '',
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('>=1 characters');
    });

    it('should return error for title too long', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'x'.repeat(201), // Exceeds 200 char limit
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('<=200 characters');
    });
  });

  describe('successful task creation', () => {
    it('should create task with all optional fields including agentPromptTemplate', async () => {
      const fullTask = {
        ...mockTask,
        description: 'Full task description',
        priority: Priority.HIGH,
        tags: ['urgent', 'frontend'],
        estimatedDuration: 120,
        exitCriteria: [
          { id: 'criteria-1', description: 'Criteria 1', isMet: false },
        ],
        agentPromptTemplate: 'You are working on {{task.title}}',
      };
      const fullList = { ...mockList, items: [fullTask] };
      mockTaskListManager.updateTaskList = vi.fn().mockResolvedValue(fullList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            description: 'Full task description',
            priority: 4,
            tags: ['urgent', 'frontend'],
            estimatedDuration: 120,
            exitCriteria: ['Criteria 1'],
            agentPromptTemplate: 'You are working on {{task.title}}',
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text);
      expect(response.title).toBe('Test Task');
      expect(response.description).toBe('Full task description');
      expect(response.priority).toBe(4);
      expect(response.tags).toEqual(['urgent', 'frontend']);
      expect(response.estimatedDuration).toBe(120);

      // Verify all fields were passed to updateTaskList
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: {
          title: 'Test Task',
          description: 'Full task description',
          priority: 4,
          tags: ['urgent', 'frontend'],
          estimatedDuration: 120,
          exitCriteria: ['Criteria 1'],
          agentPromptTemplate: 'You are working on {{task.title}}',
        },
      });
    });

    it('should create task with default priority when not specified', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      // Verify default priority (3) was used
      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: expect.objectContaining({
          priority: 3, // Default priority
        }),
      });
    });
  });

  describe('persona and instruction templates', () => {
    it('should handle persona-based agentPromptTemplate', async () => {
      const personaTemplate = `
You are a {{task.tags}} developer working on {{task.title}}.

Your expertise includes:
- {{task.tags}}
- Project: {{list.projectTag}}

Please approach this task with your specialized knowledge.
      `.trim();

      const taskWithPersona = {
        ...mockTask,
        tags: ['frontend', 'react'],
        agentPromptTemplate: personaTemplate,
      };
      const listWithPersona = { ...mockList, items: [taskWithPersona] };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(listWithPersona);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            tags: ['frontend', 'react'],
            agentPromptTemplate: personaTemplate,
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: expect.objectContaining({
          agentPromptTemplate: personaTemplate,
          tags: ['frontend', 'react'],
        }),
      });
    });

    it('should handle instruction-based agentPromptTemplate', async () => {
      const instructionTemplate = `
# Instructions for {{task.title}}

## Objective
{{task.description}}

## Requirements
- Priority: {{task.priority}}
- Estimated Duration: {{task.estimatedDuration}} minutes
- Tags: {{task.tags}}

## Context
This task is part of {{list.title}} ({{list.projectTag}}).

## Success Criteria
Complete all exit criteria before marking as done.
      `.trim();

      const taskWithInstructions = {
        ...mockTask,
        agentPromptTemplate: instructionTemplate,
      };
      const listWithInstructions = {
        ...mockList,
        items: [taskWithInstructions],
      };
      mockTaskListManager.updateTaskList = vi
        .fn()
        .mockResolvedValue(listWithInstructions);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: VALID_LIST_ID,
            title: 'Test Task',
            description: 'Task description',
            priority: 4,
            estimatedDuration: 90,
            tags: ['important'],
            agentPromptTemplate: instructionTemplate,
          },
        },
      };

      const result = await handleAddTask(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.isError).toBeUndefined();

      expect(mockTaskListManager.updateTaskList).toHaveBeenCalledWith({
        listId: VALID_LIST_ID,
        action: 'add_item',
        itemData: expect.objectContaining({
          agentPromptTemplate: instructionTemplate,
          description: 'Task description',
          priority: 4,
          estimatedDuration: 90,
          tags: ['important'],
        }),
      });
    });
  });
});
