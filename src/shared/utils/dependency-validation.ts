/**
 * Shared validation utilities for dependency operations
 * Provides centralized validation logic for dependency management tools
 */

import { z } from 'zod';

import { logger } from './logger.js';

import type { Task } from '../../shared/types/task.js';

/**
 * Validation schema for dependency IDs array
 * Ensures dependencies are valid UUIDs with reasonable limits
 */
export const DependencyIdsSchema = z
  .array(z.string().uuid())
  .max(50, 'Maximum 50 dependencies allowed per task')
  .default([]);

/**
 * Validation schema for task ID parameter
 */
export const TaskIdSchema = z.string().uuid();

/**
 * Validation schema for list ID parameter
 */
export const ListIdSchema = z.string().uuid();

/**
 * Result of dependency validation
 */
export interface DependencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  circularDependencies: string[][];
}

/**
 * Validates dependency IDs for a task
 * Performs comprehensive validation including existence, circular dependencies, and self-dependencies
 *
 * @param taskId - The ID of the task to validate dependencies for
 * @param dependencyIds - Array of dependency IDs to validate
 * @param allTasks - All tasks in the list for validation context
 * @returns Validation result with errors and warnings
 */
export function validateDependencyIds(
  taskId: string,
  dependencyIds: string[],
  allTasks: Task[]
): DependencyValidationResult {
  const result: DependencyValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    circularDependencies: [],
  };

  try {
    logger.debug('Validating dependency IDs', {
      taskId,
      dependencyCount: dependencyIds.length,
      totalTasks: allTasks.length,
    });

    // Check if all dependencies exist
    const existingIds = new Set(allTasks.map(task => task.id));
    const invalidDeps = dependencyIds.filter(dep => !existingIds.has(dep));

    if (invalidDeps.length > 0) {
      result.isValid = false;
      result.errors.push(
        `Invalid dependencies: ${invalidDeps.join(', ')} do not exist`
      );
    }

    // Check for self-dependency
    if (dependencyIds.includes(taskId)) {
      result.isValid = false;
      result.errors.push('Task cannot depend on itself');
    }

    // Check for duplicate dependencies
    const uniqueDeps = new Set(dependencyIds);
    if (uniqueDeps.size !== dependencyIds.length) {
      result.warnings.push(
        'Duplicate dependencies detected and will be removed'
      );
    }

    // Check for circular dependencies
    const cycles = detectCircularDependencies(taskId, dependencyIds, allTasks);
    if (cycles.length > 0) {
      result.isValid = false;
      result.circularDependencies = cycles;
      result.errors.push(
        `Circular dependencies detected: ${cycles.map(cycle => cycle.join(' → ')).join(', ')}`
      );
    }

    // Check for dependencies on completed tasks (warning only)
    const completedDeps = dependencyIds.filter(dep => {
      const task = allTasks.find(t => t.id === dep);
      return task?.status === 'completed';
    });

    if (completedDeps.length > 0) {
      const completedTitles = completedDeps.map(dep => {
        const task = allTasks.find(t => t.id === dep);
        return task?.title ?? dep;
      });
      result.warnings.push(
        `Dependencies on completed tasks: ${completedTitles.join(', ')}`
      );
    }

    logger.debug('Dependency validation completed', {
      taskId,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      circularDependencies: result.circularDependencies.length,
    });

    return result;
  } catch (error) {
    logger.error('Failed to validate dependency IDs', { taskId, error });
    result.isValid = false;
    result.errors.push(
      `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

/**
 * Creates user-friendly error messages for dependency validation failures
 *
 * @param validation - The validation result to format
 * @returns Formatted error message with suggestions
 */
export function formatDependencyValidationError(
  validation: DependencyValidationResult
): string {
  const messages: string[] = [];

  if (validation.errors.length > 0) {
    messages.push('Dependency validation failed:');
    validation.errors.forEach(error => {
      messages.push(`  • ${error}`);
    });
  }

  if (validation.warnings.length > 0) {
    messages.push('Warnings:');
    validation.warnings.forEach(warning => {
      messages.push(`  • ${warning}`);
    });
  }

  if (validation.circularDependencies.length > 0) {
    messages.push('Circular dependencies detected:');
    validation.circularDependencies.forEach(cycle => {
      messages.push(`  • ${cycle.join(' → ')}`);
    });
  }

  // Add suggestions for common issues
  if (validation.errors.some(e => e.includes('Invalid dependencies'))) {
    messages.push('');
    messages.push('Suggestions:');
    messages.push(
      '  • Verify that all dependency task IDs exist in the same list'
    );
    messages.push('  • Check for typos in task IDs');
  }

  if (validation.errors.some(e => e.includes('Circular dependency'))) {
    messages.push('');
    messages.push('Suggestions:');
    messages.push(
      '  • Remove one or more dependencies to break the circular chain'
    );
    messages.push(
      '  • Consider restructuring tasks to avoid circular dependencies'
    );
  }

  return messages.join('\n');
}

/**
 * Detects circular dependencies using depth-first search
 *
 * @param taskId - The ID of the task to check dependencies for
 * @param newDependencies - Array of new dependency IDs to validate
 * @param allTasks - All tasks in the list for validation context
 * @returns Array of circular dependency chains found
 */
export function detectCircularDependencies(
  taskId: string,
  newDependencies: string[],
  allTasks: Task[]
): string[][] {
  const cycles: string[][] = [];

  try {
    // Create a dependency map including the new dependencies
    const dependencyMap = new Map<string, string[]>();

    // Add existing dependencies from all tasks
    for (const task of allTasks) {
      dependencyMap.set(task.id, [...task.dependencies]);
    }

    // Add or update the task with new dependencies
    dependencyMap.set(taskId, [...newDependencies]);

    // Use DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string): boolean => {
      if (recursionStack.has(currentId)) {
        // Found a cycle - extract the cycle from the path
        const cycleStart = path.indexOf(currentId);
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), currentId];
          cycles.push(cycle);
        }
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);
      recursionStack.add(currentId);
      path.push(currentId);

      const dependencies = dependencyMap.get(currentId) ?? [];
      for (const dep of dependencies) {
        if (dfs(dep)) {
          // Continue searching for more cycles
        }
      }

      recursionStack.delete(currentId);
      path.pop();
      return false;
    };

    // Check for cycles starting from all nodes
    for (const [nodeId] of dependencyMap) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    logger.debug('Circular dependency detection completed', {
      taskId,
      cyclesFound: cycles.length,
    });

    return cycles;
  } catch (error) {
    logger.error('Failed to detect circular dependencies', { taskId, error });
    return [];
  }
}

/**
 * Centralized dependency validation function with comprehensive error handling
 * This is the main validation function that should be used by all dependency management tools
 *
 * @param taskId - The ID of the task to validate dependencies for
 * @param dependencyIds - Array of dependency IDs to validate
 * @param allTasks - All tasks in the list for validation context
 * @returns Comprehensive validation result with detailed error information
 */
export function validateTaskDependencies(
  taskId: string,
  dependencyIds: string[],
  allTasks: Task[]
): DependencyValidationResult {
  try {
    // Validate input parameters first
    if (!allTasks) {
      return {
        isValid: false,
        errors: ['Validation failed: allTasks parameter is required'],
        warnings: [],
        circularDependencies: [],
      };
    }

    logger.info('Starting comprehensive dependency validation', {
      taskId,
      dependencyCount: dependencyIds?.length ?? 0,
      totalTasks: allTasks.length,
    });

    // First validate the input parameters
    const taskIdValidation = TaskIdSchema.safeParse(taskId);
    if (!taskIdValidation.success) {
      return {
        isValid: false,
        errors: ['Invalid task ID format'],
        warnings: [],
        circularDependencies: [],
      };
    }

    const dependencyIdsValidation =
      DependencyIdsSchema.safeParse(dependencyIds);
    if (!dependencyIdsValidation.success) {
      return {
        isValid: false,
        errors: dependencyIdsValidation.error.issues.map(e => e.message),
        warnings: [],
        circularDependencies: [],
      };
    }

    // Perform the main validation
    const result = validateDependencyIds(taskId, dependencyIds, allTasks);

    logger.info('Dependency validation completed', {
      taskId,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      circularDependencyCount: result.circularDependencies.length,
    });

    return result;
  } catch (error) {
    logger.error('Dependency validation failed with exception', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      isValid: false,
      errors: [
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings: [],
      circularDependencies: [],
    };
  }
}

/**
 * Creates user-friendly error responses with suggestions for fixing issues
 *
 * @param validation - The validation result to format
 * @param taskId - The task ID for context in error messages
 * @returns Formatted error response with actionable suggestions
 */
export function createDependencyErrorResponse(
  validation: DependencyValidationResult,
  taskId: string
): {
  error: string;
  message: string;
  code: string;
  details: {
    taskId: string;
    invalidDependencies?: string[];
    circularChains?: string[][];
    suggestions: string[];
  };
} {
  const suggestions: string[] = [];
  const invalidDependencies: string[] = [];
  const circularChains = validation.circularDependencies;

  // Extract invalid dependencies from error messages
  validation.errors.forEach(error => {
    if (error.includes('Invalid dependencies:')) {
      const match = error.match(/Invalid dependencies: (.+) do not exist/);
      if (match && match[1]) {
        invalidDependencies.push(...match[1].split(', '));
      }
    }
  });

  // Generate specific suggestions based on error types
  if (validation.errors.some(e => e.includes('Invalid dependencies'))) {
    suggestions.push(
      'Verify that all dependency task IDs exist in the same list'
    );
    suggestions.push('Check for typos in task IDs');
    suggestions.push('Use the get_list tool to see all available task IDs');
  }

  if (validation.errors.some(e => e.includes('cannot depend on itself'))) {
    suggestions.push('Remove the task ID from its own dependencies list');
    suggestions.push('Tasks cannot have themselves as dependencies');
  }

  if (validation.circularDependencies.length > 0) {
    suggestions.push(
      'Remove one or more dependencies to break the circular chain'
    );
    suggestions.push(
      'Consider restructuring tasks to avoid circular dependencies'
    );
    suggestions.push(
      'Use the analyze_task_dependencies tool to visualize the dependency graph'
    );
  }

  if (validation.warnings.some(w => w.includes('completed tasks'))) {
    suggestions.push(
      'Consider removing dependencies on completed tasks as they are already done'
    );
  }

  if (validation.warnings.some(w => w.includes('Duplicate dependencies'))) {
    suggestions.push('Remove duplicate dependencies from the list');
  }

  // Determine error code based on primary issue
  let errorCode = 'DEPENDENCY_VALIDATION_ERROR';
  if (validation.circularDependencies.length > 0) {
    errorCode = 'CIRCULAR_DEPENDENCY_ERROR';
  } else if (invalidDependencies.length > 0) {
    errorCode = 'INVALID_DEPENDENCY_ERROR';
  } else if (
    validation.errors.some(e => e.includes('cannot depend on itself'))
  ) {
    errorCode = 'SELF_DEPENDENCY_ERROR';
  }

  const details: {
    taskId: string;
    invalidDependencies?: string[];
    circularChains?: string[][];
    suggestions: string[];
  } = {
    taskId,
    suggestions,
  };

  if (invalidDependencies.length > 0) {
    details.invalidDependencies = invalidDependencies;
  }

  if (circularChains.length > 0) {
    details.circularChains = circularChains;
  }

  return {
    error: 'Dependency validation failed',
    message: formatDependencyValidationError(validation),
    code: errorCode,
    details,
  };
}

/**
 * Removes duplicate dependency IDs while preserving order
 *
 * @param dependencyIds - Array of dependency IDs that may contain duplicates
 * @returns Array with duplicates removed
 */
export function deduplicateDependencies(dependencyIds: string[]): string[] {
  return Array.from(new Set(dependencyIds));
}
