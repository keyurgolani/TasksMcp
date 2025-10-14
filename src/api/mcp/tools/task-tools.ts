/**
 * MCP task tools definitions
 * Consolidated task-related MCP tool definitions
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TASK_TOOLS: Tool[] = [
  {
    name: 'mcp_tasks_add_task',
    description:
      'Add a new task to a task list with optional dependencies. 📋 BEST PRACTICE: Create detailed action plans in description with specific exit criteria. Follow Plan and Reflect methodology.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 1000,
          description:
            'Task title (provide as string, e.g., "Implement user authentication")',
        },
        description: {
          type: 'string',
          maxLength: 5000,
          description:
            'Task description (provide as string). 🎯 BEST PRACTICE: Include detailed ACTION PLAN with specific steps, CONTEXT explaining why this task matters, and CONSIDERATIONS for technical constraints. This follows the Plan and Reflect methodology.',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          default: 3,
          description:
            'Task priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical/urgent)',
          examples: [1, 3, 5],
        },
        estimatedDuration: {
          type: 'number',
          minimum: 1,
          description:
            'Estimated duration in minutes as a number, e.g., 120 for 2 hours',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: 50,
            pattern: '^[a-z0-9-_]+$',
          },
          maxItems: 10,
          minItems: 0,
          description:
            'Task tags (lowercase, alphanumeric, hyphens, underscores recommended)',
          examples: [
            ['urgent', 'frontend'],
            ['bug-fix', 'critical'],
          ],
        },
        dependencies: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uuid',
          },
          maxItems: 50,
          description:
            'Array of task UUIDs that this task depends on (provide as array of strings)',
        },
        exitCriteria: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: 500,
          },
          maxItems: 20,
          description:
            'Array of exit criteria descriptions that must be met to complete the task (provide as array of strings). 🎯 CRITICAL: Define specific, measurable completion requirements. This ensures Persist Until Complete methodology - only mark tasks done when ALL criteria are verified.',
        },
        agentPromptTemplate: {
          type: 'string',
          maxLength: 10000,
          description:
            'Agent prompt template with variable substitution support (max 10,000 chars). Use {{task.*}} and {{list.*}} variables for dynamic content.',
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
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task to update (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 1000,
          description: 'New task title (provide as string)',
        },
        description: {
          type: 'string',
          maxLength: 5000,
          description: 'New task description (provide as string)',
        },
        estimatedDuration: {
          type: 'number',
          minimum: 1,
          description:
            'New estimated duration in minutes (provide as number, e.g., 90)',
        },
        exitCriteria: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: 500,
          },
          maxItems: 20,
          description:
            'Array of exit criteria descriptions that must be met to complete the task (provide as array of strings)',
        },
        agentPromptTemplate: {
          type: 'string',
          maxLength: 10000,
          description:
            'Agent prompt template with variable substitution support (max 10,000 chars)',
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
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task to complete (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
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
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task to remove (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
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
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description:
            'New priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical/urgent)',
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
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: 50,
            pattern: '^[a-z0-9-_]+$',
          },
          maxItems: 10,
          minItems: 1,
          description:
            'Tags to add (lowercase, alphanumeric, hyphens, underscores recommended)',
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
          format: 'uuid',
          description:
            'UUID of the task list (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description:
            'UUID of the task (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: 50,
          },
          maxItems: 10,
          minItems: 1,
          description: 'Tags to remove (provide as array of strings)',
        },
      },
      required: ['listId', 'taskId', 'tags'],
    },
  },
];
