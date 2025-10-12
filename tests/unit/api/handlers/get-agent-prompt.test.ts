/**
 * Unit tests for handleGetAgentPrompt MCP handler
 * Tests agent prompt retrieval and rendering through MCP interface
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleGetAgentPrompt } from '../../../../src/api/handlers/get-agent-prompt.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { Task, TaskList } from '../../../../src/shared/types/task.js';

// Valid UUIDs for testing
const VALID_LIST_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TASK_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_DEP_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('handleGetAgentPrompt', () => {
  let mockTaskListManager: TaskListManager;
  let mockTask: Task;
  let mockList: TaskList;

  beforeEach(() => {
    mockTask = {
      id: VALID_TASK_ID,
      title: 'Test Task',
      description: 'A test task for agent prompt testing',
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      dependencies: [VALID_DEP_ID],
      tags: ['urgent', 'frontend'],
      metadata: {},
      implementationNotes: [],
      exitCriteria: [],
      agentPromptTemplate: 'Task: {{task.title}} - {{task.description}}',
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
      getTaskList: vi.fn().mockResolvedValue(mockList),
    } as any;
  });

  describe('successful requests', () => {
    it('should return rendered agent prompt for task with custom template', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.taskId).toBe(VALID_TASK_ID);
      expect(response.listId).toBe(VALID_LIST_ID);
      expect(response.hasCustomTemplate).toBe(true);
      expect(response.prompt).toBe(
        'Task: Test Task - A test task for agent prompt testing'
      );
      expect(response.renderTime).toBeGreaterThan(0);
      expect(response.variablesUsed).toEqual([
        '{{task.title}}',
        '{{task.description}}',
      ]);
      expect(response.errors).toBeUndefined();
    });

    it('should return default template when useDefault is true and no custom template', async () => {
      const taskWithoutTemplate = {
        ...mockTask,
        agentPromptTemplate: undefined,
      };
      const listWithoutTemplate = { ...mockList, items: [taskWithoutTemplate] };
      mockTaskListManager.getTaskList = vi
        .fn()
        .mockResolvedValue(listWithoutTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            useDefault: true,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.hasCustomTemplate).toBe(false);
      expect(response.prompt).toContain('# Task: Test Task');
      expect(response.prompt).toContain('## Description');
      expect(response.prompt).toContain('A test task for agent prompt testing');
      expect(response.variablesUsed.length).toBeGreaterThan(0);
    });

    it('should return empty prompt when no template and useDefault is false', async () => {
      const taskWithoutTemplate = {
        ...mockTask,
        agentPromptTemplate: undefined,
      };
      const listWithoutTemplate = { ...mockList, items: [taskWithoutTemplate] };
      mockTaskListManager.getTaskList = vi
        .fn()
        .mockResolvedValue(listWithoutTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            useDefault: false,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.hasCustomTemplate).toBe(false);
      expect(response.prompt).toBe('');
      expect(response.variablesUsed).toEqual([]);
    });

    it('should handle complex template with all variable types', async () => {
      const complexTemplate = `
# Task: {{task.title}}

## Details
- Status: {{task.status}}
- Priority: {{task.priority}}
- Tags: {{task.tags}}
- Dependencies: {{task.dependencies}}

## Project
- List: {{list.title}}
- Project: {{list.projectTag}}
- Progress: {{list.progress}}%
      `.trim();

      const taskWithComplexTemplate = {
        ...mockTask,
        agentPromptTemplate: complexTemplate,
      };
      const listWithComplexTemplate = {
        ...mockList,
        items: [taskWithComplexTemplate],
      };
      mockTaskListManager.getTaskList = vi
        .fn()
        .mockResolvedValue(listWithComplexTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.prompt).toContain('# Task: Test Task');
      expect(response.prompt).toContain('Status: pending');
      expect(response.prompt).toContain('Priority: 4');
      expect(response.prompt).toContain('Tags: urgent, frontend');
      expect(response.prompt).toContain(
        'Dependencies: 550e8400-e29b-41d4-a716-446655440002'
      );
      expect(response.prompt).toContain('List: Test Project');
      expect(response.prompt).toContain('Project: test-project');
      expect(response.variablesUsed.length).toBeGreaterThan(5);
    });
  });

  describe('validation errors', () => {
    it('should return error for invalid listId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: 'invalid-uuid',
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID format');
    });

    it('should return error for invalid taskId format', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: 'invalid-uuid',
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid UUID format');
    });

    it('should return error for missing required parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            // Missing taskId
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Expected string, but received undefined'
      );
    });
  });

  describe('business logic errors', () => {
    it('should return error when task list not found', async () => {
      mockTaskListManager.getTaskList = vi.fn().mockResolvedValue(null);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440099',
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Task list not found: 550e8400-e29b-41d4-a716-446655440099'
      );
    });

    it('should return error when task not found', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: '550e8400-e29b-41d4-a716-446655440098',
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Task not found: 550e8400-e29b-41d4-a716-446655440098'
      );
    });

    it('should return error when template rendering fails', async () => {
      const taskWithInvalidTemplate = {
        ...mockTask,
        agentPromptTemplate: 'x'.repeat(10001), // Exceeds max length
      };
      const listWithInvalidTemplate = {
        ...mockList,
        items: [taskWithInvalidTemplate],
      };
      mockTaskListManager.getTaskList = vi
        .fn()
        .mockResolvedValue(listWithInvalidTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.errors).toBeDefined();
      expect(response.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parameter handling', () => {
    it('should handle useDefault parameter correctly', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            useDefault: true,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.hasCustomTemplate).toBe(true); // Task has custom template
      expect(response.prompt).toBe(
        'Task: Test Task - A test task for agent prompt testing'
      );
    });

    it('should default useDefault to false when not provided', async () => {
      const taskWithoutTemplate = {
        ...mockTask,
        agentPromptTemplate: undefined,
      };
      const listWithoutTemplate = { ...mockList, items: [taskWithoutTemplate] };
      mockTaskListManager.getTaskList = vi
        .fn()
        .mockResolvedValue(listWithoutTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
            // useDefault not provided, should default to false
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.hasCustomTemplate).toBe(false);
      expect(response.prompt).toBe('');
    });
  });

  describe('response format', () => {
    it('should return properly formatted response', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('taskId');
      expect(response).toHaveProperty('listId');
      expect(response).toHaveProperty('hasCustomTemplate');
      expect(response).toHaveProperty('prompt');
      expect(response).toHaveProperty('renderTime');
      expect(response).toHaveProperty('variablesUsed');

      expect(typeof response.taskId).toBe('string');
      expect(typeof response.listId).toBe('string');
      expect(typeof response.hasCustomTemplate).toBe('boolean');
      expect(typeof response.prompt).toBe('string');
      expect(typeof response.renderTime).toBe('number');
      expect(Array.isArray(response.variablesUsed)).toBe(true);
    });

    it('should handle template with missing variables gracefully', async () => {
      const taskWithProblematicTemplate = {
        ...mockTask,
        agentPromptTemplate: 'Task: {{task.title}} - {{task.nonexistent}}',
      };
      const listWithProblematicTemplate = {
        ...mockList,
        items: [taskWithProblematicTemplate],
      };
      mockTaskListManager.getTaskList = vi
        .fn()
        .mockResolvedValue(listWithProblematicTemplate);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_agent_prompt',
          arguments: {
            listId: VALID_LIST_ID,
            taskId: VALID_TASK_ID,
          },
        },
      };

      const result = await handleGetAgentPrompt(request, mockTaskListManager);

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.prompt).toBe('Task: Test Task - ');
      expect(response.errors).toBeUndefined(); // Missing variables are handled gracefully
    });
  });
});
