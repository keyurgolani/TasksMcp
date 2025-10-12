/**
 * Tool Usage Examples Library
 *
 * Comprehensive library of usage examples for each MCP tool to include in error responses
 * and documentation. Focuses on commonly problematic parameters and realistic use cases.
 */

/**
 * Example for a single tool parameter
 */
export interface ParameterExample {
  /** Parameter name */
  name: string;
  /** Correct example value */
  correct: unknown;
  /** Description of the example */
  description: string;
  /** Common incorrect values and why they're wrong */
  incorrect?: Array<{
    value: unknown;
    reason: string;
  }>;
}

/**
 * Complete example for a tool call
 */
export interface ToolExample {
  /** Tool name */
  tool: string;
  /** Description of what this example demonstrates */
  description: string;
  /** Complete parameter object */
  parameters: Record<string, unknown>;
  /** Expected outcome description */
  outcome: string;
}

/**
 * Tool examples organized by tool name
 */
export interface ToolExamples {
  /** Tool description */
  description: string;
  /** Examples for individual parameters */
  parameters: ParameterExample[];
  /** Complete usage examples */
  examples: ToolExample[];
  /** Common mistakes and how to fix them */
  commonMistakes: Array<{
    mistake: string;
    fix: string;
    example?: Record<string, unknown>;
  }>;
}

/**
 * Complete tool examples library
 */
export const TOOL_EXAMPLES: Record<string, ToolExamples> = {
  // ============================================================================
  // List Management Tools
  // ============================================================================

  create_list: {
    description:
      'Create a new todo list with a title and optional description and project tag',
    parameters: [
      {
        name: 'title',
        correct: 'My Project Tasks',
        description: 'A descriptive title for your task list',
        incorrect: [
          { value: '', reason: 'Title cannot be empty' },
          { value: 123, reason: 'Title must be a string, not a number' },
        ],
      },
      {
        name: 'description',
        correct: 'Tasks for the new web application project',
        description:
          'Optional description providing more context about the list',
      },
      {
        name: 'projectTag',
        correct: 'web-app',
        description:
          'Project tag for organization (use lowercase with hyphens)',
        incorrect: [
          {
            value: 'Web App',
            reason: 'Use lowercase with hyphens instead of spaces',
          },
          {
            value: 'web_app!',
            reason: 'Avoid special characters except hyphens and underscores',
          },
        ],
      },
    ],
    examples: [
      {
        tool: 'create_list',
        description: 'Create a simple task list',
        parameters: {
          title: 'Daily Tasks',
        },
        outcome: 'Creates a new list with the title "Daily Tasks"',
      },
      {
        tool: 'create_list',
        description: 'Create a project list with full details',
        parameters: {
          title: 'E-commerce Website',
          description: 'Tasks for building the new online store',
          projectTag: 'ecommerce',
        },
        outcome:
          'Creates a comprehensive project list with description and tag',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using numbers or booleans for title',
        fix: 'Always provide title as a string in quotes',
        example: { title: 'My Tasks' },
      },
      {
        mistake: 'Using spaces in project tags',
        fix: 'Use hyphens or underscores instead of spaces',
        example: { projectTag: 'web-app' },
      },
    ],
  },

  get_list: {
    description: 'Retrieve a specific todo list by its UUID',
    parameters: [
      {
        name: 'listId',
        correct: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
        description:
          'UUID of the list in the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        incorrect: [
          { value: '123', reason: 'Must be a valid UUID format' },
          {
            value: 'my-list',
            reason: 'Use the actual UUID, not a custom name',
          },
        ],
      },
      {
        name: 'taskId',
        correct: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
        description:
          'UUID of the task in the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        incorrect: [
          { value: '456', reason: 'Must be a valid UUID format' },
          { value: 'task-1', reason: 'Use the actual UUID, not a custom name' },
        ],
      },
      {
        name: 'includeCompleted',
        correct: true,
        description:
          'Boolean value: true to include completed tasks, false to exclude them',
        incorrect: [
          {
            value: 'true',
            reason: 'Use boolean true/false, not string "true"/"false"',
          },
          { value: 1, reason: 'Use boolean true/false, not numbers 1/0' },
        ],
      },
    ],
    examples: [
      {
        tool: 'get_list',
        description: 'Get a list with all tasks',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
        },
        outcome: 'Returns the list with all tasks (completed and pending)',
      },
      {
        tool: 'get_list',
        description: 'Get a list excluding completed tasks',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          includeCompleted: false,
        },
        outcome: 'Returns the list with only pending/active tasks',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using string "true"/"false" instead of boolean',
        fix: 'Use actual boolean values: true or false',
        example: { includeCompleted: true },
      },
      {
        mistake: 'Using invalid UUID format',
        fix: 'Use the complete UUID format with hyphens',
        example: { listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890' },
      },
    ],
  },

  // ============================================================================
  // Task Management Tools
  // ============================================================================

  add_task: {
    description:
      'Add a new task to a todo list with various optional properties',
    parameters: [
      {
        name: 'listId',
        correct: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
        description: 'UUID of the list to add the task to',
      },
      {
        name: 'title',
        correct: 'Implement user authentication',
        description: 'Clear, descriptive title for the task',
      },
      {
        name: 'priority',
        correct: 5,
        description: 'Priority as a number: 5 (highest/urgent) to 1 (lowest)',
        incorrect: [
          { value: 'high', reason: 'Use numbers 1-5, not words like "high"' },
          { value: '5', reason: 'Use number 5, not string "5"' },
          { value: 0, reason: 'Priority must be between 1 and 5' },
          { value: 10, reason: 'Priority cannot be higher than 5' },
        ],
      },
      {
        name: 'tags',
        correct: ['urgent', 'backend', 'security'],
        description: 'Array of string tags for categorization',
        incorrect: [
          {
            value: 'urgent,backend',
            reason: 'Use array format: ["urgent", "backend"]',
          },
          {
            value: 'urgent',
            reason: 'Single tag should still be in array: ["urgent"]',
          },
          { value: ['urgent', 123], reason: 'All tags must be strings' },
        ],
      },
      {
        name: 'estimatedDuration',
        correct: 120,
        description: 'Estimated time in minutes (e.g., 120 for 2 hours)',
        incorrect: [
          { value: '2 hours', reason: 'Use minutes as a number: 120' },
          { value: '120', reason: 'Use number 120, not string "120"' },
        ],
      },
      {
        name: 'status',
        correct: 'pending',
        description:
          'Task status: "pending", "in_progress", "completed", "blocked", "cancelled"',
        incorrect: [
          {
            value: 'active',
            reason: 'Use "pending" or "in_progress" instead of "active"',
          },
          { value: 'done', reason: 'Use "completed" instead of "done"' },
        ],
      },
      {
        name: 'dependencies',
        correct: ['b2c3d4e5-f6a7-4901-8cde-f23456789012'],
        description: 'Array of task UUIDs that this task depends on',
        incorrect: [
          { value: 'task-1', reason: 'Use actual UUIDs, not custom names' },
          {
            value: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
            reason: 'Single dependency should still be in array',
          },
        ],
      },
    ],
    examples: [
      {
        tool: 'add_task',
        description: 'Add a simple task',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          title: 'Write project documentation',
        },
        outcome: 'Creates a basic task with default priority (3)',
      },
      {
        tool: 'add_task',
        description: 'Add a detailed high-priority task',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          title: 'Fix critical security vulnerability',
          description:
            'Address the SQL injection vulnerability in the login form',
          priority: 5,
          tags: ['urgent', 'security', 'backend'],
          estimatedDuration: 180,
        },
        outcome: 'Creates a comprehensive task with all details',
      },
      {
        tool: 'add_task',
        description: 'Add a task with dependencies',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          title: 'Deploy to production',
          priority: 4,
          dependencies: [
            'b2c3d4e5-f6a7-4901-8cde-f23456789012',
            'c3d4e5f6-a7b8-4012-8def-345678901234',
          ],
        },
        outcome:
          'Creates a task that depends on two other tasks being completed first',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using string priority like "high" or "5"',
        fix: 'Use numbers 1-5 for priority',
        example: { priority: 5 },
      },
      {
        mistake: 'Providing tags as comma-separated string',
        fix: 'Use array format for tags - provide as array of strings',
        example: { tags: ['urgent', 'important'] },
      },
      {
        mistake: 'Using duration in hours or as string',
        fix: 'Provide duration in minutes as a number',
        example: { estimatedDuration: 120 },
      },
    ],
  },

  set_task_priority: {
    description: 'Change the priority of an existing task',
    parameters: [
      {
        name: 'priority',
        correct: 5,
        description: 'New priority level: 5 (critical/urgent) to 1 (low)',
        incorrect: [
          { value: 'urgent', reason: 'Use numbers 1-5, not descriptive words' },
          { value: '3', reason: 'Use number 3, not string "3"' },
          { value: 0, reason: 'Priority must be at least 1' },
          { value: 6, reason: 'Priority cannot exceed 5' },
        ],
      },
    ],
    examples: [
      {
        tool: 'set_task_priority',
        description: 'Set task to highest priority',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          taskId: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
          priority: 5,
        },
        outcome: 'Sets the task to highest priority (urgent)',
      },
      {
        tool: 'set_task_priority',
        description: 'Lower task priority',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          taskId: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
          priority: 2,
        },
        outcome: 'Sets the task to low priority',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using descriptive words for priority',
        fix: 'Use numbers: 5=urgent, 4=high, 3=medium, 2=low, 1=minimal',
        example: { priority: 5 },
      },
    ],
  },

  // ============================================================================
  // Search & Display Tools
  // ============================================================================

  search_tool: {
    description:
      'Unified search, filter, and query tool for tasks with flexible criteria and sorting options',
    parameters: [
      {
        name: 'status',
        correct: ['pending'],
        description:
          'Array of task statuses: ["pending"], ["in_progress"], ["completed"], ["blocked"], ["cancelled"]',
        incorrect: [
          {
            value: ['active'],
            reason: 'Use ["pending"] or ["in_progress"] instead of ["active"]',
          },
          { value: ['done'], reason: 'Use ["completed"] instead of ["done"]' },
          {
            value: 'pending',
            reason: 'Use array format: ["pending"] not string "pending"',
          },
        ],
      },
      {
        name: 'priority',
        correct: [5],
        description: 'Array of priority levels (1-5): [5] for high priority',
        incorrect: [
          {
            value: ['high'],
            reason: 'Use number [5] for high priority, not ["high"]',
          },
          { value: 5, reason: 'Use array format: [5] not number 5' },
        ],
      },
      {
        name: 'isReady',
        correct: true,
        description:
          'Boolean: true for tasks ready to work on, false for blocked tasks',
        incorrect: [
          { value: 'yes', reason: 'Use boolean true, not string "yes"' },
        ],
      },
      {
        name: 'query',
        correct: 'authentication',
        description:
          'Text to search for in task titles, descriptions, and tags',
        incorrect: [
          {
            value: ['authentication'],
            reason: 'Use string "authentication" not array ["authentication"]',
          },
        ],
      },
    ],
    examples: [
      {
        tool: 'search_tool',
        description: 'Search for authentication-related tasks',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          query: 'authentication',
        },
        outcome:
          'Returns tasks containing "authentication" in title, description, or tags',
      },
      {
        tool: 'search_tool',
        description: 'Get all high-priority pending tasks',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          status: ['pending'],
          priority: [5],
        },
        outcome: 'Returns all urgent tasks that are not yet started',
      },
      {
        tool: 'search_tool',
        description: 'Get tasks ready to work on with dependency info',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          isReady: true,
          includeDependencyInfo: true,
        },
        outcome:
          'Returns tasks with no incomplete dependencies and their dependency status',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using non-standard status values',
        fix: 'Use exact status values in arrays: ["pending"], ["in_progress"], ["completed"], ["blocked"], ["cancelled"]',
        example: { status: ['pending'] },
      },
      {
        mistake: 'Using string instead of array for status/priority',
        fix: 'Use arrays for status and priority: status: ["pending"], priority: [5]',
        example: { status: ['pending'], priority: [5] },
      },
    ],
  },

  show_tasks: {
    description: 'Display tasks in various formatted outputs',
    parameters: [
      {
        name: 'format',
        correct: 'detailed',
        description: 'Display format: "compact", "detailed", or "summary"',
        incorrect: [
          { value: 'full', reason: 'Use "detailed" instead of "full"' },
          { value: 'short', reason: 'Use "compact" instead of "short"' },
        ],
      },
      {
        name: 'groupBy',
        correct: 'priority',
        description: 'Grouping method: "status", "priority", or "none"',
      },
    ],
    examples: [
      {
        tool: 'show_tasks',
        description: 'Show tasks grouped by status',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          format: 'detailed',
          groupBy: 'status',
        },
        outcome: 'Displays tasks organized by their current status',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using invalid format options',
        fix: 'Use one of: compact, detailed, summary',
        example: { format: 'detailed' },
      },
    ],
  },

  // ============================================================================
  // Advanced Features
  // ============================================================================
  // Dependency Management
  // ============================================================================

  set_task_dependencies: {
    description:
      'Set which tasks this task depends on (replaces existing dependencies)',
    parameters: [
      {
        name: 'dependencyIds',
        correct: [
          'b2c3d4e5-f6a7-4901-8cde-f23456789012',
          'c3d4e5f6-a7b8-4012-8def-345678901234',
        ],
        description:
          'Array of task UUIDs this task depends on (empty array removes all dependencies)',
        incorrect: [
          {
            value: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
            reason: 'Single dependency should still be in array',
          },
          {
            value: ['task-1', 'task-2'],
            reason: 'Use actual UUIDs, not custom names',
          },
        ],
      },
    ],
    examples: [
      {
        tool: 'set_task_dependencies',
        description: 'Set multiple dependencies',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          taskId: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
          dependencyIds: [
            'c3d4e5f6-a7b8-4012-8def-345678901234',
            'd4e5f6a7-b8c9-4123-8ef0-456789012345',
          ],
        },
        outcome:
          'Task will be blocked until both dependency tasks are completed',
      },
      {
        tool: 'set_task_dependencies',
        description: 'Remove all dependencies',
        parameters: {
          listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
          taskId: 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
          dependencyIds: [],
        },
        outcome: 'Task becomes ready to work on (no dependencies)',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Providing single dependency not in array',
        fix: 'Always use array format, even for single dependency',
        example: { dependencyIds: ['uuid-here'] },
      },
    ],
  },
};

/**
 * Get examples for a specific tool
 */
export function getToolExamples(toolName: string): ToolExamples | undefined {
  return TOOL_EXAMPLES[toolName];
}

/**
 * Get parameter examples for a specific tool and parameter
 */
export function getParameterExample(
  toolName: string,
  parameterName: string
): ParameterExample | undefined {
  const toolExamples = TOOL_EXAMPLES[toolName];
  if (!toolExamples) return undefined;

  return toolExamples.parameters.find(param => param.name === parameterName);
}

/**
 * Get common mistakes for a specific tool
 */
export function getCommonMistakes(
  toolName: string
): Array<{ mistake: string; fix: string; example?: Record<string, unknown> }> {
  const toolExamples = TOOL_EXAMPLES[toolName];
  return toolExamples?.commonMistakes || [];
}

/**
 * Get a usage example for a specific scenario
 */
export function getUsageExample(
  toolName: string,
  scenario?: string
): ToolExample | undefined {
  const toolExamples = TOOL_EXAMPLES[toolName];
  if (!toolExamples) return undefined;

  if (scenario) {
    return toolExamples.examples.find(example =>
      example.description.toLowerCase().includes(scenario.toLowerCase())
    );
  }

  return toolExamples.examples[0];
}

/**
 * Get all tool names that have examples
 */
export function getAvailableToolNames(): string[] {
  return Object.keys(TOOL_EXAMPLES);
}

/**
 * Search for examples by keyword
 */
export function searchExamples(keyword: string): Array<{
  toolName: string;
  example: ToolExample;
}> {
  const results: Array<{ toolName: string; example: ToolExample }> = [];
  const searchTerm = keyword.toLowerCase();

  for (const [toolName, toolExamples] of Object.entries(TOOL_EXAMPLES)) {
    for (const example of toolExamples.examples) {
      if (
        example.description.toLowerCase().includes(searchTerm) ||
        example.outcome.toLowerCase().includes(searchTerm) ||
        JSON.stringify(example.parameters).toLowerCase().includes(searchTerm)
      ) {
        results.push({ toolName, example });
      }
    }
  }

  return results;
}

/**
 * Get examples for commonly problematic parameters across all tools
 */
export function getProblematicParameterExamples(): Record<
  string,
  ParameterExample[]
> {
  const problematicParams = [
    'priority',
    'tags',
    'estimatedDuration',
    'status',
    'format',
    'dependencyIds',
  ];
  const examples: Record<string, ParameterExample[]> = {};

  for (const paramName of problematicParams) {
    examples[paramName] = [];

    for (const [toolName, toolExamples] of Object.entries(TOOL_EXAMPLES)) {
      const paramExample = toolExamples.parameters.find(
        p => p.name === paramName
      );
      if (paramExample) {
        examples[paramName]!.push({
          ...paramExample,
          name: `${toolName}.${paramName}`,
        });
      }
    }
  }

  return examples;
}
