/**
 * Dependency resolution and validation for task items
 */

import { TaskStatus, type Task } from '../../shared/types/task.js';
import { logger } from '../../shared/utils/logger.js';

import type { ITaskListRepository } from '../repositories/task-list.repository.js';

export interface DependencyNode {
  id: string;
  title: string;
  status: TaskStatus;
  dependencies: string[];
  dependents: string[];
  depth: number;
  isReady: boolean;
  blockedBy: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  roots: string[]; // Items with no dependencies
  leaves: string[]; // Items with no dependents
  cycles: string[][]; // Circular dependency chains
  readyItems: string[]; // Items ready to be worked on
  blockedItems: string[]; // Items blocked by dependencies
}

export interface DependencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  circularDependencies: string[][];
}

/**
 * DependencyResolver manages task dependencies and validates dependency graphs
 *
 * This class provides functionality to:
 * - Validate task dependencies and detect circular dependencies
 * - Build and analyze dependency graphs
 * - Calculate task readiness based on dependency completion
 * - Provide detailed dependency analysis and blocking reasons
 */
export class DependencyResolver {
  // Repository for future multi-source dependency resolution
  // Currently unused but prepared for future enhancements
  private readonly repository: ITaskListRepository | undefined;

  constructor(repository?: ITaskListRepository) {
    this.repository = repository;

    logger.debug('DependencyResolver initialized', {
      hasRepository: !!repository,
    });
  }

  /**
   * Gets the repository instance if available
   * @returns The repository instance or undefined
   */
  getRepository(): ITaskListRepository | undefined {
    return this.repository;
  }
  /**
   * Validates dependencies for a task item
   */
  validateDependencies(
    itemId: string,
    dependencies: string[],
    allItems: Task[]
  ): DependencyValidationResult {
    const result: DependencyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      circularDependencies: [],
    };

    try {
      logger.debug('Validating dependencies', {
        itemId,
        dependencies,
        totalItems: allItems.length,
      });

      // Check if all dependencies exist
      const existingIds = new Set(allItems.map(item => item.id));
      const invalidDeps = dependencies.filter(dep => !existingIds.has(dep));

      if (invalidDeps.length > 0) {
        result.isValid = false;
        result.errors.push(
          `Invalid dependencies: ${invalidDeps.join(', ')} do not exist`
        );
      }

      // Check for self-dependency
      if (dependencies.includes(itemId)) {
        result.isValid = false;
        result.errors.push('Item cannot depend on itself');
      }

      // Check for circular dependencies
      const cycles = this.detectCircularDependencies(
        itemId,
        dependencies,
        allItems
      );
      if (cycles.length > 0) {
        result.isValid = false;
        result.circularDependencies = cycles;

        // Provide detailed error messages for each cycle
        const cycleDescriptions = cycles.map(cycle => {
          const cycleChain = cycle.join(' → ');
          return `${cycleChain} (creates infinite loop)`;
        });

        result.errors.push(
          `Circular dependencies detected: ${cycleDescriptions.join('; ')}. Remove one dependency from each cycle to resolve.`
        );
      }

      // Check for dependencies on completed items (warning only)
      const completedDeps = dependencies.filter(dep => {
        const item = allItems.find(i => i.id === dep);
        return item?.status === TaskStatus.COMPLETED;
      });

      if (completedDeps.length > 0) {
        const completedTitles = completedDeps.map(dep => {
          const item = allItems.find(i => i.id === dep);
          return item?.title ?? dep;
        });
        result.warnings.push(
          `Dependencies on completed items: ${completedTitles.join(', ')}`
        );
      }

      logger.debug('Dependency validation completed', {
        itemId,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to validate dependencies', {
        itemId,
        dependencies,
        error,
      });
      result.isValid = false;
      result.errors.push(
        `Validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return result;
    }
  }

  /**
   * Detects circular dependencies using optimized depth-first search
   * Implements O(V + E) algorithm where V is vertices (tasks) and E is edges (dependencies)
   */
  detectCircularDependencies(
    itemId: string,
    newDependencies: string[],
    allItems: Task[]
  ): string[][] {
    const cycles: string[][] = [];

    try {
      // Create a dependency map including the new dependencies
      const dependencyMap = new Map<string, string[]>();

      // Add existing dependencies for all items
      for (const item of allItems) {
        dependencyMap.set(item.id, [...item.dependencies]);
      }

      // Add or update the item with new dependencies
      dependencyMap.set(itemId, [...newDependencies]);

      // Optimized DFS for cycle detection - O(V + E) complexity
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const dfs = (currentId: string, path: string[]): boolean => {
        // If we encounter a node in the recursion stack, we found a cycle
        if (recursionStack.has(currentId)) {
          const cycleStart = path.indexOf(currentId);
          if (cycleStart !== -1) {
            const cycle = [...path.slice(cycleStart), currentId];
            cycles.push(cycle);
          }
          return true;
        }

        // If already visited and not in recursion stack, no cycle from this path
        if (visited.has(currentId)) {
          return false;
        }

        // Mark as visited and add to recursion stack
        visited.add(currentId);
        recursionStack.add(currentId);

        // Explore all dependencies
        const dependencies = dependencyMap.get(currentId) ?? [];
        for (const dep of dependencies) {
          // Only process dependencies that exist in our task set
          if (dependencyMap.has(dep)) {
            const newPath = [...path, currentId];
            if (dfs(dep, newPath)) {
              // Found a cycle, continue to find all cycles
            }
          }
        }

        // Remove from recursion stack when backtracking
        recursionStack.delete(currentId);
        return false;
      };

      // Check for cycles starting from all nodes to ensure we find all strongly connected components
      for (const [nodeId] of dependencyMap) {
        if (!visited.has(nodeId)) {
          dfs(nodeId, []);
        }
      }

      logger.debug('Circular dependency detection completed', {
        itemId,
        cyclesFound: cycles.length,
        totalNodes: dependencyMap.size,
        totalEdges: Array.from(dependencyMap.values()).reduce(
          (sum, deps) => sum + deps.length,
          0
        ),
      });

      return cycles;
    } catch (error) {
      logger.error('Failed to detect circular dependencies', { itemId, error });
      return [];
    }
  }

  /**
   * Builds a complete dependency graph for all items
   */
  buildDependencyGraph(items: Task[]): DependencyGraph {
    try {
      logger.debug('Building dependency graph', { itemCount: items.length });

      const nodes = new Map<string, DependencyNode>();
      const dependentMap = new Map<string, Set<string>>();

      // Initialize nodes and build dependent map
      for (const item of items) {
        nodes.set(item.id, {
          id: item.id,
          title: item.title,
          status: item.status,
          dependencies: [...item.dependencies],
          dependents: [],
          depth: 0,
          isReady: false,
          blockedBy: [],
        });

        // Build reverse dependency map (who depends on this item)
        for (const dep of item.dependencies) {
          if (!dependentMap.has(dep)) {
            dependentMap.set(dep, new Set());
          }
          const dependentSet = dependentMap.get(dep);
          if (dependentSet !== undefined) {
            dependentSet.add(item.id);
          }
        }
      }

      // Set dependents for each node
      for (const [nodeId, node] of nodes) {
        const dependents = dependentMap.get(nodeId);
        if (dependents !== undefined) {
          node.dependents = Array.from(dependents);
        }
      }

      // Calculate depths and readiness
      this.calculateDepths(nodes);
      this.calculateReadiness(nodes);

      // Find roots and leaves
      const roots = Array.from(nodes.values())
        .filter(node => node.dependencies.length === 0)
        .map(node => node.id);

      const leaves = Array.from(nodes.values())
        .filter(node => node.dependents.length === 0)
        .map(node => node.id);

      // Detect cycles in the entire graph
      const cycles = this.detectAllCycles(nodes);

      // Get ready and blocked items
      const readyItems = Array.from(nodes.values())
        .filter(node => node.isReady)
        .map(node => node.id);

      const blockedItems = Array.from(nodes.values())
        .filter(node => !node.isReady && node.status !== TaskStatus.COMPLETED)
        .map(node => node.id);

      const graph: DependencyGraph = {
        nodes,
        roots,
        leaves,
        cycles,
        readyItems,
        blockedItems,
      };

      logger.info('Dependency graph built successfully', {
        nodeCount: nodes.size,
        rootCount: roots.length,
        leafCount: leaves.length,
        cycleCount: cycles.length,
        readyCount: readyItems.length,
        blockedCount: blockedItems.length,
      });

      return graph;
    } catch (error) {
      logger.error('Failed to build dependency graph', { error });
      throw error;
    }
  }

  /**
   * Calculates the depth of each node in the dependency graph
   */
  private calculateDepths(nodes: Map<string, DependencyNode>): void {
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        return nodes.get(nodeId)?.depth ?? 0;
      }

      visited.add(nodeId);
      const node = nodes.get(nodeId);
      if (!node) return 0;

      if (node.dependencies.length === 0) {
        node.depth = 0;
        return 0;
      }

      let maxDepth = 0;
      for (const depId of node.dependencies) {
        const depDepth = calculateDepth(depId);
        maxDepth = Math.max(maxDepth, depDepth + 1);
      }

      node.depth = maxDepth;
      return maxDepth;
    };

    for (const nodeId of nodes.keys()) {
      calculateDepth(nodeId);
    }
  }

  /**
   * Calculates which items are ready to be worked on
   */
  private calculateReadiness(nodes: Map<string, DependencyNode>): void {
    for (const node of nodes.values()) {
      // An item is ready if:
      // 1. It's not completed
      // 2. All its dependencies are completed
      // 3. It's not currently blocked

      if (node.status === TaskStatus.COMPLETED) {
        node.isReady = false;
        node.blockedBy = [];
        continue;
      }

      const blockedBy: string[] = [];
      let allDepsCompleted = true;

      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode === undefined || depNode.status !== TaskStatus.COMPLETED) {
          allDepsCompleted = false;
          if (depNode !== undefined) {
            blockedBy.push(depId);
          }
        }
      }

      node.isReady = allDepsCompleted && node.status !== TaskStatus.BLOCKED;
      node.blockedBy = blockedBy;
    }
  }

  /**
   * Detects all cycles in the dependency graph
   */
  private detectAllCycles(nodes: Map<string, DependencyNode>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), nodeId];
          cycles.push(cycle);
        }
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = nodes.get(nodeId);
      if (node !== undefined) {
        for (const depId of node.dependencies) {
          dfs(depId);
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
    };

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Gets items that are ready to be worked on (no blocking dependencies)
   */
  getReadyItems(items: Task[]): Task[] {
    try {
      const readyItems: Task[] = [];

      for (const item of items) {
        // Skip completed items
        if (item.status === TaskStatus.COMPLETED) {
          continue;
        }

        // Skip blocked items
        if (item.status === TaskStatus.BLOCKED) {
          continue;
        }

        // Check if all dependencies are completed
        const allDepsCompleted = item.dependencies.every(depId => {
          const depItem = items.find(i => i.id === depId);
          return depItem?.status === TaskStatus.COMPLETED;
        });

        if (allDepsCompleted) {
          readyItems.push(item);
        }
      }

      logger.debug('Ready items calculated', {
        totalItems: items.length,
        readyCount: readyItems.length,
      });

      return readyItems;
    } catch (error) {
      logger.error('Failed to get ready items', { error });
      return [];
    }
  }

  /**
   * Gets items that are blocked by dependencies
   */
  getBlockedItems(items: Task[]): Array<{ item: Task; blockedBy: Task[] }> {
    try {
      const blockedItems: Array<{ item: Task; blockedBy: Task[] }> = [];

      for (const item of items) {
        // Skip completed items
        if (item.status === TaskStatus.COMPLETED) {
          continue;
        }

        // Find incomplete dependencies
        const incompleteDeps = item.dependencies
          .map(depId => items.find(i => i.id === depId))
          .filter(
            (depItem): depItem is Task =>
              depItem !== undefined && depItem.status !== TaskStatus.COMPLETED
          );

        if (incompleteDeps.length > 0) {
          blockedItems.push({
            item,
            blockedBy: incompleteDeps,
          });
        }
      }

      logger.debug('Blocked items calculated', {
        totalItems: items.length,
        blockedCount: blockedItems.length,
      });

      return blockedItems;
    } catch (error) {
      logger.error('Failed to get blocked items', { error });
      return [];
    }
  }

  /**
   * Calculates the critical path through the dependency graph
   */
  calculateCriticalPath(items: Task[]): string[] {
    try {
      const graph = this.buildDependencyGraph(items);

      // Find the longest path from any root to any leaf
      let longestPath: string[] = [];
      let maxLength = 0;

      const findLongestPath = (nodeId: string, currentPath: string[]): void => {
        const node = graph.nodes.get(nodeId);
        if (!node) return;

        const newPath = [...currentPath, nodeId];

        // If this is a leaf node, check if it's the longest path
        if (node.dependents.length === 0) {
          if (newPath.length > maxLength) {
            maxLength = newPath.length;
            longestPath = [...newPath];
          }
          return;
        }

        // Continue to dependents
        for (const dependentId of node.dependents) {
          findLongestPath(dependentId, newPath);
        }
      };

      // Start from all root nodes
      for (const rootId of graph.roots) {
        findLongestPath(rootId, []);
      }

      logger.debug('Critical path calculated', {
        pathLength: longestPath.length,
        path: longestPath,
      });

      return longestPath;
    } catch (error) {
      logger.error('Failed to calculate critical path', { error });
      return [];
    }
  }

  /**
   * Calculates the block reason for a specific task
   */
  calculateBlockReason(
    taskId: string,
    items: Task[]
  ): import('../models/task.js').BlockReason | undefined {
    try {
      const task = items.find(item => item.id === taskId);
      if (!task) {
        logger.warn('Task not found for block reason calculation', { taskId });
        return undefined;
      }

      // If task is completed or has no dependencies, it's not blocked
      if (
        task.status === TaskStatus.COMPLETED ||
        task.dependencies.length === 0
      ) {
        return undefined;
      }

      // Find incomplete dependencies
      const incompleteDeps = task.dependencies
        .map(depId => items.find(i => i.id === depId))
        .filter(
          (depItem): depItem is Task =>
            depItem !== undefined && depItem.status !== TaskStatus.COMPLETED
        );

      // If all dependencies are complete, task is not blocked
      if (incompleteDeps.length === 0) {
        return undefined;
      }

      // Build block reason with details
      const blockedBy = incompleteDeps.map(dep => dep.id);
      const details = incompleteDeps.map(dep => {
        const detail: {
          taskId: string;
          taskTitle: string;
          status: TaskStatus;
          estimatedCompletion?: Date;
        } = {
          taskId: dep.id,
          taskTitle: dep.title,
          status: dep.status,
        };

        if (dep.estimatedDuration) {
          detail.estimatedCompletion = new Date(
            Date.now() + dep.estimatedDuration * 60 * 1000
          );
        }

        return detail;
      });

      const blockReason: import('../models/task.js').BlockReason = {
        blockedBy,
        details,
      };

      logger.debug('Block reason calculated', {
        taskId,
        blockedByCount: blockedBy.length,
        details: details.map(d => ({
          id: d.taskId,
          title: d.taskTitle,
          status: d.status,
        })),
      });

      return blockReason;
    } catch (error) {
      logger.error('Failed to calculate block reason', { taskId, error });
      return undefined;
    }
  }

  /**
   * Clean up internal resources
   */
  cleanup(): void {
    logger.debug('DependencyResolver cleanup completed');
  }
}
