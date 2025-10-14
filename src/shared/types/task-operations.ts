/**
 * Task operation types for orchestration layer
 * Defines data structures for task CRUD operations
 */

import {
  TaskStatus,
  Priority,
  ActionPlan,
  ExitCriteria,
} from '../../domain/models/task';

export interface CreateTaskData {
  listId: string;
  title: string;
  description?: string;
  priority?: Priority;
  estimatedDuration?: number;
  tags?: string[];
  dependencies?: string[];
  agentPromptTemplate?: string;
  actionPlan?: ActionPlan;
  exitCriteria?: ExitCriteria[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  estimatedDuration?: number;
  tags?: string[];
  agentPromptTemplate?: string;
  actionPlan?: ActionPlan;
  exitCriteria?: ExitCriteria[];
  metadata?: Record<string, unknown>;
  completedAt?: Date;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: Priority[];
  tags?: string[];
  tagOperator?: 'AND' | 'OR';
  hasAgentPromptTemplate?: boolean;
  hasDependencies?: boolean;
  isBlocked?: boolean;
  isReady?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

export interface TaskSearchOptions {
  query?: string;
  filters?: TaskFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchTasksData {
  listId?: string;
  status?: TaskStatus;
  priority?: Priority;
  tags?: string[];
  query?: string;
  includeCompleted?: boolean;
  limit?: number;
  offset?: number;
}
