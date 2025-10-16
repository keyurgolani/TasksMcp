/**
 * MCP handler for analyzing task dependencies
 * Provides user-friendly analysis of dependency structure and recommendations
 */

import { z } from 'zod';

import {
  DependencyResolver,
  type DependencyGraph,
} from '../../domain/tasks/dependency-manager.js';
import { TaskStatus, type Task } from '../../shared/types/task.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type { DependencyAnalysisResponse } from '../../shared/types/mcp-types.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';

/**
 * Generate ASCII DAG visualization
 */
function generateAsciiDAG(
  tasks: Task[],
  dependencyGraph: DependencyGraph
): string {
  const lines: string[] = [];
  lines.push('Task Dependency Graph (DAG):');
  lines.push('');

  // Group tasks by status for better visualization
  const readyTasks = tasks.filter((task: Task) => {
    const node = dependencyGraph.nodes.get(task.id);
    return node?.isReady && task.status !== TaskStatus.COMPLETED;
  });

  const blockedTasks = tasks.filter((task: Task) => {
    const node = dependencyGraph.nodes.get(task.id);
    return !node?.isReady && task.status !== TaskStatus.COMPLETED;
  });

  const completedTasks = tasks.filter(
    task => task.status === TaskStatus.COMPLETED
  );

  // Show ready tasks
  if (readyTasks.length > 0) {
    lines.push('🟢 READY TO START:');
    readyTasks.forEach(task => {
      const dependents = dependencyGraph.nodes.get(task.id)?.dependents || [];
      const dependentTitles = dependents
        .map((id: string) => tasks.find(t => t.id === id)?.title)
        .filter(Boolean)
        .slice(0, 3); // Show max 3 dependents

      const dependentInfo =
        dependentTitles.length > 0
          ? ` → [${dependentTitles.join(', ')}${
              dependents.length > 3 ? `, +${dependents.length - 3} more` : ''
            }]`
          : '';

      lines.push(`  • ${task.title}${dependentInfo}`);
    });
    lines.push('');
  }

  // Show blocked tasks with their blocking dependencies
  if (blockedTasks.length > 0) {
    lines.push('🔴 BLOCKED TASKS:');
    blockedTasks.forEach(task => {
      const node = dependencyGraph.nodes.get(task.id);
      const blockedBy = node?.blockedBy || [];
      const blockingTitles = blockedBy
        .map((id: string) => tasks.find(t => t.id === id)?.title)
        .filter(Boolean);

      const blockingInfo =
        blockingTitles.length > 0
          ? ` ← blocked by [${blockingTitles.join(', ')}]`
          : '';

      lines.push(`  • ${task.title}${blockingInfo}`);
    });
    lines.push('');
  }

  // Show completed tasks
  if (completedTasks.length > 0) {
    lines.push('✅ COMPLETED:');
    completedTasks.forEach(task => {
      lines.push(`  • ${task.title}`);
    });
    lines.push('');
  }

  // Show dependency relationships
  lines.push('DEPENDENCY RELATIONSHIPS:');
  tasks.forEach(task => {
    if (task.dependencies.length > 0) {
      const depTitles = task.dependencies
        .map((id: string) => tasks.find(t => t.id === id)?.title)
        .filter(Boolean);

      if (depTitles.length > 0) {
        lines.push(`  ${task.title} ← depends on: [${depTitles.join(', ')}]`);
      }
    }
  });

  return lines.join('\n');
}

/**
 * Generate DOT format for Graphviz
 */
function generateDotDAG(tasks: Task[]): string {
  const lines: string[] = [];
  lines.push('digraph TaskDAG {');
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, style=rounded];');
  lines.push('');

  // Define nodes with status-based styling
  tasks.forEach(task => {
    const statusColor =
      {
        [TaskStatus.COMPLETED]: 'lightgreen',
        [TaskStatus.IN_PROGRESS]: 'lightblue',
        [TaskStatus.BLOCKED]: 'lightcoral',
        [TaskStatus.PENDING]: 'lightyellow',
        [TaskStatus.CANCELLED]: 'lightgray',
      }[task.status as TaskStatus] || 'white';

    const priorityStyle = task.priority >= 4 ? ', penwidth=3' : '';
    lines.push(
      `  "${task.title}" [fillcolor=${statusColor}, style="rounded,filled"${priorityStyle}];`
    );
  });

  lines.push('');

  // Define edges (dependencies)
  tasks.forEach(task => {
    task.dependencies.forEach((depId: string) => {
      const depTask = tasks.find(t => t.id === depId);
      if (depTask) {
        lines.push(`  "${depTask.title}" -> "${task.title}";`);
      }
    });
  });

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate Mermaid format
 */
function generateMermaidDAG(tasks: Task[]): string {
  const lines: string[] = [];
  lines.push('graph TD');

  // Create node mappings for cleaner IDs
  const nodeMap = new Map<string, string>();
  tasks.forEach((task, index) => {
    nodeMap.set(task.id, `T${index + 1}`);
  });

  // Define nodes with status styling
  tasks.forEach(task => {
    const nodeId = nodeMap.get(task.id)!;
    const statusClass =
      {
        [TaskStatus.COMPLETED]: ':::completed',
        [TaskStatus.IN_PROGRESS]: ':::inProgress',
        [TaskStatus.BLOCKED]: ':::blocked',
        [TaskStatus.PENDING]: ':::pending',
        [TaskStatus.CANCELLED]: ':::cancelled',
      }[task.status as TaskStatus] || '';

    lines.push(`  ${nodeId}["${task.title}"]${statusClass}`);
  });

  lines.push('');

  // Define edges
  tasks.forEach(task => {
    const taskNodeId = nodeMap.get(task.id)!;
    task.dependencies.forEach((depId: string) => {
      const depNodeId = nodeMap.get(depId);
      if (depNodeId) {
        lines.push(`  ${depNodeId} --> ${taskNodeId}`);
      }
    });
  });

  // Add styling classes
  lines.push('');
  lines.push('  classDef completed fill:#90EE90,stroke:#333,stroke-width:2px');
  lines.push('  classDef inProgress fill:#87CEEB,stroke:#333,stroke-width:2px');
  lines.push('  classDef blocked fill:#F08080,stroke:#333,stroke-width:2px');
  lines.push('  classDef pending fill:#FFFFE0,stroke:#333,stroke-width:2px');
  lines.push('  classDef cancelled fill:#D3D3D3,stroke:#333,stroke-width:2px');

  return lines.join('\n');
}

/**
 * Validation schema for analyze task dependencies request parameters
 */
const AnalyzeTaskDependenciesSchema = z.object({
  listId: z.string().uuid(),
  format: z.enum(['analysis', 'dag', 'both']).optional().default('analysis'),
  dagStyle: z.enum(['ascii', 'dot', 'mermaid']).optional().default('ascii'),
});

/**
 * Handles MCP analyze_task_dependencies tool requests
 * Provides analysis of task dependencies with user-friendly recommendations
 *
 * @param request - The MCP call tool request containing analysis parameters
 * @param taskListManager - The task list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with dependency analysis or error
 */
export async function handleAnalyzeTaskDependencies(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  const dependencyResolver = new DependencyResolver();

  try {
    LOGGER.debug('Processing analyze_task_dependencies request', {
      params: request.params?.arguments,
    });

    const args = AnalyzeTaskDependenciesSchema.parse(request.params?.arguments);

    // Get the task list with all tasks (including completed ones for proper analysis)
    const taskList = await taskListManager.getTaskList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!taskList) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Task list with ID ${args.listId} not found`,
          },
        ],
        isError: true,
      };
    }

    // Build dependency graph for analysis
    const dependencyGraph = dependencyResolver.buildDependencyGraph(
      taskList.items
    );

    // Calculate critical path
    const criticalPath = dependencyResolver.calculateCriticalPath(
      taskList.items
    );

    // Get ready and blocked tasks
    const readyTasks = dependencyResolver.getReadyItems(taskList.items);
    const blockedTasksData = dependencyResolver.getBlockedItems(taskList.items);

    // Calculate summary data
    const totalTasks = taskList.items.length;
    const completedTasks = taskList.items.filter(
      task => task.status === TaskStatus.COMPLETED
    );
    const activeTasks = taskList.items.filter(
      task =>
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED
    );
    const tasksWithDependencies = taskList.items.filter(
      task => task.dependencies.length > 0
    );

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
        .map(id => taskList.items.find((task: Task) => task.id === id))
        .filter(
          (task: Task | undefined): task is Task =>
            task !== undefined && task.status !== TaskStatus.COMPLETED
        );

      if (criticalPathTasks.length > 0) {
        const firstIncompleteTask = criticalPathTasks[0];
        if (firstIncompleteTask) {
          recommendations.push(
            `Focus on the critical path: Start with "${
              firstIncompleteTask.title
            }" as it affects ${criticalPath.length - 1} other tasks.`
          );
        }
      }
    }

    // Ready tasks recommendations
    if (readyTasks.length === 0 && activeTasks.length > 0) {
      if (blockedTasksData.length > 0) {
        const mostBlockingTask = blockedTasksData
          .map(blocked => blocked.blockedBy)
          .flat()
          .reduce(
            (acc, task) => {
              acc[task.id] = (acc[task.id] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

        const topBlocker = Object.entries(mostBlockingTask).sort(
          ([, a], [, b]) => b - a
        )[0];

        if (topBlocker) {
          const blockerTask = taskList.items.find(
            task => task.id === topBlocker[0]
          );
          if (blockerTask) {
            recommendations.push(
              `No tasks are ready! Focus on completing "${blockerTask.title}" which is blocking ${topBlocker[1]} other tasks.`
            );
          }
        }
      } else {
        recommendations.push(
          'No tasks are ready. Check for circular dependencies or review task statuses.'
        );
      }
    } else if (readyTasks.length > 0) {
      const highPriorityReady = readyTasks.filter(
        (task: Task) => task.priority >= 4
      );
      if (highPriorityReady.length > 0) {
        recommendations.push(
          `${
            readyTasks.length
          } tasks are ready. Prioritize high-priority tasks like "${
            highPriorityReady[0]!.title
          }".`
        );
      } else {
        recommendations.push(
          `${readyTasks.length} tasks are ready to work on. Consider starting with the oldest or highest priority task.`
        );
      }
    }

    // Bottleneck recommendations
    if (bottlenecks.length > 0) {
      const bottleneckTasks = bottlenecks
        .map(id => taskList.items.find((task: Task) => task.id === id))
        .filter((task: Task | undefined): task is Task => task !== undefined);

      if (bottleneckTasks.length > 0) {
        recommendations.push(
          `Bottleneck detected: "${
            bottleneckTasks[0]!.title
          }" is blocking multiple tasks. Consider breaking it down or prioritizing it.`
        );
      }
    }

    // Circular dependency recommendations
    if (dependencyGraph.cycles.length > 0) {
      recommendations.push(
        `${dependencyGraph.cycles.length} circular dependencies detected. Review and break these cycles to unblock progress.`
      );
    }

    // Progress recommendations
    const progressPercentage =
      totalTasks > 0
        ? Math.round((completedTasks.length / totalTasks) * 100)
        : 0;
    if (progressPercentage < 25 && totalTasks > 5) {
      recommendations.push(
        'Project is in early stages. Focus on completing foundational tasks to unlock more work.'
      );
    } else if (progressPercentage > 75) {
      recommendations.push(
        'Project is nearing completion! Focus on finishing remaining tasks and final reviews.'
      );
    }

    // Build the response based on format
    let responseContent: string;

    if (args.format === 'dag') {
      // Generate DAG visualization only
      switch (args.dagStyle) {
        case 'dot':
          responseContent = generateDotDAG(taskList.items);
          break;
        case 'mermaid':
          responseContent = generateMermaidDAG(taskList.items);
          break;
        case 'ascii':
        default:
          responseContent = generateAsciiDAG(taskList.items, dependencyGraph);
          break;
      }
    } else {
      // Generate analysis response (with optional DAG)
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

      if (args.format === 'both') {
        // Include both analysis and DAG
        const dagVisualization = (() => {
          switch (args.dagStyle) {
            case 'dot':
              return generateDotDAG(taskList.items);
            case 'mermaid':
              return generateMermaidDAG(taskList.items);
            case 'ascii':
            default:
              return generateAsciiDAG(taskList.items, dependencyGraph);
          }
        })();

        responseContent =
          JSON.stringify(response, null, 2) +
          '\n\n' +
          '='.repeat(50) +
          '\n' +
          'DAG VISUALIZATION:\n' +
          '='.repeat(50) +
          '\n\n' +
          dagVisualization;
      } else {
        // Analysis only
        responseContent = JSON.stringify(response, null, 2);
      }
    }

    LOGGER.info('Task dependency analysis completed successfully', {
      listId: args.listId,
      format: args.format,
      dagStyle: args.dagStyle,
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
          text: responseContent,
        },
      ],
    };
  } catch (error) {
    // Use error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter(
      'analyze_task_dependencies',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  } finally {
    // Clean up the dependency resolver
    dependencyResolver.cleanup();
  }
}
