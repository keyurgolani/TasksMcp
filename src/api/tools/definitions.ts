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
  limit?: number;
}

export interface DeleteListParams {
  listId: string;
}

export interface AddTaskParams {
  listId: string;
  title: string;
  description?: string;
  priority?: number;
  tags?: string[];
  estimatedDuration?: number;
  dependencies?: string[];
  exitCriteria?: string[];
  agentPromptTemplate?: string;
}

export interface UpdateTaskParams {
  listId: string;
  taskId: string;
  title?: string;
  description?: string;
  estimatedDuration?: number;
  exitCriteria?: string[];
  agentPromptTemplate?: string;
}

export interface GetAgentPromptParams {
  listId: string;
  taskId: string;
  useDefault?: boolean;
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

export interface SearchToolParams {
  query?: string;
  listId?: string;
  limit?: number;
  status?: string[];
  priority?: number[];
  tags?: string[];
  tagOperator?: 'AND' | 'OR';
  hasDependencies?: boolean;
  isReady?: boolean;
  isBlocked?: boolean;
  dateRange?: {
    start?: string;
    end?: string;
    field?: 'createdAt' | 'updatedAt' | 'completedAt';
  };
  estimatedDuration?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'relevance' | 'priority' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  includeCompleted?: boolean;
  includeDependencyInfo?: boolean;
}

export interface ShowTasksParams {
  listId: string;
  format?: 'compact' | 'detailed' | 'summary';
  groupBy?: 'status' | 'priority' | 'none';
  includeCompleted?: boolean;
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

export interface SetTaskExitCriteriaParams {
  listId: string;
  taskId: string;
  exitCriteria?: string[];
}

export interface UpdateExitCriteriaParams {
  listId: string;
  taskId: string;
  criteriaId: string;
  isMet?: boolean;
  notes?: string;
}

// ============================================================================
// Tool Schema Definitions
// ============================================================================

export const MCP_TOOLS: Tool[] = [
  // List Management Tools (4 tools)
  {
    name: 'create_list',
    description:
      'Create a new task list with required parameters. 🎯 BEST PRACTICE: Before creating, use list_all_lists to check for similar existing projects and learn from their structure.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'Title of the task list (provide as a string, e.g., "My Project Tasks")',
          minLength: 1,
          maxLength: 1000,
        },
        description: {
          type: 'string',
          description:
            'Optional description of the task list (provide as a string)',
          maxLength: 5000,
        },
        projectTag: {
          type: 'string',
          description:
            'Optional project tag for organization (use lowercase with hyphens, e.g., "web-app" or "mobile-project")',
          maxLength: 250,
        },
      },
      required: ['title'],
    },
  },

  {
    name: 'get_list',
    description:
      "Retrieve a specific task list by ID. 🔍 METHODOLOGY: Use this to research task context and understand project structure before starting work (Use Tools, Don't Guess principle).",
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the task list to retrieve',
          format: 'uuid',
          pattern:
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        includeCompleted: {
          type: 'boolean',
          description:
            'Whether to include completed tasks (provide as boolean: true or false, default: true)',
          default: true,
        },
      },
      required: ['listId'],
    },
  },

  {
    name: 'list_all_lists',
    description: 'Get all task lists with metadata information',
    inputSchema: {
      type: 'object',
      properties: {
        projectTag: {
          type: 'string',
          description: 'Filter by project tag (provide as string)',
          maxLength: 250,
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of lists to return (provide as number, e.g., 20)',
          minimum: 1,
          maximum: 500,
          default: 50,
        },
      },
    },
  },

  {
    name: 'delete_list',
    description: 'Delete a task list permanently',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the task list to delete',
          format: 'uuid',
          pattern:
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['listId'],
    },
  },

  // Task Management Tools (6 tools)
  {
    name: 'add_task',
    description:
      'Add a new task to a task list with optional dependencies. 📋 BEST PRACTICE: Create detailed action plans in description with specific exit criteria. Follow Plan and Reflect methodology.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        title: {
          type: 'string',
          description:
            'Task title (provide as string, e.g., "Implement user authentication")',
          minLength: 1,
          maxLength: 1000,
        },
        description: {
          type: 'string',
          description:
            'Task description (provide as string). 🎯 BEST PRACTICE: Include detailed ACTION PLAN with specific steps, CONTEXT explaining why this task matters, and CONSIDERATIONS for technical constraints. This follows the Plan and Reflect methodology.',
          maxLength: 5000,
        },
        priority: {
          type: 'number',
          description:
            'Task priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical/urgent)',
          minimum: 1,
          maximum: 5,
          default: 3,
          examples: [1, 3, 5],
        },
        tags: {
          type: 'array',
          description:
            'Task tags (lowercase, alphanumeric, hyphens, underscores recommended)',
          items: {
            type: 'string',
            maxLength: 50,
            pattern: '^[a-z0-9-_]+$',
          },
          minItems: 0,
          maxItems: 10,
          examples: [
            ['urgent', 'frontend'],
            ['bug-fix', 'critical'],
          ],
        },
        estimatedDuration: {
          type: 'number',
          description:
            'Estimated duration in minutes as a number, e.g., 120 for 2 hours',
          minimum: 1,
        },
        dependencies: {
          type: 'array',
          description:
            'Array of task UUIDs that this task depends on (provide as array of strings)',
          items: {
            type: 'string',
            format: 'uuid',
          },
          maxItems: 50,
        },
        exitCriteria: {
          type: 'array',
          description:
            'Array of exit criteria descriptions that must be met to complete the task (provide as array of strings). 🎯 CRITICAL: Define specific, measurable completion requirements. This ensures Persist Until Complete methodology - only mark tasks done when ALL criteria are verified.',
          items: {
            type: 'string',
            maxLength: 500,
          },
          maxItems: 20,
        },
        agentPromptTemplate: {
          type: 'string',
          description:
            'Agent prompt template with variable substitution support (max 10,000 chars). Use {{task.*}} and {{list.*}} variables for dynamic content.',
          maxLength: 10000,
        },
      },
      required: ['listId', 'title'],
    },
  },

  {
    name: 'update_task',
    description:
      'Update task properties. 🔄 METHODOLOGY: Use this regularly during execution to track progress, update action plans based on discoveries, and document learnings. Essential for Plan and Reflect approach.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task to update (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        title: {
          type: 'string',
          description: 'New task title (provide as string)',
          minLength: 1,
          maxLength: 1000,
        },
        description: {
          type: 'string',
          description: 'New task description (provide as string)',
          maxLength: 5000,
        },
        estimatedDuration: {
          type: 'number',
          description:
            'New estimated duration in minutes (provide as number, e.g., 90)',
          minimum: 1,
        },
        exitCriteria: {
          type: 'array',
          description:
            'Array of exit criteria descriptions that must be met to complete the task (provide as array of strings)',
          items: {
            type: 'string',
            maxLength: 500,
          },
          maxItems: 20,
        },
        agentPromptTemplate: {
          type: 'string',
          description:
            'Agent prompt template with variable substitution support (max 10,000 chars)',
          maxLength: 10000,
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'get_agent_prompt',
    description:
      'Get the rendered agent prompt for a task with variable substitution. 🤖 MULTI-AGENT: Use this to retrieve customized prompts for different AI agents based on task context and requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task to get prompt for (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        useDefault: {
          type: 'boolean',
          description:
            'Whether to use a default template if no custom template is set (provide as boolean: true or false)',
          default: false,
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'remove_task',
    description: 'Remove a task from a task list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task to remove (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'complete_task',
    description:
      'Mark a task as completed. ⚠️ CRITICAL: Only use after verifying ALL exit criteria are met. This enforces Persist Until Complete methodology - never mark tasks done prematurely.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task to complete (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
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
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        priority: {
          type: 'number',
          description:
            'New priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical/urgent)',
          minimum: 1,
          maximum: 5,
          examples: [1, 3, 5],
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
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        tags: {
          type: 'array',
          description:
            'Tags to add (lowercase, alphanumeric, hyphens, underscores recommended)',
          items: {
            type: 'string',
            maxLength: 50,
            pattern: '^[a-z0-9-_]+$',
          },
          minItems: 1,
          maxItems: 10,
          examples: [
            ['urgent', 'frontend'],
            ['review-needed', 'critical'],
          ],
        },
      },
      required: ['listId', 'taskId', 'tags'],
    },
  },

  {
    name: 'remove_task_tags',
    description: 'Remove tags from a task',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        tags: {
          type: 'array',
          description:
            'Tags to remove (lowercase, alphanumeric, hyphens, underscores recommended)',
          items: {
            type: 'string',
            maxLength: 50,
            pattern: '^[a-z0-9-_]+$',
          },
          minItems: 1,
          maxItems: 10,
          examples: [
            ['urgent', 'frontend'],
            ['review-needed', 'critical'],
          ],
        },
      },
      required: ['listId', 'taskId', 'tags'],
    },
  },

  // Search & Display Tools (2 tools)
  {
    name: 'search_tool',
    description:
      "Unified search, filter, and query tool for tasks with flexible criteria. 🔍 ESSENTIAL: Use this to research existing work before starting tasks (Use Tools, Don't Guess). Search completed tasks for context and learnings.",
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Text to search for in task titles, descriptions, and tags (optional)',
          minLength: 1,
          maxLength: 1000,
        },
        listId: {
          type: 'string',
          description:
            'Optional: limit search to specific list (provide UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of results to return (provide as number, e.g., 20)',
          minimum: 1,
          maximum: 500,
          default: 50,
        },
        status: {
          type: 'array',
          description: 'Filter by task statuses (provide as array of strings)',
          items: {
            type: 'string',
            enum: [
              'pending',
              'in_progress',
              'completed',
              'blocked',
              'cancelled',
            ],
          },
          maxItems: 5,
          examples: [['pending', 'in_progress'], ['completed']],
        },
        priority: {
          type: 'array',
          description:
            'Filter by priority levels (provide as array of numbers: 1=minimal, 2=low, 3=medium, 4=high, 5=critical)',
          items: {
            type: 'number',
            minimum: 1,
            maximum: 5,
          },
          maxItems: 5,
          examples: [
            [1, 2],
            [4, 5],
          ],
        },
        tags: {
          type: 'array',
          description: 'Filter by tags (provide as array of strings)',
          items: {
            type: 'string',
            maxLength: 50,
          },
          maxItems: 20,
        },
        tagOperator: {
          type: 'string',
          description:
            'How to combine tag filters: "AND" (task must have ALL tags) or "OR" (task must have ANY tag)',
          enum: ['AND', 'OR'],
          default: 'AND',
        },
        hasDependencies: {
          type: 'boolean',
          description:
            'Filter by whether tasks have dependencies (provide as boolean: true or false)',
        },
        isReady: {
          type: 'boolean',
          description:
            'Filter by whether tasks are ready to work on (provide as boolean: true or false)',
        },
        isBlocked: {
          type: 'boolean',
          description:
            'Filter by whether tasks are blocked by dependencies (provide as boolean: true or false)',
        },
        dateRange: {
          type: 'object',
          description: 'Filter by date range',
          properties: {
            start: {
              type: 'string',
              format: 'date-time',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              format: 'date-time',
              description: 'End date (ISO 8601 format)',
            },
            field: {
              type: 'string',
              enum: ['createdAt', 'updatedAt', 'completedAt'],
              default: 'createdAt',
              description: 'Which date field to filter on',
            },
          },
        },
        estimatedDuration: {
          type: 'object',
          description: 'Filter by estimated duration range (minutes)',
          properties: {
            min: {
              type: 'number',
              minimum: 1,
              description: 'Minimum duration in minutes',
            },
            max: {
              type: 'number',
              minimum: 1,
              description: 'Maximum duration in minutes',
            },
          },
        },

        includeCompleted: {
          type: 'boolean',
          description:
            'Whether to include completed tasks (provide as boolean: true or false)',
          default: true,
        },
        includeDependencyInfo: {
          type: 'boolean',
          description:
            'Whether to include dependency information in results (provide as boolean: true or false)',
          default: false,
        },
      },
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
          description:
            'UUID of the task list to display (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        format: {
          type: 'string',
          description: 'Display format style - use "detailed"',
          enum: ['detailed'],
          default: 'detailed',
        },
        groupBy: {
          type: 'string',
          description:
            'How to group the tasks - use one of: "status", "priority", "none"',
          enum: ['status', 'priority', 'none'],
          default: 'status',
        },
        includeCompleted: {
          type: 'boolean',
          description:
            'Whether to include completed tasks - provide as boolean: true or false',
          default: true,
        },
      },
      required: ['listId'],
    },
  },

  // Dependency Management Tools (3 tools)
  {
    name: 'set_task_dependencies',
    description:
      'Set which tasks this task depends on (replaces all existing dependencies). 🔗 WORKFLOW: Use with get_ready_tasks to enable proper task sequencing and parallel execution in multi-agent environments.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the list containing the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task to set dependencies for (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        dependencyIds: {
          type: 'array',
          description:
            'Array of task UUIDs that this task depends on - provide as array of strings (empty array removes all dependencies)',
          items: {
            type: 'string',
            format: 'uuid',
          },
          maxItems: 50,
        },
      },
      required: ['listId', 'taskId'],
    },
  },

  {
    name: 'get_ready_tasks',
    description:
      "Get tasks that are ready to work on (no incomplete dependencies). 🚀 DAILY WORKFLOW: Start each work session with this to find actionable tasks. Essential for Plan and Reflect methodology - plan your day based on what's actually ready.",
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the list to get ready tasks from (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of ready tasks to return (provide as number, e.g., 10)',
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
    description:
      "Get analysis of task dependencies and project structure with optional DAG visualization. 📊 PLANNING: Use this to understand project context and identify bottlenecks before starting work. Critical for Use Tools, Don't Guess methodology.",
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the list to analyze (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        format: {
          type: 'string',
          enum: ['analysis', 'dag', 'both'],
          description:
            'Output format: "analysis" for dependency analysis, "dag" for visualization only, "both" for combined output',
          default: 'analysis',
        },
        dagStyle: {
          type: 'string',
          enum: ['ascii', 'dot', 'mermaid'],
          description:
            'DAG visualization style: "ascii" for text-based graph, "dot" for Graphviz format, "mermaid" for Mermaid diagram',
          default: 'ascii',
        },
      },
      required: ['listId'],
    },
  },

  // Exit Criteria Management Tools (2 tools)
  {
    name: 'set_task_exit_criteria',
    description:
      'Set exit criteria for a task (replaces all existing exit criteria). 🎯 QUALITY: Define specific, measurable completion requirements. Essential for Persist Until Complete - ensures tasks are truly finished.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the list containing the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task to set exit criteria for (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        exitCriteria: {
          type: 'array',
          description:
            'Array of exit criteria descriptions that must be met to complete the task (provide as array of strings, empty array removes all criteria)',
          items: {
            type: 'string',
            maxLength: 500,
          },
          maxItems: 20,
        },
      },
      required: ['listId', 'taskId', 'exitCriteria'],
    },
  },

  {
    name: 'update_exit_criteria',
    description:
      'Update the status of a specific exit criteria. 📝 PROGRESS TRACKING: Use this throughout task execution to track completion progress. Core part of Persist Until Complete methodology.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the list containing the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        taskId: {
          type: 'string',
          description:
            'UUID of the task containing the exit criteria (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        criteriaId: {
          type: 'string',
          description:
            'UUID of the exit criteria to update (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          format: 'uuid',
        },
        isMet: {
          type: 'boolean',
          description:
            'Whether the exit criteria has been met (provide as boolean: true or false)',
        },
        notes: {
          type: 'string',
          description:
            'Optional notes about the criteria status (provide as string)',
          maxLength: 1000,
        },
      },
      required: ['listId', 'taskId', 'criteriaId'],
    },
  },

  // Intelligence Tools removed - no longer supported
];

// ============================================================================
// Schema Validation Utilities
// ============================================================================

/**
 * Validates parameters against a tool's input schema with error messages
 */
export function validateToolParameters(
  toolName: string,
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[]; suggestion?: string[] } {
  const tool = MCP_TOOLS.find(t => t.name === toolName);
  if (!tool) {
    return {
      valid: false,
      errors: [`Unknown tool: ${toolName}`],
      suggestion: [`Available tools: ${MCP_TOOLS.map(t => t.name).join(', ')}`],
    };
  }

  const errors: string[] = [];
  const suggestion: string[] = [];
  const schema = tool.inputSchema;

  if (schema.type !== 'object' || !schema.properties) {
    return { valid: false, errors: ['Invalid schema structure'] };
  }

  // Check required parameters with suggestion
  if (schema.required) {
    for (const requiredParam of schema.required) {
      if (!(requiredParam in parameters)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
        const paramSchema = schema.properties[requiredParam];
        if (
          paramSchema &&
          typeof paramSchema === 'object' &&
          'description' in paramSchema &&
          paramSchema.description
        ) {
          suggestion.push(`${requiredParam}: ${paramSchema.description}`);
        }
        if (
          paramSchema &&
          typeof paramSchema === 'object' &&
          'example' in paramSchema &&
          paramSchema.example
        ) {
          suggestion.push(`Example ${requiredParam}: ${paramSchema.example}`);
        }
      }
    }
  }

  // Validate parameter types and constraints with feedback
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const paramSchema = schema.properties[paramName];
    if (!paramSchema) {
      errors.push(`Unknown parameter: ${paramName}`);
      const validParams = Object.keys(schema.properties);
      suggestion.push(`Valid parameters: ${validParams.join(', ')}`);
      continue;
    }

    // Ensure paramSchema has the required type property
    if (
      typeof paramSchema !== 'object' ||
      paramSchema === null ||
      !('type' in paramSchema)
    ) {
      errors.push(`Invalid schema for parameter: ${paramName}`);
      continue;
    }

    const validationResult = validateParameter(
      paramName,
      paramValue,
      paramSchema as ParameterSchema
    );
    errors.push(...validationResult.errors);
    if (validationResult.suggestion) {
      suggestion.push(...validationResult.suggestion);
    }
  }

  return { valid: errors.length === 0, errors, suggestion };
}

/**
 * UUID validation with error messaging
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

interface ParameterSchema {
  type: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  examples?: unknown[];
  minLength?: number;
  maxLength?: number;
  enumDescriptions?: Record<string, string>;
  format?: string;
  example?: string;
  minItems?: number;
  maxItems?: number;
  items?: ParameterSchema;
}

/**
 * Parameter validation with error messages
 */
function validateParameter(
  name: string,
  value: unknown,
  schema: ParameterSchema
): { valid: boolean; errors: string[]; suggestion?: string[] } {
  const errors: string[] = [];
  const suggestion: string[] = [];

  // Type validation with suggestion
  if (schema.type === 'string' && typeof value !== 'string') {
    errors.push(`Parameter ${name} must be a string`);
    suggestion.push(`Provide ${name} as a string value`);
    return { valid: false, errors, suggestion };
  }

  if (schema.type === 'number' && typeof value !== 'number') {
    errors.push(`Parameter ${name} must be a number`);
    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      suggestion.push(
        `Provide ${name} as a number between ${schema.minimum} and ${schema.maximum}`
      );
    }
    return { valid: false, errors, suggestion };
  }

  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`Parameter ${name} must be a boolean`);
    suggestion.push(`Use true or false for ${name}`);
    return { valid: false, errors, suggestion };
  }

  if (schema.type === 'array' && !Array.isArray(value)) {
    errors.push(`Parameter ${name} must be an array`);
    if (schema.examples) {
      suggestion.push(`Example: ${JSON.stringify(schema.examples[0])}`);
    }
    return { valid: false, errors, suggestion };
  }

  // String constraints with suggestion
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(
        `Parameter ${name} must be at least ${schema.minLength} characters`
      );
      suggestion.push(
        `Current length: ${value.length}, required: ${schema.minLength}+`
      );
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(
        `Parameter ${name} must be at most ${schema.maxLength} characters`
      );
      suggestion.push(
        `Current length: ${value.length}, maximum: ${schema.maxLength}`
      );
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(
        `Parameter ${name} must be one of: ${schema.enum.join(', ')}`
      );
      suggestion.push(`Valid options: ${schema.enum.join(', ')}`);
      if (schema.enumDescriptions) {
        const descriptions = Object.entries(schema.enumDescriptions)
          .map(([key, desc]) => `${key}: ${desc}`)
          .join(', ');
        suggestion.push(`Descriptions: ${descriptions}`);
      }
    }
    if (schema.format === 'uuid' && !isValidUUID(value)) {
      errors.push(`Parameter ${name} must be a valid UUID`);
      suggestion.push(`UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
      if (schema.example) {
        suggestion.push(`Example: ${schema.example}`);
      }
    }
  }

  // Number constraints with suggestions
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Parameter ${name} must be at least ${schema.minimum}`);
      suggestion.push(`Current value: ${value}, minimum: ${schema.minimum}`);
      if (schema.examples) {
        suggestion.push(`Valid examples: ${schema.examples.join(', ')}`);
      }
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Parameter ${name} must be at most ${schema.maximum}`);
      suggestion.push(`Current value: ${value}, maximum: ${schema.maximum}`);
      if (schema.examples) {
        suggestion.push(`Valid examples: ${schema.examples.join(', ')}`);
      }
    }
  }

  // Array constraints with suggestion
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(
        `Parameter ${name} must have at least ${schema.minItems} items`
      );
      suggestion.push(
        `Current count: ${value.length}, minimum: ${schema.minItems}`
      );
    }
    if (schema.maxItems && value.length > schema.maxItems) {
      errors.push(
        `Parameter ${name} must have at most ${schema.maxItems} items`
      );
      suggestion.push(
        `Current count: ${value.length}, maximum: ${schema.maxItems}`
      );
    }

    // Validate array items with feedback
    if (schema.items) {
      value.forEach((item, index) => {
        const itemValidation = validateParameter(
          `${name}[${index}]`,
          item,
          schema.items!
        );
        errors.push(...itemValidation.errors);
        if (itemValidation.suggestion) {
          suggestion.push(...itemValidation.suggestion);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors, suggestion };
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
