/**
 * Dependency orchestrator interface for task dependency management
 * Handles dependency validation, circular detection, and ready task identification
 */

import { Task } from '../../../domain/models/task';
import {
  DependencyGraph,
  CircularDependencyResult,
  BlockReason,
} from '../../../shared/types/dependency';

import { BaseOrchestrator } from './base-orchestrator';

export interface DependencyOrchestrator extends BaseOrchestrator {
  /**
   * Sets task dependencies with circular dependency validation
   */
  setTaskDependencies(taskId: string, dependencies: string[]): Promise<void>;

  /**
   * Detects circular dependencies in O(n) time
   */
  detectCircularDependencies(graph: DependencyGraph): CircularDependencyResult;

  /**
   * Calculates why a task is blocked
   */
  calculateBlockReason(taskId: string): Promise<BlockReason>;

  /**
   * Gets tasks that are ready to work on (no incomplete dependencies)
   */
  getReadyTasks(listId: string, limit?: number): Promise<Task[]>;

  /**
   * Analyzes task dependencies and provides analysis
   */
  analyzeDependencies(
    listId: string,
    options?: {
      format?: string;
      dagStyle?: string;
    }
  ): Promise<DependencyAnalysis>;

  /**
   * Validates dependencies for a task
   */
  validateDependencies(
    listId: string,
    dependencies: string[]
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Sets dependencies for multiple tasks in bulk
   */
  setBulkTaskDependencies(
    dependencies: Array<{ taskId: string; dependencies: string[] }>
  ): Promise<void>;

  /**
   * Clears dependencies for multiple tasks in bulk
   */
  clearBulkTaskDependencies(taskIds: string[]): Promise<void>;
}

export interface DependencyAnalysis {
  totalTasks: number;
  readyTasks: number;
  blockedTasks: number;
  completedTasks: number;
  dependencyChains: DependencyChain[];
  criticalPath: string[];
  potentialBottlenecks: string[];
}

export interface DependencyChain {
  taskId: string;
  depth: number;
  dependencies: string[];
  dependents: string[];
}
