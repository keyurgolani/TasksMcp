/**
 * MCP handler for bulk task operations
 * Handles batch operations on multiple tasks for improved efficiency
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

const BulkTaskOperationSchema = z.object({
  listId: z.string().uuid(),
  operation: z.enum(['create', 'update', 'delete', 'complete', 'set_priority']),
  tasks: z.array(z.object({
    id: z.string().uuid().optional(), // Required for update/delete/complete operations
    title: z.string().min(1).max(1000).optional(),
    description: z.string().max(5000).optional(),
    priority: z.number().min(1).max(5).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    estimatedDuration: z.number().min(1).optional(),
  })).min(1).max(100), // Allow up to 100 operations at once
});

export async function handleBulkTaskOperations(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing bulk_task_operations request', {
      params: request.params?.arguments,
    });

    const args = BulkTaskOperationSchema.parse(request.params?.arguments);
    
    // Validate list exists
    const currentList = await todoListManager.getTodoList({ listId: args.listId });
    if (!currentList) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Todo list with ID ${args.listId} not found`,
          },
        ],
        isError: true,
      };
    }

    const results = [];
    const errors = [];
    
    // Process each task operation
    for (let i = 0; i < args.tasks.length; i++) {
      const task = args.tasks[i];
      
      try {
        switch (args.operation) {
          case 'create':
            if (!task?.title) {
              throw new Error(`Task ${i}: title is required for create operation`);
            }
            await todoListManager.updateTodoList({
              listId: args.listId,
              action: 'add_item',
              itemData: {
                title: task.title,
                ...(task.description && { description: task.description }),
                priority: task.priority || 3,
                tags: task.tags || [],
                ...(task.estimatedDuration && { estimatedDuration: task.estimatedDuration }),
              },
            });
            results.push({ operation: 'create', index: i, success: true, title: task.title });
            break;
            
          case 'update':
            if (!task?.id) {
              throw new Error(`Task ${i}: id is required for update operation`);
            }
            await todoListManager.updateTodoList({
              listId: args.listId,
              action: 'update_item',
              itemId: task.id,
              itemData: {
                ...(task.title && { title: task.title }),
                ...(task.description !== undefined && { description: task.description }),
                ...(task.priority && { priority: task.priority }),
                ...(task.tags && { tags: task.tags }),
                ...(task.estimatedDuration && { estimatedDuration: task.estimatedDuration }),
              },
            });
            results.push({ operation: 'update', index: i, success: true, id: task.id });
            break;
            
          case 'delete':
            if (!task?.id) {
              throw new Error(`Task ${i}: id is required for delete operation`);
            }
            await todoListManager.updateTodoList({
              listId: args.listId,
              action: 'remove_item',
              itemId: task.id,
            });
            results.push({ operation: 'delete', index: i, success: true, id: task.id });
            break;
            
          case 'complete':
            if (!task?.id) {
              throw new Error(`Task ${i}: id is required for complete operation`);
            }
            await todoListManager.updateTodoList({
              listId: args.listId,
              action: 'update_status',
              itemId: task.id,
              itemData: { status: 'completed' as any },
            });
            results.push({ operation: 'complete', index: i, success: true, id: task.id });
            break;
            
          case 'set_priority':
            if (!task?.id || !task?.priority) {
              throw new Error(`Task ${i}: id and priority are required for set_priority operation`);
            }
            await todoListManager.updateTodoList({
              listId: args.listId,
              action: 'update_item',
              itemId: task.id,
              itemData: { priority: task.priority },
            });
            results.push({ operation: 'set_priority', index: i, success: true, id: task.id, priority: task.priority });
            break;
            
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ index: i, error: errorMessage, task });
        results.push({ operation: args.operation, index: i, success: false, error: errorMessage });
      }
    }

    const response = {
      operation: args.operation,
      listId: args.listId,
      totalTasks: args.tasks.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };

    logger.info('Bulk task operations completed', {
      operation: args.operation,
      listId: args.listId,
      totalTasks: args.tasks.length,
      successful: response.successful,
      failed: response.failed,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const formatError = createHandlerErrorFormatter('bulk_task_operations', ERROR_CONFIGS.advanced);
    return formatError(error, request.params?.arguments);
  }
}