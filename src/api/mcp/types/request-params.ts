/**
 * MCP request parameter types
 * Defines type-safe interfaces for MCP tool request parameters
 */

import { Priority } from '../../../domain/models/task';

export interface AddTaskParams {
  listId: string;
  title: string;
  description?: string;
  priority?: Priority;
  estimatedDuration?: number;
  tags?: string[];
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

export interface CompleteTaskParams {
  listId: string;
  taskId: string;
}

export interface RemoveTaskParams {
  listId: string;
  taskId: string;
}

export interface SetTaskPriorityParams {
  listId: string;
  taskId: string;
  priority: Priority;
}

export interface AddTaskTagsParams {
  listId: string;
  taskId: string;
  tags: string[];
}

export interface RemoveTaskTagsParams {
  listId: string;
  taskId: string;
  tags: string[];
}
