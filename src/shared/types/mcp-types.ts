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

// Response Types
export interface SimpleListResponse {
  id: string;
  title: string;
  description?: string | undefined;
  taskCount: number;
  completedCount: number;
  progress: number;
  lastUpdated: string;
  projectTag?: string | undefined;
}

export interface SimpleTaskResponse {
  id: string;
  title: string;
  description?: string | undefined;
  status: string;
  priority: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  estimatedDuration?: number | undefined;
}

export interface SimpleSearchResponse {
  results: SimpleTaskResponse[];
  totalCount: number;
  hasMore: boolean;
}

export interface SimpleError {
  error: string;
  message: string;
  code?: string | undefined;
}

// Dependency Management Response Types
export interface TaskWithDependencies extends SimpleTaskResponse {
  dependencies: string[];
  isReady: boolean;
  blockedBy?: string[];
}

export interface ReadyTasksResponse {
  listId: string;
  readyTasks: SimpleTaskResponse[];
  totalReady: number;
  nextActions: string[];
}

export interface DependencyAnalysisResponse {
  listId: string;
  summary: {
    totalTasks: number;
    readyTasks: number;
    blockedTasks: number;
    tasksWithDependencies: number;
  };
  criticalPath: string[];
  issues: {
    circularDependencies: string[][];
    bottlenecks: string[];
  };
  recommendations: string[];
}
