/**
 * Consolidated MCP Tools Definitions
 * Unified tool definitions organized by domain functionality
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// List Management Tools Domain
// ============================================================================

export const LIST_MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_create_list',
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
    name: 'mcp_tasks_get_list',
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
    name: 'mcp_tasks_list_all_lists',
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
    name: 'mcp_tasks_delete_list',
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
  {
    name: 'mcp_tasks_update_list_metadata',
    description:
      'Update list metadata (title, description, projectTag). 📝 LIST MANAGEMENT: Use this to update list-level properties without affecting tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the task list to update',
          format: 'uuid',
          pattern:
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        title: {
          type: 'string',
          description: 'New title for the task list (provide as string)',
          minLength: 1,
          maxLength: 1000,
        },
        description: {
          type: 'string',
          description: 'New description for the task list (provide as string)',
          maxLength: 5000,
        },
        projectTag: {
          type: 'string',
          description:
            'New project tag for organization (use lowercase with hyphens, e.g., "web-app" or "mobile-project")',
          maxLength: 250,
        },
      },
      required: ['listId'],
    },
  },
];

// ============================================================================
// Task Management Tools Domain
// ============================================================================

export const TASK_MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_add_task',
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
    name: 'mcp_tasks_update_task',
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
    name: 'mcp_tasks_complete_task',
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
    name: 'mcp_tasks_remove_task',
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
    name: 'mcp_tasks_set_task_priority',
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
    name: 'mcp_tasks_add_task_tags',
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
    name: 'mcp_tasks_remove_task_tags',
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
  {
    name: 'mcp_tasks_set_task_status',
    description:
      'Change task status with transition validation. Supports transitions: pending ↔ in_progress, pending → cancelled, in_progress → completed/blocked/cancelled, blocked → in_progress/cancelled, cancelled → pending.',
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
        status: {
          type: 'string',
          description:
            'New task status (pending, in_progress, completed, blocked, cancelled)',
          enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
        },
      },
      required: ['listId', 'taskId', 'status'],
    },
  },
];

// ============================================================================
// Search and Display Tools Domain
// ============================================================================

export const SEARCH_DISPLAY_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_search_tool',
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
    name: 'mcp_tasks_show_tasks',
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
          description:
            'Display format style - use one of: "compact", "detailed", "summary"',
          enum: ['compact', 'detailed', 'summary'],
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
];

// ============================================================================
// Dependency Management Tools Domain
// ============================================================================

export const DEPENDENCY_MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_set_task_dependencies',
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
    name: 'mcp_tasks_get_ready_tasks',
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
    name: 'mcp_tasks_analyze_task_dependencies',
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
];

// ============================================================================
// Exit Criteria Management Tools Domain
// ============================================================================

export const EXIT_CRITERIA_MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_set_task_exit_criteria',
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
      required: ['listId', 'taskId'],
    },
  },
  {
    name: 'mcp_tasks_update_exit_criteria',
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
];

// ============================================================================
// Agent Prompt Management Tools Domain
// ============================================================================

export const AGENT_PROMPT_MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_get_agent_prompt',
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
];

// ============================================================================
// Consolidated Tools Export
// ============================================================================

export const ALL_MCP_TOOLS: Tool[] = [
  ...LIST_MANAGEMENT_TOOLS,
  ...TASK_MANAGEMENT_TOOLS,
  ...SEARCH_DISPLAY_TOOLS,
  ...DEPENDENCY_MANAGEMENT_TOOLS,
  ...EXIT_CRITERIA_MANAGEMENT_TOOLS,
  ...AGENT_PROMPT_MANAGEMENT_TOOLS,
];

// Individual domains are already exported above with their definitions
