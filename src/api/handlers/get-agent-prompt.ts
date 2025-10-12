/**
 * MCP handler for getting rendered agent prompts
 *
 * Handles the get_agent_prompt tool request to retrieve and render
 * agent prompt templates for tasks with variable substitution.
 */

import { z } from 'zod';

import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { logger } from '../../shared/utils/logger.js';
import { TemplateEngine } from '../../shared/utils/template-engine.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

/**
 * Validation schema for get agent prompt request parameters
 * Ensures list and task IDs are valid UUIDs and validates optional parameters
 */
const GetAgentPromptSchema = z.object({
  listId: z.string().uuid('List ID must be a valid UUID'),
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  useDefault: z.boolean().optional().default(false),
});

/**
 * Response interface for agent prompt
 */
interface AgentPromptResponse {
  taskId: string;
  listId: string;
  hasCustomTemplate: boolean;
  prompt: string;
  renderTime: number;
  variablesUsed: string[];
  errors?: string[];
}

/**
 * Handles MCP get_agent_prompt tool requests
 *
 * Retrieves and renders the agent prompt template for a specific task,
 * with support for variable substitution and fallback to default templates.
 *
 * @param request - The MCP call tool request containing prompt retrieval parameters
 * @param todoListManager - The todo list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with rendered prompt or error
 */
export async function handleGetAgentPrompt(
  request: CallToolRequest,
  todoListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing get_agent_prompt request', {
      params: request.params?.arguments,
    });

    const args = GetAgentPromptSchema.parse(request.params?.arguments);

    // Get the todo list and task
    const todoList = await todoListManager.getTaskList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!todoList) {
      throw new Error(`Task list not found: ${args.listId}`);
    }

    const task = todoList.items.find((item: Task) => item.id === args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    let prompt = '';
    let renderTime = 0;
    let variablesUsed: string[] = [];
    let errors: string[] | undefined;
    let hasCustomTemplate = false;

    // Check if task has a custom template
    if (task.agentPromptTemplate) {
      hasCustomTemplate = true;
      const context = TemplateEngine.createTemplateContext(task, todoList);
      const result = await TemplateEngine.renderTemplate(
        task.agentPromptTemplate,
        context
      );

      prompt = result.rendered;
      renderTime = result.renderTime;
      variablesUsed = result.variablesUsed;
      errors = result.errors;
    } else if (args.useDefault) {
      // Use default template
      const defaultTemplate = getDefaultTemplate();
      const context = TemplateEngine.createTemplateContext(task, todoList);
      const result = await TemplateEngine.renderTemplate(
        defaultTemplate,
        context
      );

      prompt = result.rendered;
      renderTime = result.renderTime;
      variablesUsed = result.variablesUsed;
      errors = result.errors;
    } else {
      // No template available
      prompt = '';
      renderTime = 0;
      variablesUsed = [];
    }

    const response: AgentPromptResponse = {
      taskId: args.taskId,
      listId: args.listId,
      hasCustomTemplate,
      prompt,
      renderTime,
      variablesUsed,
      ...(errors && errors.length > 0 && { errors }),
    };

    logger.info('Agent prompt retrieved successfully', {
      listId: args.listId,
      taskId: args.taskId,
      hasCustomTemplate,
      renderTime,
      variablesUsed: variablesUsed.length,
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
    // Use error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter(
      'get_agent_prompt',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}

/**
 * Default template for agent prompts
 * Used when no custom template is set and useDefault is true
 */
function getDefaultTemplate(): string {
  return `# Task: {{task.title}}

## Description
{{task.description}}

## Status
Current status: {{task.status}}
Priority: {{task.priority}}

## Context
List: {{list.title}}
Project: {{list.projectTag}}

## Dependencies
{{task.dependencies}}

## Tags
{{task.tags}}

## Instructions
Please work on this task according to the requirements and context provided above.`;
}
