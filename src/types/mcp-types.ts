/**
 * MCP-specific types and interfaces
 */

import type {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

export type { CallToolRequest, CallToolResult };

export interface McpError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CreateTodoListParams {
  title: string;
  description?: string;
  tasks?: Array<{
    title: string;
    description?: string;
    priority?: number;
    estimatedDuration?: number;
    tags?: string[];
  }>;
  context?: string;
}

export interface GetTodoListParams {
  listId: string;
  includeCompleted?: boolean;
}

export interface UpdateTodoListParams {
  listId: string;
  action:
    | 'add_item'
    | 'update_item'
    | 'remove_item'
    | 'update_status'
    | 'reorder';
  itemData?: {
    title?: string;
    description?: string;
    priority?: number;
    status?: string;
    estimatedDuration?: number;
    tags?: string[];
    dependencies?: string[];
  };
  itemId?: string;
  newOrder?: string[];
}

export interface AnalyzeTaskComplexityParams {
  taskDescription: string;
  context?: string;
  autoCreate?: boolean;
  generateOptions?: {
    style?: 'detailed' | 'concise' | 'technical' | 'business';
    maxTasks?: number;
    includeTests?: boolean;
    includeDependencies?: boolean;
  };
}
