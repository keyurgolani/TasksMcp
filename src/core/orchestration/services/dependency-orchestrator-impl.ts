/**
 * Dependency orchestrator implementation
 * Manages task dependencies with circular detection and ready task identification
 */

import { DataDelegationService } from '../../../data/delegation/data-delegation-service';
import { Task } from '../../../domain/models/task';
import {
  OrchestrationError,
  CircularDependencyError,
  TaskNotFoundError,
} from '../../../shared/errors/orchestration-error';
import {
  DependencyGraph,
  CircularDependencyResult,
  BlockReason,
  BlockingTaskDetail,
} from '../../../shared/types/dependency';
import { ValidationResult } from '../../../shared/types/validation';
import { DataOperation } from '../interfaces/base-orchestrator';
import {
  DependencyOrchestrator,
  DependencyAnalysis,
} from '../interfaces/dependency-orchestrator';

export class DependencyOrchestratorImpl implements DependencyOrchestrator {
  constructor(private dataDelegation: DataDelegationService) {}

  async setTaskDependencies(
    taskId: string,
    dependencies: string[]
  ): Promise<void> {
    // First verify the task exists
    await this.getTask(taskId);

    // Verify all dependency tasks exist
    for (const depId of dependencies) {
      await this.getTask(depId);
    }

    // Build dependency graph to check for circular dependencies
    const graph = await this.buildDependencyGraph(taskId, dependencies);
    const circularResult = this.detectCircularDependencies(graph);

    if (circularResult.hasCircularDependency && circularResult.cycles[0]) {
      throw new CircularDependencyError(
        'Circular dependency detected',
        circularResult.cycles[0].tasks,
        'Remove one of the dependencies to break the cycle'
      );
    }

    // Update task dependencies
    const operation: DataOperation = {
      type: 'update',
      entity: 'task',
      data: { id: taskId, dependencies },
    };

    try {
      await this.delegateData(operation);
    } catch (error) {
      throw this.handleError(error as Error, 'Dependency Update');
    }
  }

  detectCircularDependencies(graph: DependencyGraph): CircularDependencyResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: Array<{ tasks: string[]; path: string[] }> = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycleTasks = path.slice(cycleStart);
        cycleTasks.push(nodeId); // Complete the cycle

        cycles.push({
          tasks: cycleTasks,
          path: [...path, nodeId],
        });
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependencies = graph.edges.get(nodeId) || [];
      for (const depId of dependencies) {
        if (dfs(depId, [...path])) {
          // Continue searching for more cycles
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all nodes for cycles
    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    const affectedTasks = new Set<string>();
    cycles.forEach(cycle => {
      cycle.tasks.forEach(task => affectedTasks.add(task));
    });

    return {
      hasCircularDependency: cycles.length > 0,
      cycles,
      affectedTasks: Array.from(affectedTasks),
    };
  }

  async calculateBlockReason(taskId: string): Promise<BlockReason> {
    const task = await this.getTask(taskId);
    const blockingTasks = [];

    for (const depId of task.dependencies) {
      const depTask = await this.getTask(depId);
      if (depTask.status !== 'completed') {
        const detail: BlockingTaskDetail = {
          taskId: depTask.id,
          taskTitle: depTask.title,
          status: depTask.status,
        };

        if (depTask.estimatedDuration) {
          detail.estimatedCompletion = new Date(
            Date.now() + depTask.estimatedDuration * 60000
          );
        }

        blockingTasks.push(detail);
      }
    }

    return {
      blockedBy: blockingTasks.map(t => t.taskId),
      details: blockingTasks,
    };
  }

  async getReadyTasks(listId: string, limit?: number): Promise<Task[]> {
    const operation: DataOperation = {
      type: 'search',
      entity: 'task',
      filters: {
        listId,
        status: ['pending', 'in_progress'],
        isReady: true,
        limit,
      },
    };

    try {
      const tasks = (await this.delegateData(operation)) as Task[];

      // Filter tasks that have no incomplete dependencies
      const readyTasks = [];
      for (const task of tasks || []) {
        if (task.dependencies.length === 0) {
          readyTasks.push(task);
          continue;
        }

        // Check if all dependencies are completed
        let allDependenciesCompleted = true;
        for (const depId of task.dependencies) {
          const depTask = await this.getTask(depId);
          if (depTask.status !== 'completed') {
            allDependenciesCompleted = false;
            break;
          }
        }

        if (allDependenciesCompleted) {
          readyTasks.push(task);
        }

        if (limit && readyTasks.length >= limit) {
          break;
        }
      }

      return readyTasks;
    } catch (error) {
      throw this.handleError(error as Error, 'Ready Tasks Retrieval');
    }
  }

  async analyzeDependencies(listId: string): Promise<DependencyAnalysis> {
    const operation: DataOperation = {
      type: 'search',
      entity: 'task',
      filters: { listId },
    };

    try {
      const tasks = (await this.delegateData(operation)) as Task[];

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const readyTasks = await this.getReadyTasks(listId);
      const blockedTasks = totalTasks - completedTasks - readyTasks.length;

      // Build dependency chains
      const dependencyChains = tasks.map(task => ({
        taskId: task.id,
        depth: this.calculateDependencyDepth(task, tasks),
        dependencies: task.dependencies,
        dependents: tasks
          .filter(t => t.dependencies.includes(task.id))
          .map(t => t.id),
      }));

      // Find critical path (longest dependency chain)
      const criticalPath = this.findCriticalPath(tasks);

      // Identify potential bottlenecks (tasks with many dependents)
      const potentialBottlenecks = dependencyChains
        .filter(chain => chain.dependents.length > 2)
        .sort((a, b) => b.dependents.length - a.dependents.length)
        .slice(0, 5)
        .map(chain => chain.taskId);

      return {
        totalTasks,
        readyTasks: readyTasks.length,
        blockedTasks,
        completedTasks,
        dependencyChains,
        criticalPath,
        potentialBottlenecks,
      };
    } catch (error) {
      throw this.handleError(error as Error, 'Dependency Analysis');
    }
  }

  private async buildDependencyGraph(
    taskId: string,
    newDependencies: string[]
  ): Promise<DependencyGraph> {
    // This is a simplified implementation
    // In a real system, this would build the complete graph from all tasks
    const nodes = new Map();
    const edges = new Map();

    // Add the task being updated
    nodes.set(taskId, {
      id: taskId,
      dependencies: newDependencies,
    });
    edges.set(taskId, newDependencies);

    // Add dependency nodes (simplified)
    for (const depId of newDependencies) {
      const depTask = await this.getTask(depId);
      nodes.set(depId, {
        id: depId,
        dependencies: depTask.dependencies,
      });
      edges.set(depId, depTask.dependencies);
    }

    return { nodes, edges };
  }

  private calculateDependencyDepth(task: Task, allTasks: Task[]): number {
    const visited = new Set<string>();

    const dfs = (taskId: string): number => {
      if (visited.has(taskId)) {
        return 0; // Avoid infinite recursion
      }

      visited.add(taskId);
      const currentTask = allTasks.find(t => t.id === taskId);
      if (!currentTask || currentTask.dependencies.length === 0) {
        return 0;
      }

      let maxDepth = 0;
      for (const depId of currentTask.dependencies) {
        maxDepth = Math.max(maxDepth, dfs(depId) + 1);
      }

      return maxDepth;
    };

    return dfs(task.id);
  }

  private findCriticalPath(tasks: Task[]): string[] {
    // Simplified critical path calculation
    // Find the longest chain of dependencies
    let longestPath: string[] = [];

    for (const task of tasks) {
      const path = this.getTaskPath(task, tasks);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return longestPath;
  }

  private getTaskPath(task: Task, allTasks: Task[]): string[] {
    const visited = new Set<string>();

    const dfs = (taskId: string): string[] => {
      if (visited.has(taskId)) {
        return [taskId]; // Avoid infinite recursion
      }

      visited.add(taskId);
      const currentTask = allTasks.find(t => t.id === taskId);
      if (!currentTask || currentTask.dependencies.length === 0) {
        return [taskId];
      }

      let longestPath = [taskId];
      for (const depId of currentTask.dependencies) {
        const depPath = dfs(depId);
        if (depPath.length + 1 > longestPath.length) {
          longestPath = [taskId, ...depPath];
        }
      }

      return longestPath;
    };

    return dfs(task.id);
  }

  private async getTask(id: string): Promise<Task> {
    const operation: DataOperation = {
      type: 'read',
      entity: 'task',
      filters: { id },
    };

    try {
      const task = (await this.delegateData(operation)) as Task;
      if (!task) {
        throw new TaskNotFoundError(id);
      }
      return task;
    } catch (error) {
      throw this.handleError(error as Error, 'Task Retrieval');
    }
  }

  validate(_data: unknown): ValidationResult {
    // Basic validation for dependency operations
    return { isValid: true, errors: [], warnings: [] };
  }

  handleError(error: Error, context: string): OrchestrationError {
    if (error instanceof OrchestrationError) {
      return error;
    }

    return new OrchestrationError(
      error.message,
      context,
      undefined,
      undefined,
      'Check the error details and ensure all required fields are provided correctly'
    );
  }

  async delegateData(operation: DataOperation): Promise<unknown> {
    return this.dataDelegation.execute(operation);
  }
}
