/**
 * MCP handler for analyzing task dependencies
 * Provides simple, user-friendly analysis of dependency structure and recommendations
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { DependencyAnalysisResponse } from '../../shared/types/mcp-types.js';
import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { TaskStatus } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

/**
 * Validation schema for analyze task dependencies request parameters
 */
const AnalyzeTaskDependenciesSchema = z.object({
  listId: z.string().uuid(),
});

/**
 * Handles MCP analyze_task_dependencies tool requests
 * Provides comprehensive analysis of task dependencies with user-friendly recommendations
 * 
 * @param request - The MCP call tool request containing analysis parameters
 * @param todoListManager - The todo list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with dependency analysis or error
 */
export async function handleAnalyzeTaskDependencies(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  const dependencyResolver = new DependencyResolver();
  
  try {
    logger.debug('Processing analyze_task_dependencies request', {
      params: request.params?.arguments,
    });

    const args = AnalyzeTaskDependenciesSchema.parse(request.params?.arguments);

    // Get the todo list with all tasks (including completed ones for proper analysis)
    const todoList = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!todoList) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Todo list with ID ${args.listId} not found`,
          },
        ],
        isError: true,
      };
    }

    // Build dependency graph for comprehensive analysis
    const dependencyGraph = dependencyResolver.buildDependencyGraph(todoList.items);
    
    // Calculate critical path
    const criticalPath = dependencyResolver.calculateCriticalPath(todoList.items);
    
    // Get ready and blocked tasks
    const readyTasks = dependencyResolver.getReadyItems(todoList.items);
    const blockedTasksData = dependencyResolver.getBlockedItems(todoList.items);
    
    // Calculate summary statistics
    const totalTasks = todoList.items.length;
    const completedTasks = todoList.items.filter(task => task.status === TaskStatus.COMPLETED);
    const activeTasks = todoList.items.filter(task => 
      task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED
    );
    const tasksWithDependencies = todoList.items.filter(task => task.dependencies.length > 0);
    
    // Identify bottlenecks (tasks that many other tasks depend on)
    const bottlenecks: string[] = [];
    for (const [nodeId, node] of dependencyGraph.nodes) {
      if (node.dependents.length >= 3 && node.status !== TaskStatus.COMPLETED) {
        bottlenecks.push(nodeId);
      }
    }

    // Generate user-friendly recommendations
    const recommendations: string[] = [];
    
    // Critical path recommendations
    if (criticalPath.length > 0) {
      const criticalPathTasks = criticalPath
        .map(id => todoList.items.find(task => task.id === id))
        .filter(task => task && task.status !== TaskStatus.COMPLETED);
      
      if (criticalPathTasks.length > 0) {
        const firstIncompleteTask = criticalPathTasks[0];
        if (firstIncompleteTask) {
          recommendations.push(`Focus on the critical path: Start with "${firstIncompleteTask.title}" as it affects ${criticalPath.length - 1} other tasks.`);
        }
      }
    }

    // Ready tasks recommendations
    if (readyTasks.length === 0 && activeTasks.length > 0) {
      if (blockedTasksData.length > 0) {
        const mostBlockingTask = blockedTasksData
          .map(blocked => blocked.blockedBy)
          .flat()
          .reduce((acc, task) => {
            acc[task.id] = (acc[task.id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        
        const topBlocker = Object.entries(mostBlockingTask)
          .sort(([,a], [,b]) => b - a)[0];
        
        if (topBlocker) {
          const blockerTask = todoList.items.find(task => task.id === topBlocker[0]);
          if (blockerTask) {
            recommendations.push(`No tasks are ready! Focus on completing "${blockerTask.title}" which is blocking ${topBlocker[1]} other tasks.`);
          }
        }
      } else {
        recommendations.push('No tasks are ready. Check for circular dependencies or review task statuses.');
      }
    } else if (readyTasks.length > 0) {
      const highPriorityReady = readyTasks.filter(task => task.priority >= 4);
      if (highPriorityReady.length > 0) {
        recommendations.push(`${readyTasks.length} tasks are ready. Prioritize high-priority tasks like "${highPriorityReady[0]!.title}".`);
      } else {
        recommendations.push(`${readyTasks.length} tasks are ready to work on. Consider starting with the oldest or highest priority task.`);
      }
    }

    // Bottleneck recommendations
    if (bottlenecks.length > 0) {
      const bottleneckTasks = bottlenecks
        .map(id => todoList.items.find(task => task.id === id))
        .filter(task => task);
      
      if (bottleneckTasks.length > 0) {
        recommendations.push(`Bottleneck alert: "${bottleneckTasks[0]!.title}" is blocking multiple tasks. Consider breaking it down or prioritizing it.`);
      }
    }

    // Circular dependency recommendations
    if (dependencyGraph.cycles.length > 0) {
      recommendations.push(`${dependencyGraph.cycles.length} circular dependencies detected. Review and break these cycles to unblock progress.`);
    }

    // Progress recommendations
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    if (progressPercentage < 25 && totalTasks > 5) {
      recommendations.push('Project is in early stages. Focus on completing foundational tasks to unlock more work.');
    } else if (progressPercentage > 75) {
      recommendations.push('Project is nearing completion! Focus on finishing remaining tasks and final reviews.');
    }

    // Dependency complexity recommendations
    const avgDependencies = tasksWithDependencies.length > 0 
      ? tasksWithDependencies.reduce((sum, task) => sum + task.dependencies.length, 0) / tasksWithDependencies.length 
      : 0;
    
    if (avgDependencies > 3) {
      recommendations.push('High dependency complexity detected. Consider simplifying task relationships or breaking down complex tasks.');
    }

    // Build the response
    const response: DependencyAnalysisResponse = {
      listId: args.listId,
      summary: {
        totalTasks,
        readyTasks: readyTasks.length,
        blockedTasks: blockedTasksData.length,
        tasksWithDependencies: tasksWithDependencies.length,
      },
      criticalPath,
      issues: {
        circularDependencies: dependencyGraph.cycles,
        bottlenecks,
      },
      recommendations,
    };

    logger.info('Task dependency analysis completed successfully', {
      listId: args.listId,
      totalTasks,
      readyTasks: readyTasks.length,
      blockedTasks: blockedTasksData.length,
      criticalPathLength: criticalPath.length,
      circularDependencies: dependencyGraph.cycles.length,
      bottlenecks: bottlenecks.length,
      recommendations: recommendations.length,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    // Use enhanced error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter('analyze_task_dependencies', ERROR_CONFIGS.taskManagement);
    return formatError(error, request.params?.arguments);
  } finally {
    // Clean up the dependency resolver
    dependencyResolver.cleanup();
  }
}