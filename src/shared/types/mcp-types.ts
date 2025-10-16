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

export interface CreateTaskListParams {
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

export interface GetTaskListParams {
  listId: string;
  includeCompleted?: boolean;
}

export interface UpdateTaskListParams {
  listId: string;
  action: 'add_item' | 'update_item' | 'remove_item' | 'update_status';
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
}

// Response Types
export interface ListResponse {
  id: string;
  title: string;
  description?: string | undefined;
  taskCount: number;
  completedCount: number;
  progress: number;
  lastUpdated: string;
  projectTag?: string | undefined;
}

export interface ExitCriteriaResponse {
  id: string;
  description: string;
  isMet: boolean;
  metAt?: string;
  notes?: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string | undefined;
  status: string;
  priority: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
  estimatedDuration?: number | undefined;
  exitCriteria?: ExitCriteriaResponse[];
}

export interface SearchResponse {
  results: TaskResponse[];
  totalCount: number;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string | undefined;
}

// Dependency Management Response Types
export interface TaskWithDependencies extends TaskResponse {
  dependencies: string[];
  isReady: boolean;
  blockedBy?: string[];
  canComplete?: boolean;
  exitCriteriaProgress?: number;
}

export interface ReadyTasksResponse {
  listId: string;
  readyTasks: TaskResponse[];
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

export interface ExitCriteriaUpdateResponse {
  taskId: string;
  criteriaId: string;
  description: string;
  isMet: boolean;
  metAt?: string;
  notes?: string;
  taskCanComplete: boolean;
  exitCriteriaProgress: number;
}
