/**
 * MCP task handlers
 * Handles task-related MCP tool calls using orchestration layer
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { TaskOrchestrator } from '../../../core/orchestration/interfaces/task-orchestrator';
import { Priority } from '../../../domain/models/task';
import { OrchestrationError } from '../../../shared/errors/orchestration-error';
import {
  CreateTaskData,
  UpdateTaskData,
} from '../../../shared/types/task-operations';

export class TaskHandlers {
  constructor(private taskOrchestrator: TaskOrchestrator) {}

  async addTask(request: CallToolRequest): Promise<unknown> {
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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating task: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error creating task: ${errorMessage}`,
          },
        ],
        isError: true,
      };
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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating task: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error updating task: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async completeTask(request: CallToolRequest): Promise<unknown> {
    try {
      const { taskId } = request.params.arguments as Record<string, unknown>;

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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error completing task: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error completing task: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async removeTask(request: CallToolRequest): Promise<unknown> {
    try {
      const { taskId } = request.params.arguments as Record<string, unknown>;

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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error removing task: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error removing task: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async setTaskPriority(request: CallToolRequest): Promise<unknown> {
    try {
      const { taskId, priority } = request.params.arguments as Record<
        string,
        unknown
      >;

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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting task priority: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error setting task priority: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async addTaskTags(request: CallToolRequest): Promise<unknown> {
    try {
      const { taskId, tags } = request.params.arguments as Record<
        string,
        unknown
      >;

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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error adding task tags: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error adding task tags: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async removeTaskTags(request: CallToolRequest): Promise<unknown> {
    try {
      const { taskId, tags } = request.params.arguments as Record<
        string,
        unknown
      >;

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
      if (error instanceof OrchestrationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Error removing task tags: ${error.message}\nContext: ${error.context}\nGuidance: ${error.actionableGuidance}`,
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
            text: `Unexpected error removing task tags: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}
