/**
 * Zod schemas for MCP tool validation
 */

import { z } from 'zod';

// Common schemas
const uuidSchema = z.string().uuid();
const prioritySchema = z.number().int().min(1).max(5);
const tagSchema = z
  .string()
  .max(50)
  .regex(/^[a-z0-9-_]+$/);

// List Management Schemas
export const CREATE_LIST_SCHEMA = z.object({
  title: z.string().min(1).max(1000),
  description: z.string().max(5000).optional(),
  projectTag: z.string().max(250).optional(),
});

export const GET_LIST_SCHEMA = z.object({
  listId: uuidSchema,
  includeCompleted: z.boolean().default(true).optional(),
});

export const LIST_ALL_LISTS_SCHEMA = z.object({
  projectTag: z.string().max(250).optional(),
  limit: z.number().int().min(1).max(500).default(50).optional(),
});

export const DELETE_LIST_SCHEMA = z.object({
  listId: uuidSchema,
});

export const UPDATE_LIST_METADATA_SCHEMA = z.object({
  listId: uuidSchema,
  title: z.string().min(1).max(1000).optional(),
  description: z.string().max(5000).optional(),
  projectTag: z.string().max(250).optional(),
});

// Task Management Schemas
export const ADD_TASK_SCHEMA = z.object({
  listId: uuidSchema,
  title: z.string().min(1).max(1000),
  description: z.string().max(5000).optional(),
  priority: prioritySchema.default(3).optional(),
  tags: z.array(tagSchema).min(0).max(10).optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  dependencies: z.array(uuidSchema).max(50).optional(),
  exitCriteria: z.array(z.string().max(500)).max(20).optional(),
  agentPromptTemplate: z.string().max(10000).optional(),
});

export const UPDATE_TASK_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  title: z.string().min(1).max(1000).optional(),
  description: z.string().max(5000).optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  exitCriteria: z.array(z.string().max(500)).max(20).optional(),
  agentPromptTemplate: z.string().max(10000).optional(),
});

export const COMPLETE_TASK_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
});

export const REMOVE_TASK_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
});

export const SET_TASK_PRIORITY_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  priority: prioritySchema,
});

export const ADD_TASK_TAGS_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  tags: z.array(tagSchema).min(1).max(10),
});

export const REMOVE_TASK_TAGS_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  tags: z.array(tagSchema).min(1).max(10),
});

export const SET_TASK_STATUS_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  status: z.enum([
    'pending',
    'in_progress',
    'completed',
    'blocked',
    'cancelled',
  ]),
});
// Search and Display Schemas
export const SEARCH_TOOL_SCHEMA = z.object({
  query: z.string().min(1).max(1000).optional(),
  listId: uuidSchema.optional(),
  limit: z.number().int().min(1).max(500).default(50).optional(),
  status: z
    .array(
      z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
    )
    .max(5)
    .optional(),
  priority: z.array(z.number().int().min(1).max(5)).max(5).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  tagOperator: z.enum(['AND', 'OR']).default('AND').optional(),
  hasDependencies: z.boolean().optional(),
  isReady: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
      field: z
        .enum(['createdAt', 'updatedAt', 'completedAt'])
        .default('createdAt')
        .optional(),
    })
    .optional(),
  estimatedDuration: z
    .object({
      min: z.number().int().min(1).optional(),
      max: z.number().int().min(1).optional(),
    })
    .optional(),
  includeCompleted: z.boolean().default(true).optional(),
  includeDependencyInfo: z.boolean().default(false).optional(),
});

export const SHOW_TASKS_SCHEMA = z.object({
  listId: uuidSchema,
  format: z.enum(['detailed']).default('detailed').optional(),
  groupBy: z.enum(['status', 'priority', 'none']).default('status').optional(),
  includeCompleted: z.boolean().default(true).optional(),
});

// Dependency Management Schemas
export const SET_TASK_DEPENDENCIES_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  dependencyIds: z.array(uuidSchema).max(50).optional(),
});

export const GET_READY_TASKS_SCHEMA = z.object({
  listId: uuidSchema,
  limit: z.number().int().min(1).max(50).default(20).optional(),
});

export const ANALYZE_TASK_DEPENDENCIES_SCHEMA = z.object({
  listId: uuidSchema,
  format: z.enum(['analysis', 'dag', 'both']).default('analysis').optional(),
  dagStyle: z.enum(['ascii', 'dot', 'mermaid']).default('ascii').optional(),
});

// Exit Criteria Management Schemas
export const SET_TASK_EXIT_CRITERIA_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  exitCriteria: z.array(z.string().max(500)).max(20).optional(),
});

export const UPDATE_EXIT_CRITERIA_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  criteriaId: uuidSchema,
  isMet: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

// Agent Prompt Management Schemas
export const GET_AGENT_PROMPT_SCHEMA = z.object({
  listId: uuidSchema,
  taskId: uuidSchema,
  useDefault: z.boolean().default(false).optional(),
});

// Schema mapping for tool validation
export const MCP_TOOL_SCHEMAS = {
  mcp_tasks_create_list: CREATE_LIST_SCHEMA,
  mcp_tasks_get_list: GET_LIST_SCHEMA,
  mcp_tasks_list_all_lists: LIST_ALL_LISTS_SCHEMA,
  mcp_tasks_delete_list: DELETE_LIST_SCHEMA,
  mcp_tasks_update_list_metadata: UPDATE_LIST_METADATA_SCHEMA,
  mcp_tasks_add_task: ADD_TASK_SCHEMA,
  mcp_tasks_update_task: UPDATE_TASK_SCHEMA,
  mcp_tasks_complete_task: COMPLETE_TASK_SCHEMA,
  mcp_tasks_remove_task: REMOVE_TASK_SCHEMA,
  mcp_tasks_set_task_priority: SET_TASK_PRIORITY_SCHEMA,
  mcp_tasks_add_task_tags: ADD_TASK_TAGS_SCHEMA,
  mcp_tasks_remove_task_tags: REMOVE_TASK_TAGS_SCHEMA,
  mcp_tasks_set_task_status: SET_TASK_STATUS_SCHEMA,
  mcp_tasks_search_tool: SEARCH_TOOL_SCHEMA,
  mcp_tasks_show_tasks: SHOW_TASKS_SCHEMA,
  mcp_tasks_set_task_dependencies: SET_TASK_DEPENDENCIES_SCHEMA,
  mcp_tasks_get_ready_tasks: GET_READY_TASKS_SCHEMA,
  mcp_tasks_analyze_task_dependencies: ANALYZE_TASK_DEPENDENCIES_SCHEMA,
  mcp_tasks_set_task_exit_criteria: SET_TASK_EXIT_CRITERIA_SCHEMA,
  mcp_tasks_update_exit_criteria: UPDATE_EXIT_CRITERIA_SCHEMA,
  mcp_tasks_get_agent_prompt: GET_AGENT_PROMPT_SCHEMA,
} as const;
