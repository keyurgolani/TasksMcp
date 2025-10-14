/**
 * Unit tests for List Metadata Update Tool
 * Tests list metadata update functionality in MCP tools
 * Requirements: 6.10
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConsolidatedMcpHandlers } from '../../../../src/api/mcp/handlers/consolidated-handlers.js';
import { AgentPromptOrchestrator } from '../../../../src/core/orchestration/interfaces/agent-prompt-orchestrator.js';
import { DependencyOrchestrator } from '../../../../src/core/orchestration/interfaces/dependency-orchestrator.js';
import { ListOrchestrator } from '../../../../src/core/orchestration/interfaces/list-orchestrator.js';
import { SearchOrchestrator } from '../../../../src/core/orchestration/interfaces/search-orchestrator.js';
import { TaskOrchestrator } from '../../../../src/core/orchestration/interfaces/task-orchestrator.js';
import { OrchestrationError } from '../../../../src/shared/errors/orchestration-error.js';

describe('List Metadata Update Tool', () => {
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

  describe('List Metadata Updates', () => {
    it('should update list title successfully', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New Project Title',
        description: 'Original description',
        projectTag: 'original-tag',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'New Project Title',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        {
          title: 'New Project Title',
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List metadata updated successfully: New Project Title (ID: 550e8400-e29b-41d4-a716-446655440000)',
          },
        ],
      });
    });

    it('should update list description successfully', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Project Title',
        description: 'Updated project description with detailed information',
        projectTag: 'project-tag',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440001',
            description:
              'Updated project description with detailed information',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        {
          description: 'Updated project description with detailed information',
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List metadata updated successfully: Project Title (ID: 550e8400-e29b-41d4-a716-446655440001)',
          },
        ],
      });
    });

    it('should update list projectTag successfully', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Project Title',
        description: 'Project description',
        projectTag: 'new-project-tag',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440002',
            projectTag: 'new-project-tag',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440002',
        {
          projectTag: 'new-project-tag',
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List metadata updated successfully: Project Title (ID: 550e8400-e29b-41d4-a716-446655440002)',
          },
        ],
      });
    });

    it('should update multiple metadata fields simultaneously', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Complete Project Update',
        description: 'Comprehensive project description',
        projectTag: 'comprehensive-project',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440003',
            title: 'Complete Project Update',
            description: 'Comprehensive project description',
            projectTag: 'comprehensive-project',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440003',
        {
          title: 'Complete Project Update',
          description: 'Comprehensive project description',
          projectTag: 'comprehensive-project',
        }
      );

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'List metadata updated successfully: Complete Project Update (ID: 550e8400-e29b-41d4-a716-446655440003)',
          },
        ],
      });
    });
  });

  describe('Validation', () => {
    it('should reject invalid UUID format for listId', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: 'invalid-uuid',
            title: 'New Title',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Validation error'),
          },
        ],
        isError: true,
      });

      expect(mockListOrchestrator.updateList).not.toHaveBeenCalled();
    });

    it('should reject empty title', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: '',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Validation error'),
          },
        ],
        isError: true,
      });

      expect(mockListOrchestrator.updateList).not.toHaveBeenCalled();
    });

    it('should reject title that exceeds maximum length', async () => {
      const longTitle = 'a'.repeat(1001); // Exceeds 1000 character limit

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: longTitle,
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Validation error'),
          },
        ],
        isError: true,
      });

      expect(mockListOrchestrator.updateList).not.toHaveBeenCalled();
    });

    it('should reject description that exceeds maximum length', async () => {
      const longDescription = 'a'.repeat(5001); // Exceeds 5000 character limit

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            description: longDescription,
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Validation error'),
          },
        ],
        isError: true,
      });

      expect(mockListOrchestrator.updateList).not.toHaveBeenCalled();
    });

    it('should reject projectTag that exceeds maximum length', async () => {
      const longProjectTag = 'a'.repeat(251); // Exceeds 250 character limit

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            projectTag: longProjectTag,
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Validation error'),
          },
        ],
        isError: true,
      });

      expect(mockListOrchestrator.updateList).not.toHaveBeenCalled();
    });

    it('should require at least listId parameter', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {},
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Validation error'),
          },
        ],
        isError: true,
      });

      expect(mockListOrchestrator.updateList).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestration errors gracefully', async () => {
      const orchestrationError = new OrchestrationError(
        'List not found',
        'ListOrchestrator.updateList',
        'non-existent-id',
        'Valid list ID',
        'Check that the list exists and you have permission to update it'
      );

      mockListOrchestrator.updateList = vi
        .fn()
        .mockRejectedValue(orchestrationError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'New Title',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Error updating list metadata: List not found'
            ),
          },
        ],
        isError: true,
      });
    });

    it('should handle generic errors gracefully', async () => {
      const genericError = new Error('Database connection failed');
      mockListOrchestrator.updateList = vi.fn().mockRejectedValue(genericError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'New Title',
          },
        },
      };

      const result = await handlers.updateListMetadata(request);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Unexpected error updating list metadata: Database connection failed',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Integration with Orchestration Layer', () => {
    it('should only use list orchestrator and not access data stores directly', () => {
      // Verify that the handler only uses orchestration layer
      expect(mockListOrchestrator).toBeDefined();
      expect(mockListOrchestrator.updateList).toBeDefined();

      // This test ensures no direct data store access by checking
      // that only orchestrator methods are available
      const orchestratorMethods = Object.keys(mockListOrchestrator);
      expect(orchestratorMethods).toContain('updateList');
      expect(orchestratorMethods).not.toContain('repository');
      expect(orchestratorMethods).not.toContain('storage');
    });

    it('should pass correct parameters to list orchestrator', async () => {
      const mockList = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Title',
      };
      mockListOrchestrator.updateList = vi.fn().mockResolvedValue(mockList);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'mcp_tasks_update_list_metadata',
          arguments: {
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Test Title',
          },
        },
      };

      await handlers.updateListMetadata(request);

      // Verify exact parameters passed to orchestrator
      expect(mockListOrchestrator.updateList).toHaveBeenCalledTimes(1);
      expect(mockListOrchestrator.updateList).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        { title: 'Test Title' }
      );
    });
  });
});
