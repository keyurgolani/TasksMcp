/**
 * MCP Tool Schema Definitions
 * 
 * This file contains schema definitions for the MCP tools.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Parameter Type Definitions
// ============================================================================

export interface CreateListParams {
  title: string;
  description?: string;
  projectTag?: string;
}

export interface GetListParams {
  listId: string;
  includeCompleted?: boolean;
}

export interface ListAllListsParams {
  projectTag?: string;
  includeArchived?: boolean;
  limit?: number;
}

export interface DeleteListParams {
  listId: string;
  permanent?: boolean;
}

export interface AddTaskParams {
  listId: string;
  title: string;
  description?: string;
  priority?: number;
  tags?: string[];
  estimatedDuration?: number;
}

export interface UpdateTaskParams {
  listId: string;
  taskId: string;
  title?: string;
  description?: string;
  estimatedDuration?: number;
}

export interface RemoveTaskParams {
  listId: string;
  taskId: string;
}

export interface CompleteTaskParams {
  listId: string;
  taskId: string;
}

export interface SetTaskPriorityParams {
  listId: string;
  taskId: string;
  priority: number;
}

export interface AddTaskTagsParams {
  listId: string;
  taskId: string;
  tags: string[];
}

export interface SearchTasksParams {
  query: string;
  listId?: string;
  limit?: number;
}

export interface FilterTasksParams {
  listId: string;
  status?: string;
  priority?: number;
  tag?: string;
}

export interface ShowTasksParams {
  listId: string;
  format?: 'compact' | 'detailed' | 'summary';
  groupBy?: 'status' | 'priority' | 'none';
  includeCompleted?: boolean;
}

export interface AnalyzeTaskParams {
  taskDescription: string;
  context?: string;
  maxSuggestions?: number;
}

export interface GetTaskSuggestionsParams {
  listId: string;
  style?: 'detailed' | 'concise' | 'technical' | 'business';
  maxSuggestions?: number;
}

// ============================================================================
// Tool Schema Definitions
// ============================================================================

export const MCP_TOOLS: Tool[] = [
  // List Management Tools (4 tools)
  {
    name: 'create_list',
    description: 'Create a new todo list with simple parameters',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the todo list',
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'Optional description of the todo list',
          maxLength: 1000,
        },
        projectTag: {
          type: 'string',
          description: 'Optional project tag for organization',
          maxLength: 50,
        },
      },
      required: ['title'],
    },
  },

  {
    name: 'get_list',
    description: 'Retrieve a specific todo list by ID',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list to retrieve',
          format: 'uuid',
        },
        includeCompleted: {
          type: 'boolean',
          description: 'Whether to include completed tasks (default: true)',
          default: true,
        },
      },
      required: ['listId'],
    },
  },

  {
    name: 'list_all_lists',
    description: 'Get all todo lists with basic information',
    inputSchema: {
      type: 'object',
      properties: {
        projectTag: {
          type: 'string',
          description: 'Filter by project tag',
          maxLength: 50,
        },
        includeArchived: {
          type: 'boolean',
          description: 'Whether to include archived lists (default: false)',
          default: false,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of lists to return',
          minimum: 1,
          maximum: 100,
          default: 50,
        },
      },
    },
  },

  {
    name: 'delete_list',
    description: 'Delete or archive a todo list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list to delete',
          format: 'uuid',
        },
        permanent: {
          type: 'boolean',
          description: 'Whether to permanently delete (true) or archive (false)',
          default: false,
        },
      },
      required: ['listId'],
    },
  },

  // Task Management Tools (6 tools)
  {
    name: 'add_task',
    description: 'Add a new task to a todo list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        title: {
          type: 'string',
          description: 'Task title',
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'Task description',
          maxLength: 1000,
        },
        priority: {
          type: 'number',
          description: 'Task priority (1-5, where 5 is highest)',
          minimum: 1,
          maximum: 5,
          default: 3,
        },
        tags: {
          type: 'array',
          description: 'Task tags',
          items: {
            type: 'string',
            maxLength: 50,
          },
          maxItems: 10,
        },
        estimatedDuration: {
          type: 'number',
          description: 'Estimated duration in minutes',
          minimum: 1,
        },
      },
      required: ['listId', 'title'],
    },
  },

  {
    name: 'update_task',
    description: 'Update basic task properties',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to update',
          format: 'uuid',
        },
        title: {
          type: 'string',
          description: 'New task title',
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'New task description',
          maxLength: 1000,
        },
        estimatedDuration: {
          type: 'number',
          description: 'New estimated duration in minutes',
          minimum: 1,
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'remove_task',
    description: 'Remove a task from a todo list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to remove',
          format: 'uuid',
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'complete_task',
    description: 'Mark a task as completed',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to complete',
          format: 'uuid',
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'set_task_priority',
    description: 'Change task priority',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task',
          format: 'uuid',
        },
        priority: {
          type: 'number',
          description: 'New priority (1-5, where 5 is highest)',
          minimum: 1,
          maximum: 5,
        },
      },
      required: ['listId', 'taskId', 'priority'],
    },
  },

  {
    name: 'add_task_tags',
    description: 'Add tags to a task',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task',
          format: 'uuid',
        },
        tags: {
          type: 'array',
          description: 'Tags to add to the task',
          items: {
            type: 'string',
            maxLength: 50,
          },
          minItems: 1,
          maxItems: 10,
        },
      },
      required: ['listId', 'taskId', 'tags'],
    },
  },

  // Search & Display Tools (3 tools)
  {
    name: 'search_tasks',
    description: 'Search tasks by text query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text to search for in task titles and descriptions',
          minLength: 1,
          maxLength: 200,
        },
        listId: {
          type: 'string',
          description: 'Optional: limit search to specific list',
          format: 'uuid',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      required: ['query'],
    },
  },

  {
    name: 'filter_tasks',
    description: 'Filter tasks by specific criteria',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list to filter',
          format: 'uuid',
        },
        status: {
          type: 'string',
          description: 'Filter by task status',
          enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
        },
        priority: {
          type: 'number',
          description: 'Filter by priority level',
          minimum: 1,
          maximum: 5,
        },
        tag: {
          type: 'string',
          description: 'Filter by specific tag',
          maxLength: 50,
        },
      },
      required: ['listId'],
    },
  },

  {
    name: 'show_tasks',
    description: 'Display tasks in formatted output',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list to display',
          format: 'uuid',
        },
        format: {
          type: 'string',
          description: 'Display format style',
          enum: ['compact', 'detailed', 'summary'],
          default: 'detailed',
        },
        groupBy: {
          type: 'string',
          description: 'How to group the tasks',
          enum: ['status', 'priority', 'none'],
          default: 'status',
        },
        includeCompleted: {
          type: 'boolean',
          description: 'Whether to include completed tasks',
          default: true,
        },
      },
      required: ['listId'],
    },
  },

  // Advanced Features Tools (2 tools)
  {
    name: 'analyze_task',
    description: 'Analyze task complexity and get suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        taskDescription: {
          type: 'string',
          description: 'Description of the task to analyze',
          minLength: 1,
          maxLength: 2000,
        },
        context: {
          type: 'string',
          description: 'Optional context or project information',
          maxLength: 200,
        },
        maxSuggestions: {
          type: 'number',
          description: 'Maximum number of suggestions to return',
          minimum: 1,
          maximum: 10,
          default: 5,
        },
      },
      required: ['taskDescription'],
    },
  },

  {
    name: 'get_task_suggestions',
    description: 'Get AI-generated task suggestions for a list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list',
          format: 'uuid',
        },
        style: {
          type: 'string',
          description: 'Style of suggestions to generate',
          enum: ['detailed', 'concise', 'technical', 'business'],
          default: 'detailed',
        },
        maxSuggestions: {
          type: 'number',
          description: 'Maximum number of suggestions to return',
          minimum: 1,
          maximum: 10,
          default: 5,
        },
      },
      required: ['listId'],
    },
  },
];

// ============================================================================
// Schema Validation Utilities
// ============================================================================

/**
 * Validates parameters against a tool's input schema
 */
export function validateToolParameters(
  toolName: string,
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const tool = MCP_TOOLS.find(t => t.name === toolName);
  if (!tool) {
    return { valid: false, errors: [`Unknown tool: ${toolName}`] };
  }

  const errors: string[] = [];
  const schema = tool.inputSchema;
  
  if (schema.type !== 'object' || !schema.properties) {
    return { valid: false, errors: ['Invalid schema structure'] };
  }

  // Check required parameters
  if (schema.required) {
    for (const requiredParam of schema.required) {
      if (!(requiredParam in parameters)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
      }
    }
  }

  // Validate parameter types and constraints
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const paramSchema = schema.properties[paramName];
    if (!paramSchema) {
      errors.push(`Unknown parameter: ${paramName}`);
      continue;
    }

    const validationResult = validateParameter(paramName, paramValue, paramSchema);
    errors.push(...validationResult);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a single parameter against its schema
 */
function validateParameter(
  name: string,
  value: unknown,
  schema: any
): string[] {
  const errors: string[] = [];

  // Type validation
  if (schema.type === 'string' && typeof value !== 'string') {
    errors.push(`Parameter ${name} must be a string`);
    return errors;
  }
  
  if (schema.type === 'number' && typeof value !== 'number') {
    errors.push(`Parameter ${name} must be a number`);
    return errors;
  }
  
  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`Parameter ${name} must be a boolean`);
    return errors;
  }
  
  if (schema.type === 'array' && !Array.isArray(value)) {
    errors.push(`Parameter ${name} must be an array`);
    return errors;
  }

  // String constraints
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`Parameter ${name} must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`Parameter ${name} must be at most ${schema.maxLength} characters`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Parameter ${name} must be one of: ${schema.enum.join(', ')}`);
    }
    if (schema.format === 'uuid' && !isValidUUID(value)) {
      errors.push(`Parameter ${name} must be a valid UUID`);
    }
  }

  // Number constraints
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Parameter ${name} must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Parameter ${name} must be at most ${schema.maximum}`);
    }
  }

  // Array constraints
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`Parameter ${name} must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems && value.length > schema.maxItems) {
      errors.push(`Parameter ${name} must have at most ${schema.maxItems} items`);
    }
    
    // Validate array items
    if (schema.items) {
      value.forEach((item, index) => {
        const itemErrors = validateParameter(`${name}[${index}]`, item, schema.items);
        errors.push(...itemErrors);
      });
    }
  }

  return errors;
}

/**
 * Simple UUID validation
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get tool schema by name
 */
export function getToolSchema(toolName: string): Tool | undefined {
  return MCP_TOOLS.find(tool => tool.name === toolName);
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return MCP_TOOLS.map(tool => tool.name);
}