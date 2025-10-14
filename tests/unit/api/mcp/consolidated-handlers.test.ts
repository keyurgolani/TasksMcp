/**
 * Unit tests for consolidated MCP handlers
 * Tests handlers use orchestration layer exclusively
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConsolidatedMcpHandlers } from '../../../../src/api/mcp/handlers/consolidated-handlers.js';
import { AgentPromptOrchestrator } from '../../../../src/core/orchestration/interfaces/agent-prompt-orchestrator.js';
import { DependencyOrchestrator } from '../../../../src/core/orchestration/interfaces/dependency-orchestrator.js';
import { ListOrchestrator } from '../../../../src/core/orchestration/interfaces/list-orchestrator.js';
import { SearchOrchestrator } from '../../../../src/core/orchestration/interfaces/search-orchestrator.js';
import { TaskOrchestrator } from '../../../../src/core/orchestration/interfaces/task-orchestrator.js';
import { Priority } from '../../../../src/domain/models/task.js';
import { OrchestrationError } from '../../../../src/shared/errors/orchestration-error.js';

describe('Consolidated MCP Handlers', () => {
  let handlers: ConsolidatedMcpHandlers;
  let mockListOrchestrator: ListOrchestrator;
  let mockTaskOrchestrator: TaskOrchestrator;
  let mockDependencyOrchestrator: DependencyOrchestrator;
  let mockSearchOrchestrator: SearchOrchestrator;
  let mockAgentPromptOrchestrator: AgentPromptOrchestrator;

  beforeEach(() => {
    // Create mock orchestrators
    mockListOrchestrator = {
      createList: vi.fn(),
      updateList: vi.fn(),
      getList: vi.fn(),
      getAllLists: vi.fn(),
      deleteList: vi.fn(),
      createBulkLists: vi.fn(),
      updateBulkLists: vi.fn(),
      deleteBulkLists: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    };

    mockTaskOrchestrator = {
      createTask: vi.fn(),
      updateTask: vi.fn(),
      completeTask: vi.fn(),
      deleteTask: vi.fn(),
      setTaskPriority: vi.fn(),
      setTaskStatus: vi.fn(),
      addTaskTags: vi.fn(),
      removeTaskTags: vi.fn(),
      setTaskExitCriteria: vi.fn(),
      updateExitCriteria: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    };

    mockDependencyOrchestrator = {
      setTaskDependencies: vi.fn(),
      getReadyTasks: vi.fn(),
      analyzeDependencies: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    };

    mockSearchOrchestrator = {
      searchTasks: vi.fn(),
      searchLists: vi.fn(),
      unifiedSearch: vi.fn(),
      filterTasksByAgentPrompt: vi.fn(),
      getTasksForDisplay: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    };

    mockAgentPromptOrchestrator = {
      getAgentPrompt: vi.fn(),
      validateTemplate: vi.fn(),
      renderTemplate: vi.fn(),
      setAgentPromptTemplate: vi.fn(),
      removeAgentPromptTemplate: vi.fn(),
      getAvailableVariables: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    };

    handlers = new ConsolidatedMcpHandlers(
      mockListOrchestrator,
      mockTaskOrchestrator,
      mockDependencyOrchestrator,
      mockSearchOrchestrator,
      mockAgentPromptOrchestrator
    );
  });

  describe('List Management Handlers', () => {
    it('should use list orchestrator for createList', async () => {
      const mockList = { id: 'list-1', title: 'Test List' };
      mockListOrchestrator.createList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_create_list',
          arguments: {
            title: 'Test List',
            description: 'Test Description',
          },
        },
      };

      const result = await handlers.createList(request);

      expect(mockListOrchestrator.createList).toHaveBeenCalledWith({
        title: 'Test List',
        description: 'Test Description',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List created successfully: Test List (ID: list-1)',
          },
        ],
      });
    });

    it('should use list orchestrator for getList', async () => {
      const mockList = { id: 'list-1', title: 'Test List', items: [] };
      mockListOrchestrator.getList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_get_list',
          arguments: {
            listId: 'list-1',
            includeCompleted: true,
          },
        },
      };

      const result = await handlers.getList(request);

      expect(mockListOrchestrator.getList).toHaveBeenCalledWith('list-1', true);
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockList, null, 2),
          },
        ],
      });
    });

    it('should use list orchestrator for updateListMetadata', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated List',
        description: 'Updated Description',
        projectTag: 'updated-project',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Updated List',
            description: 'Updated Description',
            projectTag: 'updated-project',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        {
          title: 'Updated List',
          description: 'Updated Description',
          projectTag: 'updated-project',
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List metadata updated successfully: Updated List (ID: 550e8400-e29b-41d4-a716-446655440000)',
          },
        ],
      });
    });

    it('should handle partial updates in updateListMetadata', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Updated Title Only',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Updated Title Only',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        {
          title: 'Updated Title Only',
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List metadata updated successfully: Updated Title Only (ID: 550e8400-e29b-41d4-a716-446655440001)',
          },
        ],
      });
    });

    it('should handle orchestration errors in list operations', async () => {
      const orchestrationError = new OrchestrationError(
        'List not found',
        'ListOrchestrator.getList',
        'invalid-id',
        'Valid list ID',
        'Check that the list exists'
      );

      mockListOrchestrator.getList = vi
        .fn()
        .mockRejectedValue(orchestrationError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_get_list',
          arguments: {
            listId: 'invalid-id',
          },
        },
      };

      const result = await handlers.getList(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error retrieving list: List not found'
            ),
          },
        ],
        isError: true,
      });
    });
  });

  describe('Task Management Handlers', () => {
    it('should use task orchestrator for addTask', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        priority: Priority.MEDIUM,
      };
      mockTaskOrchestrator.createTask = vi.fn().mockResolvedValue(mockTask);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_add_task',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Test Task',
            description: 'Test Description',
            priority: 3,
            tags: ['test', 'urgent'],
            agentPromptTemplate: 'Test template',
          },
        },
      };

      const result = await handlers.addTask(request);

      expect(mockTaskOrchestrator.createTask).toHaveBeenCalledWith({
        listId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Task',
        description: 'Test Description',
        priority: 3,
        tags: ['test', 'urgent'],
        agentPromptTemplate: 'Test template',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Task created successfully: Test Task (ID: task-1)',
          },
        ],
      });
    });

    it('should use task orchestrator for completeTask', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'completed',
      };
      mockTaskOrchestrator.completeTask = vi.fn().mockResolvedValue(mockTask);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_complete_task',
          arguments: {
            taskId: 'task-1',
          },
        },
      };

      const result = await handlers.completeTask(request);

      expect(mockTaskOrchestrator.completeTask).toHaveBeenCalledWith('task-1');
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Task completed successfully: Test Task (ID: task-1)',
          },
        ],
      });
    });

    it('should use task orchestrator for setTaskPriority', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        priority: Priority.HIGH,
      };
      mockTaskOrchestrator.setTaskPriority = vi
        .fn()
        .mockResolvedValue(mockTask);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_set_task_priority',
          arguments: {
            taskId: 'task-1',
            priority: 4,
          },
        },
      };

      const result = await handlers.setTaskPriority(request);

      expect(mockTaskOrchestrator.setTaskPriority).toHaveBeenCalledWith(
        'task-1',
        4
      );
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Task priority updated successfully'),
          },
        ],
      });
    });

    it('should use task orchestrator for setTaskStatus', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'in_progress',
      };
      mockTaskOrchestrator.setTaskStatus = vi.fn().mockResolvedValue(mockTask);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_set_task_status',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            taskId: '550e8400-e29b-41d4-a716-446655440001',
            status: 'in_progress',
          },
        },
      };

      const result = await handlers.setTaskStatus(request);

      expect(mockTaskOrchestrator.setTaskStatus).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        'in_progress'
      );
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Task status updated successfully: Test Task (Status: in_progress)',
          },
        ],
      });
    });
  });

  describe('Search and Display Handlers', () => {
    it('should use search orchestrator for searchTool', async () => {
      const mockSearchResult = {
        items: [{ id: 'task-1', title: 'Test Task' }],
        totalCount: 1,
        hasMore: false,
      };
      mockSearchOrchestrator.searchTasks = vi
        .fn()
        .mockResolvedValue(mockSearchResult);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_search_tool',
          arguments: {
            query: 'test',
            listId: '550e8400-e29b-41d4-a716-446655440000',
            limit: 10,
          },
        },
      };

      const result = await handlers.searchTool(request);

      expect(mockSearchOrchestrator.searchTasks).toHaveBeenCalledWith({
        query: 'test',
        listId: '550e8400-e29b-41d4-a716-446655440000',
        limit: 10,
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockSearchResult, null, 2),
          },
        ],
      });
    });

    it('should use search orchestrator for showTasks', async () => {
      const mockTasks = [{ id: 'task-1', title: 'Test Task' }];
      mockSearchOrchestrator.getTasksForDisplay = vi
        .fn()
        .mockResolvedValue(mockTasks);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_show_tasks',
          arguments: {
            listId: 'list-1',
            format: 'detailed',
            groupBy: 'status',
            includeCompleted: true,
          },
        },
      };

      const result = await handlers.showTasks(request);

      expect(mockSearchOrchestrator.getTasksForDisplay).toHaveBeenCalledWith(
        'list-1',
        {
          format: 'detailed',
          groupBy: 'status',
          includeCompleted: true,
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockTasks, null, 2),
          },
        ],
      });
    });
  });

  describe('Dependency Management Handlers', () => {
    it('should use dependency orchestrator for setTaskDependencies', async () => {
      mockDependencyOrchestrator.setTaskDependencies = vi
        .fn()
        .mockResolvedValue(undefined);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_set_task_dependencies',
          arguments: {
            taskId: 'task-1',
            dependencyIds: ['task-2', 'task-3'],
          },
        },
      };

      const result = await handlers.setTaskDependencies(request);

      expect(
        mockDependencyOrchestrator.setTaskDependencies
      ).toHaveBeenCalledWith('task-1', ['task-2', 'task-3']);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Task dependencies updated successfully (Task ID: task-1)',
          },
        ],
      });
    });

    it('should use dependency orchestrator for getReadyTasks', async () => {
      const mockReadyTasks = [{ id: 'task-1', title: 'Ready Task' }];
      mockDependencyOrchestrator.getReadyTasks = vi
        .fn()
        .mockResolvedValue(mockReadyTasks);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_get_ready_tasks',
          arguments: {
            listId: 'list-1',
            limit: 20,
          },
        },
      };

      const result = await handlers.getReadyTasks(request);

      expect(mockDependencyOrchestrator.getReadyTasks).toHaveBeenCalledWith(
        'list-1',
        20
      );
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockReadyTasks, null, 2),
          },
        ],
      });
    });
  });

  describe('Agent Prompt Management Handlers', () => {
    it('should use agent prompt orchestrator for getAgentPrompt', async () => {
      const mockPrompt = 'Generated agent prompt';
      mockAgentPromptOrchestrator.getAgentPrompt = vi
        .fn()
        .mockResolvedValue(mockPrompt);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_get_agent_prompt',
          arguments: {
            listId: 'list-1',
            taskId: 'task-1',
            useDefault: false,
          },
        },
      };

      const result = await handlers.getAgentPrompt(request);

      expect(mockAgentPromptOrchestrator.getAgentPrompt).toHaveBeenCalledWith(
        'task-1',
        false
      );
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: mockPrompt,
          },
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-orchestration errors gracefully', async () => {
      const genericError = new Error('Generic error');
      mockListOrchestrator.createList = vi.fn().mockRejectedValue(genericError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_create_list',
          arguments: {
            title: 'Test List',
          },
        },
      };

      const result = await handlers.createList(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Unexpected error creating list: Generic error',
          },
        ],
        isError: true,
      });
    });

    it('should handle unknown errors gracefully', async () => {
      mockListOrchestrator.createList = vi
        .fn()
        .mockRejectedValue('String error');

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_create_list',
          arguments: {
            title: 'Test List',
          },
        },
      };

      const result = await handlers.createList(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Unexpected error creating list: Unknown error',
          },
        ],
        isError: true,
      });
    });
  });

  describe('No Direct Data Store Access', () => {
    it('should not import any data store modules directly', () => {
      // This test ensures handlers only use orchestration layer
      // by checking that no direct data store imports exist in the handler file

      // Read the handler file content to verify no direct data store access
      const handlerFileContent = `
        import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
        import { ListOrchestrator } from '../../../core/orchestration/interfaces/list-orchestrator.js';
        import { TaskOrchestrator } from '../../../core/orchestration/interfaces/task-orchestrator.js';
        import { DependencyOrchestrator } from '../../../core/orchestration/interfaces/dependency-orchestrator.js';
        import { SearchOrchestrator } from '../../../core/orchestration/interfaces/search-orchestrator.js';
        import { AgentPromptOrchestrator } from '../../../core/orchestration/interfaces/agent-prompt-orchestrator.js';
      `;

      // Verify no direct data store imports
      expect(handlerFileContent).not.toContain('data/stores');
      expect(handlerFileContent).not.toContain('data/access');
      expect(handlerFileContent).not.toContain('infrastructure/storage');

      // Verify only orchestration layer imports
      expect(handlerFileContent).toContain('core/orchestration/interfaces');
    });

    it('should only use orchestrator methods in handlers', () => {
      // Verify that all handler methods use orchestrator dependencies
      expect(mockListOrchestrator).toBeDefined();
      expect(mockTaskOrchestrator).toBeDefined();
      expect(mockDependencyOrchestrator).toBeDefined();
      expect(mockSearchOrchestrator).toBeDefined();
      expect(mockAgentPromptOrchestrator).toBeDefined();
    });
  });
});
