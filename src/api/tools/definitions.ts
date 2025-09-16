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
  dependencies?: string[];
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
  hasDependencies?: boolean;
  isReady?: boolean;
  isBlocked?: boolean;
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

export interface SetTaskDependenciesParams {
  listId: string;
  taskId: string;
  dependencyIds: string[];
}

export interface GetReadyTasksParams {
  listId: string;
  limit?: number;
}

export interface AnalyzeTaskDependenciesParams {
  listId: string;
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
          description: 'Title of the todo list (provide as a string, e.g., "My Project Tasks")',
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'Optional description of the todo list (provide as a string)',
          maxLength: 1000,
        },
        projectTag: {
          type: 'string',
          description: 'Optional project tag for organization (use lowercase with hyphens, e.g., "web-app" or "mobile-project")',
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
          description: 'UUID of the todo list to retrieve (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        includeCompleted: {
          type: 'boolean',
          description: 'Whether to include completed tasks (provide as boolean: true or false, default: true)',
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
          description: 'Filter by project tag (provide as string)',
          maxLength: 50,
        },
        includeArchived: {
          type: 'boolean',
          description: 'Whether to include archived lists (provide as boolean: true or false, default: false)',
          default: false,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of lists to return (provide as number, e.g., 20)',
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
          description: 'UUID of the todo list to delete (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        permanent: {
          type: 'boolean',
          description: 'Whether to permanently delete (true) or archive (false) - provide as boolean',
          default: false,
        },
      },
      required: ['listId'],
    },
  },

  // Task Management Tools (6 tools)
  {
    name: 'add_task',
    description: 'Add a new task to a todo list with optional dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        title: {
          type: 'string',
          description: 'Task title (provide as string, e.g., "Implement user authentication")',
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'Task description (provide as string)',
          maxLength: 1000,
        },
        priority: {
          type: 'number',
          description: 'Task priority as a number: 5 (highest) to 1 (lowest), e.g., 5 for urgent tasks',
          minimum: 1,
          maximum: 5,
          default: 3,
        },
        tags: {
          type: 'array',
          description: 'Task tags as an array of strings, e.g., ["urgent", "important", "bug-fix"]',
          items: {
            type: 'string',
            maxLength: 50,
          },
          maxItems: 10,
        },
        estimatedDuration: {
          type: 'number',
          description: 'Estimated duration in minutes as a number, e.g., 120 for 2 hours',
          minimum: 1,
        },
        dependencies: {
          type: 'array',
          description: 'Array of task UUIDs that this task depends on (provide as array of strings)',
          items: {
            type: 'string',
            format: 'uuid',
          },
          maxItems: 10,
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
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to update (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        title: {
          type: 'string',
          description: 'New task title (provide as string)',
          minLength: 1,
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'New task description (provide as string)',
          maxLength: 1000,
        },
        estimatedDuration: {
          type: 'number',
          description: 'New estimated duration in minutes (provide as number, e.g., 90)',
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
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to remove (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
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
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to complete (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
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
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        priority: {
          type: 'number',
          description: 'New priority as a number: 5 (highest/urgent) to 1 (lowest), e.g., 5 for critical tasks',
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
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        tags: {
          type: 'array',
          description: 'Tags to add as an array of strings, e.g., ["urgent", "frontend", "review-needed"]',
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
          description: 'Text to search for in task titles and descriptions (provide as string, e.g., "authentication")',
          minLength: 1,
          maxLength: 200,
        },
        listId: {
          type: 'string',
          description: 'Optional: limit search to specific list (provide UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (provide as number, e.g., 10)',
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
    description: 'Filter tasks by specific criteria including dependency status',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the todo list to filter (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        status: {
          type: 'string',
          description: 'Filter by task status - use one of: "pending", "in_progress", "completed", "blocked", "cancelled"',
          enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
        },
        priority: {
          type: 'number',
          description: 'Filter by priority level (provide as number: 5 for highest priority tasks, 1 for lowest)',
          minimum: 1,
          maximum: 5,
        },
        tag: {
          type: 'string',
          description: 'Filter by specific tag (provide as string, e.g., "urgent")',
          maxLength: 50,
        },
        hasDependencies: {
          type: 'boolean',
          description: 'Filter by whether tasks have dependencies - provide as boolean: true or false',
        },
        isReady: {
          type: 'boolean',
          description: 'Filter by whether tasks are ready to work on - provide as boolean: true or false',
        },
        isBlocked: {
          type: 'boolean',
          description: 'Filter by whether tasks are blocked by dependencies - provide as boolean: true or false',
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
          description: 'UUID of the todo list to display (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        format: {
          type: 'string',
          description: 'Display format style - use one of: "compact", "detailed", "summary"',
          enum: ['compact', 'detailed', 'summary'],
          default: 'detailed',
        },
        groupBy: {
          type: 'string',
          description: 'How to group the tasks - use one of: "status", "priority", "none"',
          enum: ['status', 'priority', 'none'],
          default: 'status',
        },
        includeCompleted: {
          type: 'boolean',
          description: 'Whether to include completed tasks - provide as boolean: true or false',
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
          description: 'Description of the task to analyze (provide as string, e.g., "Build user authentication system")',
          minLength: 1,
          maxLength: 2000,
        },
        context: {
          type: 'string',
          description: 'Optional context or project information (provide as string)',
          maxLength: 200,
        },
        maxSuggestions: {
          type: 'number',
          description: 'Maximum number of suggestions to return (provide as number, e.g., 3)',
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
          description: 'UUID of the todo list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        style: {
          type: 'string',
          description: 'Style of suggestions to generate - use one of: "detailed", "concise", "technical", "business"',
          enum: ['detailed', 'concise', 'technical', 'business'],
          default: 'detailed',
        },
        maxSuggestions: {
          type: 'number',
          description: 'Maximum number of suggestions to return (provide as number, e.g., 5)',
          minimum: 1,
          maximum: 10,
          default: 5,
        },
      },
      required: ['listId'],
    },
  },

  // Dependency Management Tools (3 tools)
  {
    name: 'set_task_dependencies',
    description: 'Set which tasks this task depends on (replaces all existing dependencies)',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list containing the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description: 'UUID of the task to set dependencies for (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        dependencyIds: {
          type: 'array',
          description: 'Array of task UUIDs that this task depends on - provide as array of strings (empty array removes all dependencies)',
          items: {
            type: 'string',
            format: 'uuid',
          },
          maxItems: 10,
        },
      },
      required: ['listId', 'taskId', 'dependencyIds'],
    },
  },

  {
    name: 'get_ready_tasks',
    description: 'Get tasks that are ready to work on (no incomplete dependencies)',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to get ready tasks from (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of ready tasks to return (provide as number, e.g., 10)',
          minimum: 1,
          maximum: 50,
          default: 20,
        },
      },
      required: ['listId'],
    },
  },

  {
    name: 'analyze_task_dependencies',
    description: 'Get analysis of task dependencies and project structure with optional DAG visualization',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to analyze (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        format: {
          type: 'string',
          enum: ['analysis', 'dag', 'both'],
          description: 'Output format: "analysis" for dependency analysis, "dag" for visualization only, "both" for combined output',
          default: 'analysis',
        },
        dagStyle: {
          type: 'string',
          enum: ['ascii', 'dot', 'mermaid'],
          description: 'DAG visualization style: "ascii" for text-based graph, "dot" for Graphviz format, "mermaid" for Mermaid diagram',
          default: 'ascii',
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