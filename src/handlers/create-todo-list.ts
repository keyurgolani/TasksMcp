/**
 * MCP handler for creating todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type { TodoListManager } from '../core/todo-list-manager.js';
import { Priority } from '../types/todo.js';
import { logger } from '../utils/logger.js';

const CreateTodoListSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        priority: z.number().int().min(1).max(5).optional(),
        estimatedDuration: z.number().int().positive().optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
      })
    )
    .max(100)
    .optional(),
  context: z.string().max(200).optional(),
});

export async function handleCreateTodoList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing create_todo_list request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = CreateTodoListSchema.parse(request.params?.arguments);

    // Convert priority numbers to Priority enum values
    const tasks = args.tasks?.map(task => {
      const mappedTask: {
        title: string;
        description?: string;
        priority?: Priority;
        estimatedDuration?: number;
        tags?: string[];
      } = {
        title: task.title,
      };

      if (task.description !== undefined) {
        mappedTask.description = task.description;
      }
      if (task.priority !== undefined) {
        mappedTask.priority = task.priority as Priority;
      }
      if (task.estimatedDuration !== undefined) {
        mappedTask.estimatedDuration = task.estimatedDuration;
      }
      if (task.tags !== undefined) {
        mappedTask.tags = task.tags;
      }

      return mappedTask;
    });

    // Create the todo list
    const createInput: {
      title: string;
      description?: string;
      tasks?: Array<{
        title: string;
        description?: string;
        priority?: Priority;
        estimatedDuration?: number;
        tags?: string[];
      }>;
      context?: string;
    } = {
      title: args.title,
    };

    if (args.description !== undefined) {
      createInput.description = args.description;
    }
    if (tasks !== undefined) {
      createInput.tasks = tasks;
    }
    if (args.context !== undefined) {
      createInput.context = args.context;
    }

    const result = await todoListManager.createTodoList(createInput);

    logger.info('Todo list created successfully via MCP', {
      id: result.id,
      title: result.title,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to create todo list via MCP', { error });

    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
}
