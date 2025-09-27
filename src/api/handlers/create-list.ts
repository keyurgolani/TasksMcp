/**
 * MCP handler for creating todo lists
 * Handles the create_list tool request with validation and error handling
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { ListResponse } from '../../shared/types/mcp-types.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

/**
 * Validation schema for create list request parameters
 * Ensures title is required and within length limits, with optional description and project tag
 */
const CreateListSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  projectTag: z.string().max(50).optional(),
});

/**
 * Handles MCP create_list tool requests
 * Creates a new todo list with the provided title, description, and project tag
 * 
 * @param request - The MCP call tool request containing list creation parameters
 * @param todoListManager - The todo list manager instance for list operations
 * @returns Promise<CallToolResult> - MCP response with created list details or error
 */
export async function handleCreateList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing create_list request', {
      params: request.params?.arguments,
    });

    const args = CreateListSchema.parse(request.params?.arguments);
    const createInput: any = {
      title: args.title,
    };
    
    if (args.description) {
      createInput.description = args.description;
    }
    
    if (args.projectTag) {
      createInput.projectTag = args.projectTag;
      createInput.context = args.projectTag;
    }

    const result = await todoListManager.createTodoList(createInput);

    // Format response
    const response: ListResponse = {
      id: result.id,
      title: result.title,
      description: result.description,
      taskCount: result.totalItems,
      completedCount: result.completedItems,
      progress: result.progress,
      lastUpdated: result.updatedAt.toISOString(),
    };

    // Only include projectTag if it's defined and not empty
    if (result.projectTag) {
      response.projectTag = result.projectTag;
    }

    logger.info('Todo list created successfully', {
      id: result.id,
      title: result.title,
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
    // Use error formatting with list management configuration
    const formatError = createHandlerErrorFormatter('create_list', ERROR_CONFIGS.listManagement);
    return formatError(error, request.params?.arguments);
  }
}