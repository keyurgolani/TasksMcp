/**
 * MCP handler for updating todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type { TodoListManager } from '../core/todo-list-manager.js';
import { TaskStatus, Priority } from '../types/todo.js';
import { logger } from '../utils/logger.js';

const UpdateTodoListSchema = z.object({
  listId: z.string().uuid(),
  action: z.enum([
    'add_item',
    'update_item',
    'remove_item',
    'update_status',
    'reorder',
  ]),
  itemData: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      priority: z.number().int().min(1).max(5).optional(),
      status: z
        .enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
        .optional(),
      estimatedDuration: z.number().int().positive().optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
      dependencies: z.array(z.string().uuid()).max(50).optional(),
    })
    .optional(),
  itemId: z.string().uuid().optional(),
  newOrder: z.array(z.string().uuid()).optional(),
});

export async function handleUpdateTodoList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing update_todo_list request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = UpdateTodoListSchema.parse(request.params?.arguments);

    // Validate required parameters based on action
    validateActionParameters(args);

    // Convert and prepare the update input
    const updateInput = prepareUpdateInput(args);

    // Update the todo list
    const result = await todoListManager.updateTodoList(updateInput);

    logger.info('Todo list updated successfully via MCP', {
      id: result.id,
      action: args.action,
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
    logger.error('Failed to update todo list via MCP', { error });

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

function validateActionParameters(
  args: z.infer<typeof UpdateTodoListSchema>
): void {
  switch (args.action) {
    case 'add_item':
      if (
        args.itemData?.title === undefined ||
        args.itemData.title.length === 0
      ) {
        throw new Error('itemData.title is required for add_item action');
      }
      break;

    case 'update_item':
    case 'remove_item':
    case 'update_status':
      if (args.itemId === undefined || args.itemId.length === 0) {
        throw new Error(`itemId is required for ${args.action} action`);
      }
      if (
        args.action === 'update_status' &&
        (args.itemData?.status === undefined ||
          args.itemData.status.length === 0)
      ) {
        throw new Error('itemData.status is required for update_status action');
      }
      break;

    case 'reorder':
      if (args.newOrder === undefined || args.newOrder.length === 0) {
        throw new Error('newOrder is required for reorder action');
      }
      break;

    default:
      throw new Error(`Unknown action: ${String(args.action)}`);
  }
}

function prepareUpdateInput(
  args: z.infer<typeof UpdateTodoListSchema>
): Parameters<TodoListManager['updateTodoList']>[0] {
  const updateInput: Parameters<TodoListManager['updateTodoList']>[0] = {
    listId: args.listId,
    action: args.action,
  };

  if (args.itemId !== undefined) {
    updateInput.itemId = args.itemId;
  }

  if (args.newOrder) {
    updateInput.newOrder = args.newOrder;
  }

  if (args.itemData) {
    updateInput.itemData = {};

    if (args.itemData.title !== undefined) {
      updateInput.itemData.title = args.itemData.title;
    }
    if (args.itemData.description !== undefined) {
      updateInput.itemData.description = args.itemData.description;
    }
    if (args.itemData.priority !== undefined) {
      updateInput.itemData.priority = args.itemData.priority as Priority;
    }
    if (args.itemData.status !== undefined) {
      updateInput.itemData.status = args.itemData.status as TaskStatus;
    }
    if (args.itemData.estimatedDuration !== undefined) {
      updateInput.itemData.estimatedDuration = args.itemData.estimatedDuration;
    }
    if (args.itemData.tags !== undefined) {
      updateInput.itemData.tags = args.itemData.tags;
    }
    if (args.itemData.dependencies !== undefined) {
      updateInput.itemData.dependencies = args.itemData.dependencies;
    }
  }

  return updateInput;
}
