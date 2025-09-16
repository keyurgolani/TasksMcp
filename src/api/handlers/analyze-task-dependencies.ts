/**
 * MCP handler for analyzing task dependencies
 * Provides simple, user-friendly analysis of dependency structure and recommendations
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { DependencyAnalysisResponse } from '../../shared/types/mcp-types.js';
import { DependencyResolver, type DependencyGraph } from '../../domain/tasks/dependency-manager.js';
import { TaskStatus, type TodoItem } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

/**
 * Generate ASCII DAG visualization
 */
function generateAsciiDAG(tasks: TodoItem[], dependencyGraph: DependencyGraph): string {
  const lines: string[] = [];
  lines.push('Task Dependency Graph (DAG):');
  lines.push('');
  
  // Group tasks by status for better visualization
  const readyTasks = tasks.filter(task => {
    const node = dependencyGraph.nodes.get(task.id);
    return node?.isReady && task.status !== TaskStatus.COMPLETED;
  });
  
  const blockedTasks = tasks.filter(task => {
    const node = dependencyGraph.nodes.get(task.id);
    return !node?.isReady && task.status !== TaskStatus.COMPLETED;
  });
  
  const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED);
  
  // Show ready tasks
  if (readyTasks.length > 0) {
    lines.push('🟢 READY TO START:');
    readyTasks.forEach(task => {
      const dependents = dependencyGraph.nodes.get(task.id)?.dependents || [];
      const dependentTitles = dependents
        .map((id: string) => tasks.find(t => t.id === id)?.title)
        .filter(Boolean)
        .slice(0, 3); // Show max 3 dependents
      
      const dependentInfo = dependentTitles.length > 0 
        ? ` → [${dependentTitles.join(', ')}${dependents.length > 3 ? `, +${dependents.length - 3} more` : ''}]`
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
      
      const blockingInfo = blockingTitles.length > 0 
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
function generateDotDAG(tasks: TodoItem[]): string {
  const lines: string[] = [];
  lines.push('digraph TaskDAG {');
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, style=rounded];');
  lines.push('');
  
  // Define nodes with status-based styling
  tasks.forEach(task => {
    const statusColor = {
      [TaskStatus.COMPLETED]: 'lightgreen',
      [TaskStatus.IN_PROGRESS]: 'lightblue',
      [TaskStatus.BLOCKED]: 'lightcoral',
      [TaskStatus.PENDING]: 'lightyellow',
      [TaskStatus.CANCELLED]: 'lightgray'
    }[task.status as TaskStatus] || 'white';
    
    const priorityStyle = task.priority >= 4 ? ', penwidth=3' : '';
    lines.push(`  "${task.title}" [fillcolor=${statusColor}, style="rounded,filled"${priorityStyle}];`);
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
function generateMermaidDAG(tasks: TodoItem[]): string {
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
    const statusClass = {
      [TaskStatus.COMPLETED]: ':::completed',
      [TaskStatus.IN_PROGRESS]: ':::inProgress',
      [TaskStatus.BLOCKED]: ':::blocked',
      [TaskStatus.PENDING]: ':::pending',
      [TaskStatus.CANCELLED]: ':::cancelled'
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

    // Build the response based on format
    let responseContent: string;
    
    if (args.format === 'dag') {
      // Generate DAG visualization only
      switch (args.dagStyle) {
        case 'dot':
          responseContent = generateDotDAG(todoList.items);
          break;
        case 'mermaid':
          responseContent = generateMermaidDAG(todoList.items);
          break;
        case 'ascii':
        default:
          responseContent = generateAsciiDAG(todoList.items, dependencyGraph);
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
              return generateDotDAG(todoList.items);
            case 'mermaid':
              return generateMermaidDAG(todoList.items);
            case 'ascii':
            default:
              return generateAsciiDAG(todoList.items, dependencyGraph);
          }
        })();
        
        responseContent = JSON.stringify(response, null, 2) + '\n\n' + 
                         '='.repeat(50) + '\n' +
                         'DAG VISUALIZATION:\n' +
                         '='.repeat(50) + '\n\n' +
                         dagVisualization;
      } else {
        // Analysis only
        responseContent = JSON.stringify(response, null, 2);
      }
    }

    logger.info('Task dependency analysis completed successfully', {
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
    // Use enhanced error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter('analyze_task_dependencies', ERROR_CONFIGS.taskManagement);
    return formatError(error, request.params?.arguments);
  } finally {
    // Clean up the dependency resolver
    dependencyResolver.cleanup();
  }
}