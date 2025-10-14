/**
 * Consolidated MCP Handlers
 * Unified handlers that interact exclusively with the Core Orchestration domain
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { AgentPromptOrchestrator } from '../../../core/orchestration/interfaces/agent-prompt-orchestrator.js';
import { DependencyOrchestrator } from '../../../core/orchestration/interfaces/dependency-orchestrator.js';
import { ListOrchestrator } from '../../../core/orchestration/interfaces/list-orchestrator.js';
import { SearchOrchestrator } from '../../../core/orchestration/interfaces/search-orchestrator.js';
import { TaskOrchestrator } from '../../../core/orchestration/interfaces/task-orchestrator.js';
import { Priority, TaskStatus } from '../../../domain/models/task.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import {
  CreateListData,
  UpdateListData,
} from '../../../shared/types/list-operations.js';
import {
  CreateTaskData,
  UpdateTaskData,
} from '../../../shared/types/task-operations.js';
import { MCP_TOOL_SCHEMAS } from '../validation/mcp-schemas.js';
import { validateMcpToolParameters } from '../validation/mcp-validation.js';

/**
 * Consolidated MCP Handlers Class
 * All handlers use orchestration layer exclusively - no direct data store access
 */
export class ConsolidatedMcpHandlers {
  constructor(
    private listOrchestrator: ListOrchestrator,
    private taskOrchestrator: TaskOrchestrator,
    private dependencyOrchestrator: DependencyOrchestrator,
    private searchOrchestrator: SearchOrchestrator,
    private agentPromptOrchestrator: AgentPromptOrchestrator
  ) {}

  // ============================================================================
  // List Management Handlers
  // ============================================================================

  async createList(request: CallToolRequest): Promise<unknown> {
    // Validate parameters
    const validation = validateMcpToolParameters(
      request,
      MCP_TOOL_SCHEMAS['mcp_tasks_create_list']
    );
    if (!validation.isValid) {
      return {
        content: [{ type: 'text', text: validation.error }],
        isError: true,
      };
    }

    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { title, description, projectTag } = params;

      const listData: CreateListData = {
        title: title as string,
        ...(description !== undefined && {
          description: description as string,
        }),
        ...(projectTag !== undefined && { projectTag: projectTag as string }),
      };

      const list = await this.listOrchestrator.createList(listData);

      return {
        content: [
          {
            type: 'text',
            text: `List created successfully: ${list.title} (ID: ${list.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'creating list');
    }
  }

  async getList(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { listId, includeCompleted = true } = params;

      const list = await this.listOrchestrator.getList(
        listId as string,
        includeCompleted as boolean
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(list, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'retrieving list');
    }
  }

  async listAllLists(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { projectTag, limit = 50 } = params;

      const filters: { projectTag?: string; limit?: number } = {};
      if (projectTag !== undefined) {
        filters.projectTag = projectTag as string;
      }
      if (limit !== undefined) {
        filters.limit = limit as number;
      }

      const lists = await this.listOrchestrator.getAllLists(filters);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(lists, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'listing all lists');
    }
  }

  async deleteList(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { listId } = params;

      await this.listOrchestrator.deleteList(listId as string);

      return {
        content: [
          {
            type: 'text',
            text: `List deleted successfully (ID: ${listId})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'deleting list');
    }
  }

  async updateListMetadata(request: CallToolRequest): Promise<unknown> {
    // Validate parameters
    const validation = validateMcpToolParameters(
      request,
      MCP_TOOL_SCHEMAS['mcp_tasks_update_list_metadata']
    );
    if (!validation.isValid) {
      return {
        content: [{ type: 'text', text: validation.error }],
        isError: true,
      };
    }

    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { listId, title, description, projectTag } = params;

      const updateData: UpdateListData = {
        ...(title !== undefined && { title: title as string }),
        ...(description !== undefined && {
          description: description as string,
        }),
        ...(projectTag !== undefined && { projectTag: projectTag as string }),
      };

      const list = await this.listOrchestrator.updateList(
        listId as string,
        updateData
      );

      return {
        content: [
          {
            type: 'text',
            text: `List metadata updated successfully: ${list.title} (ID: ${list.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'updating list metadata');
    }
  }

  // ============================================================================
  // Task Management Handlers
  // ============================================================================

  async addTask(request: CallToolRequest): Promise<unknown> {
    // Validate parameters
    const validation = validateMcpToolParameters(
      request,
      MCP_TOOL_SCHEMAS['mcp_tasks_add_task']
    );
    if (!validation.isValid) {
      return {
        content: [{ type: 'text', text: validation.error }],
        isError: true,
      };
    }

    try {
      const params = request.params.arguments as Record<string, unknown>;
      const {
        listId,
        title,
        description,
        priority,
        estimatedDuration,
        tags,
        dependencies,
        exitCriteria,
        agentPromptTemplate,
      } = params;

      const taskData: CreateTaskData = {
        listId: listId as string,
        title: title as string,
        ...(description !== undefined && {
          description: description as string,
        }),
        ...(priority !== undefined && { priority: priority as Priority }),
        ...(estimatedDuration !== undefined && {
          estimatedDuration: estimatedDuration as number,
        }),
        ...(tags !== undefined && { tags: tags as string[] }),
        ...(dependencies !== undefined && {
          dependencies: dependencies as string[],
        }),
        ...(agentPromptTemplate !== undefined && {
          agentPromptTemplate: agentPromptTemplate as string,
        }),
        ...(exitCriteria !== undefined && {
          exitCriteria: (exitCriteria as string[]).map((desc: string) => ({
            id: crypto.randomUUID(),
            description: desc,
            isMet: false,
            updatedAt: new Date(),
          })),
        }),
      };

      const task = await this.taskOrchestrator.createTask(taskData);

      return {
        content: [
          {
            type: 'text',
            text: `Task created successfully: ${task.title} (ID: ${task.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'creating task');
    }
  }

  async updateTask(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const {
        taskId,
        title,
        description,
        estimatedDuration,
        exitCriteria,
        agentPromptTemplate,
      } = params;

      const updateData: UpdateTaskData = {
        ...(title !== undefined && { title: title as string }),
        ...(description !== undefined && {
          description: description as string,
        }),
        ...(estimatedDuration !== undefined && {
          estimatedDuration: estimatedDuration as number,
        }),
        ...(agentPromptTemplate !== undefined && {
          agentPromptTemplate: agentPromptTemplate as string,
        }),
        ...(exitCriteria !== undefined && {
          exitCriteria: (exitCriteria as string[]).map((desc: string) => ({
            id: crypto.randomUUID(),
            description: desc,
            isMet: false,
            updatedAt: new Date(),
          })),
        }),
      };

      const task = await this.taskOrchestrator.updateTask(
        taskId as string,
        updateData
      );

      return {
        content: [
          {
            type: 'text',
            text: `Task updated successfully: ${task.title} (ID: ${task.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'updating task');
    }
  }

  async completeTask(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId } = params;

      const task = await this.taskOrchestrator.completeTask(taskId as string);

      return {
        content: [
          {
            type: 'text',
            text: `Task completed successfully: ${task.title} (ID: ${task.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'completing task');
    }
  }

  async removeTask(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId } = params;

      await this.taskOrchestrator.deleteTask(taskId as string);

      return {
        content: [
          {
            type: 'text',
            text: `Task removed successfully (ID: ${taskId})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'removing task');
    }
  }

  async setTaskPriority(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, priority } = params;

      const task = await this.taskOrchestrator.setTaskPriority(
        taskId as string,
        priority as Priority
      );

      return {
        content: [
          {
            type: 'text',
            text: `Task priority updated successfully: ${task.title} (Priority: ${task.priority})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'setting task priority');
    }
  }

  async addTaskTags(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, tags } = params;

      const task = await this.taskOrchestrator.addTaskTags(
        taskId as string,
        tags as string[]
      );

      return {
        content: [
          {
            type: 'text',
            text: `Tags added successfully to task: ${task.title} (Tags: ${task.tags.join(', ')})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'adding task tags');
    }
  }

  async removeTaskTags(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, tags } = params;

      const task = await this.taskOrchestrator.removeTaskTags(
        taskId as string,
        tags as string[]
      );

      return {
        content: [
          {
            type: 'text',
            text: `Tags removed successfully from task: ${task.title} (Remaining tags: ${task.tags.join(', ')})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'removing task tags');
    }
  }

  async setTaskStatus(request: CallToolRequest): Promise<unknown> {
    // Validate parameters
    const validation = validateMcpToolParameters(
      request,
      MCP_TOOL_SCHEMAS['mcp_tasks_set_task_status']
    );
    if (!validation.isValid) {
      return {
        content: [{ type: 'text', text: validation.error }],
        isError: true,
      };
    }

    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, status } = params;

      const task = await this.taskOrchestrator.setTaskStatus(
        taskId as string,
        status as TaskStatus
      );

      return {
        content: [
          {
            type: 'text',
            text: `Task status updated successfully: ${task.title} (Status: ${task.status})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'setting task status');
    }
  }

  // ============================================================================
  // Search and Display Handlers
  // ============================================================================

  async searchTool(request: CallToolRequest): Promise<unknown> {
    // Validate parameters
    const validation = validateMcpToolParameters(
      request,
      MCP_TOOL_SCHEMAS['mcp_tasks_search_tool']
    );
    if (!validation.isValid) {
      return {
        content: [{ type: 'text', text: validation.error }],
        isError: true,
      };
    }

    try {
      const params = request.params.arguments as Record<string, unknown>;

      const searchResult = await this.searchOrchestrator.searchTasks(params);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(searchResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'searching tasks');
    }
  }

  async showTasks(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const {
        listId,
        format = 'detailed',
        groupBy = 'status',
        includeCompleted = true,
      } = params;

      const tasks = await this.searchOrchestrator.getTasksForDisplay(
        listId as string,
        {
          format: format as string,
          groupBy: groupBy as string,
          includeCompleted: includeCompleted as boolean,
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'displaying tasks');
    }
  }

  // ============================================================================
  // Dependency Management Handlers
  // ============================================================================

  async setTaskDependencies(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, dependencyIds } = params;

      await this.dependencyOrchestrator.setTaskDependencies(
        taskId as string,
        dependencyIds as string[]
      );

      return {
        content: [
          {
            type: 'text',
            text: `Task dependencies updated successfully (Task ID: ${taskId})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'setting task dependencies');
    }
  }

  async getReadyTasks(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { listId, limit = 20 } = params;

      const readyTasks = await this.dependencyOrchestrator.getReadyTasks(
        listId as string,
        limit as number
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(readyTasks, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'getting ready tasks');
    }
  }

  async analyzeTaskDependencies(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { listId, format = 'analysis', dagStyle = 'ascii' } = params;

      const analysis = await this.dependencyOrchestrator.analyzeDependencies(
        listId as string,
        {
          format: format as string,
          dagStyle: dagStyle as string,
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'analyzing task dependencies');
    }
  }

  // ============================================================================
  // Exit Criteria Management Handlers
  // ============================================================================

  async setTaskExitCriteria(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, exitCriteria } = params;

      // Default to empty array if exitCriteria is not provided (clears all exit criteria)
      const criteriaArray = (exitCriteria as string[]) ?? [];

      const task = await this.taskOrchestrator.setTaskExitCriteria(
        taskId as string,
        criteriaArray
      );

      return {
        content: [
          {
            type: 'text',
            text: `Exit criteria updated successfully for task: ${task.title} (ID: ${task.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'setting task exit criteria');
    }
  }

  async updateExitCriteria(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, criteriaId, isMet, notes } = params;

      const task = await this.taskOrchestrator.updateExitCriteria(
        taskId as string,
        criteriaId as string,
        {
          ...(isMet !== undefined && { isMet: isMet as boolean }),
          ...(notes !== undefined && { notes: notes as string }),
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Exit criteria updated successfully for task: ${task.title} (ID: ${task.id})`,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'updating exit criteria');
    }
  }

  // ============================================================================
  // Agent Prompt Management Handlers
  // ============================================================================

  async getAgentPrompt(request: CallToolRequest): Promise<unknown> {
    try {
      const params = request.params.arguments as Record<string, unknown>;
      const { taskId, useDefault = false } = params;

      const prompt = await this.agentPromptOrchestrator.getAgentPrompt(
        taskId as string,
        useDefault as boolean
      );

      return {
        content: [
          {
            type: 'text',
            text: prompt,
          },
        ],
      };
    } catch (error) {
      return this.handleError(error, 'getting agent prompt');
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleError(error: unknown, operation: string): unknown {
    if (error instanceof OrchestrationError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error ${operation}: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
          },
        ],
        isError: true,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Unexpected error ${operation}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
