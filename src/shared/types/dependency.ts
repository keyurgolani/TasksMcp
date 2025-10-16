/**
 * Dependency types for orchestration layer
 * Defines structures for dependency management and analysis
 */

import { TaskStatus } from '../../domain/models/task.js';

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, string[]>;
}

export interface DependencyNode {
  id: string;
  title: string;
  status: TaskStatus;
  dependencies: string[];
  dependents: string[];
  depth: number;
  isBlocked: boolean;
  blockReason?: BlockReason;
}

export interface BlockReason {
  blockedBy: string[];
  details: BlockingTaskDetail[];
}

export interface BlockingTaskDetail {
  taskId: string;
  taskTitle: string;
  status: TaskStatus;
  estimatedCompletion?: Date;
}

export interface CircularDependencyResult {
  hasCircularDependency: boolean;
  cycles: DependencyCycle[];
  affectedTasks: string[];
}

export interface DependencyCycle {
  tasks: string[];
  path: string[];
}

export interface DependencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  circularDependencies?: CircularDependencyResult;
}
