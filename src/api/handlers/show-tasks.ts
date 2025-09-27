/**
 * MCP handler for formatted task display
 * 
 * Provides human-readable formatting of todo lists and tasks with multiple
 * display options including compact, detailed, and summary views.
 * Supports grouping by status or priority for better organization.
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import { TaskStatus, Priority } from '../../shared/types/todo.js';
import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

/**
 * Validation schema for show tasks request parameters
 * Configures display format, grouping options, and completion filter
 */
const ShowTasksSchema = z.object({
  listId: z.string().uuid('List ID must be a valid UUID'),
  format: z.enum(['compact', 'detailed', 'summary']).optional().default('detailed'),
  groupBy: z.enum(['status', 'priority', 'none']).optional().default('status'),
  includeCompleted: z.boolean().optional().default(true),
});

/**
 * Handles MCP show_tasks tool requests
 * 
 * Formats and displays todo list tasks in various human-readable formats.
 * Supports different display modes (compact, detailed, summary) and grouping
 * options (by status, priority, or none) for optimal readability.
 * 
 * @param request - The MCP call tool request containing display parameters
 * @param todoListManager - The todo list manager instance for list operations
 * @returns Promise<CallToolResult> - MCP response with formatted task display
 */
export async function handleShowTasks(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing show_tasks request', {
      params: request.params?.arguments,
    });

    const args = ShowTasksSchema.parse(request.params?.arguments);
    const list = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: args.includeCompleted,
    });

    if (!list) {
      logger.debug('Todo list not found for show_tasks', { listId: args.listId });
      return {
        content: [
          {
            type: 'text',
            text: `Todo list not found: ${args.listId}`,
          },
        ],
        isError: true,
      };
    }

    // Calculate dependency information
    const dependencyResolver = new DependencyResolver();
    const readyItems = dependencyResolver.getReadyItems(list.items);
    const readyItemIds = new Set(readyItems.map(item => item.id));
    
    const formattedOutput = formatTasks(list, args.format, args.groupBy, args.includeCompleted, readyItemIds);
    
    dependencyResolver.cleanup();

    logger.info('Tasks formatted successfully', {
      listId: args.listId,
      format: args.format,
      groupBy: args.groupBy,
      taskCount: list.items.length,
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedOutput,
        },
      ],
    };
  } catch (error) {
    // Use error formatting with searchDisplay configuration
    const formatError = createHandlerErrorFormatter('show_tasks', ERROR_CONFIGS.searchDisplay);
    return formatError(error, request.params?.arguments);
  }
}

/**
 * Format tasks based on the specified format and grouping options
 * 
 * Main formatting function that orchestrates the display of tasks based on
 * user preferences. Handles different formats and grouping strategies.
 * 
 * @param list - The todo list containing tasks to format
 * @param format - Display format (compact, detailed, or summary)
 * @param groupBy - Grouping strategy (status, priority, or none)
 * @param includeCompleted - Whether to include completed tasks
 * @returns string - Formatted task display text
 */
function formatTasks(
  list: any,
  format: 'compact' | 'detailed' | 'summary',
  groupBy: 'status' | 'priority' | 'none',
  includeCompleted: boolean,
  readyItemIds: Set<string>
): string {
  const lines: string[] = [];
  
  // Add list header with title and description
  lines.push(`# ${list.title}`);
  if (list.description) {
    lines.push(`${list.description}`);
  }
  lines.push('');

  // Handle summary format separately
  if (format === 'summary') {
    return formatSummary(list);
  }

  // Filter tasks based on completion status
  let tasks = list.items;
  if (!includeCompleted) {
    tasks = tasks.filter((task: any) => task.status !== TaskStatus.COMPLETED);
  }

  // Handle empty task list
  if (tasks.length === 0) {
    lines.push('No tasks to display.');
    return lines.join('\n');
  }

  // Apply grouping strategy
  if (groupBy === 'status') {
    formatTasksByStatus(tasks, lines, format, readyItemIds);
  } else if (groupBy === 'priority') {
    formatTasksByPriority(tasks, lines, format, readyItemIds);
  } else {
    formatTasksUngrouped(tasks, lines, format, readyItemIds);
  }

  return lines.join('\n');
}/**
 * Format summary view of the list
 * 
 * Creates a high-level overview of the todo list with statistics,
 * progress information, and breakdowns by status and priority.
 * 
 * @param list - The todo list to summarize
 * @returns string - Formatted summary text
 */
function formatSummary(list: any): string {
  const lines: string[] = [];
  
  lines.push(`# ${list.title} - Summary`);
  if (list.description) {
    lines.push(`${list.description}`);
  }
  lines.push('');
  
  lines.push(`**Total Tasks:** ${list.totalItems}`);
  lines.push(`**Completed:** ${list.completedItems}`);
  lines.push(`**Progress:** ${list.progress.toFixed(1)}%`);
  lines.push(`**Last Updated:** ${new Date(list.updatedAt).toLocaleDateString()}`);
  
  if (list.projectTag) {
    lines.push(`**Project:** ${list.projectTag}`);
  }
  
  lines.push('');
  
  const statusCounts = getStatusCounts(list.items);
  lines.push('**Status Breakdown:**');
  Object.entries(statusCounts).forEach(([status, count]) => {
    if (count > 0) {
      lines.push(`- ${formatStatusName(status)}: ${count}`);
    }
  });
  
  const priorityCounts = getPriorityCounts(list.items);
  lines.push('');
  lines.push('**Priority Breakdown:**');
  Object.entries(priorityCounts).forEach(([priority, count]) => {
    if (count > 0) {
      lines.push(`- ${formatPriorityName(Number(priority))}: ${count}`);
    }
  });
  
  return lines.join('\n');
}

/**
 * Format tasks grouped by status
 * 
 * Groups tasks by their current status (pending, in progress, completed, etc.)
 * and displays them in organized sections with status headers.
 * 
 * @param tasks - Array of tasks to format
 * @param lines - Output lines array to append formatted content
 * @param format - Display format (compact or detailed)
 */
function formatTasksByStatus(tasks: any[], lines: string[], format: 'compact' | 'detailed', readyItemIds: Set<string>): void {
  const tasksByStatus = groupTasksByStatus(tasks);
  const statusOrder = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.COMPLETED, TaskStatus.CANCELLED];
  
  statusOrder.forEach((status, index) => {
    const statusTasks = tasksByStatus.get(status);
    if (!statusTasks || statusTasks.length === 0) return;
    
    if (index > 0) lines.push('');
    
    lines.push(`## ${formatStatusName(status)} (${statusTasks.length})`);
    lines.push('');
    
    statusTasks.forEach(task => {
      formatSingleTask(task, lines, format, readyItemIds);
    });
  });
}

/**
 * Format tasks grouped by priority
 * 
 * Groups tasks by their priority level (critical, high, medium, low, minimal)
 * and displays them in organized sections ordered by priority importance.
 * 
 * @param tasks - Array of tasks to format
 * @param lines - Output lines array to append formatted content
 * @param format - Display format (compact or detailed)
 */
function formatTasksByPriority(tasks: any[], lines: string[], format: 'compact' | 'detailed', readyItemIds: Set<string>): void {
  const tasksByPriority = groupTasksByPriority(tasks);
  const priorityOrder = [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW, Priority.MINIMAL];
  
  priorityOrder.forEach((priority, index) => {
    const priorityTasks = tasksByPriority.get(priority);
    if (!priorityTasks || priorityTasks.length === 0) return;
    
    if (index > 0) lines.push('');
    
    lines.push(`## ${formatPriorityName(priority)} Priority (${priorityTasks.length})`);
    lines.push('');
    
    priorityTasks.forEach(task => {
      formatSingleTask(task, lines, format, readyItemIds);
    });
  });
}

/**
 * Format tasks without grouping
 * 
 * Displays all tasks in a single list without any grouping or categorization.
 * Tasks are shown in their original order from the todo list.
 * 
 * @param tasks - Array of tasks to format
 * @param lines - Output lines array to append formatted content
 * @param format - Display format (compact or detailed)
 */
function formatTasksUngrouped(tasks: any[], lines: string[], format: 'compact' | 'detailed', readyItemIds: Set<string>): void {
  lines.push(`## Tasks (${tasks.length})`);
  lines.push('');
  
  tasks.forEach(task => {
    formatSingleTask(task, lines, format, readyItemIds);
  });
}

/**
 * Format a single task for display
 * 
 * Formats an individual task based on the specified format. Compact format
 * shows one line per task, while detailed format includes multiple lines
 * with description, metadata, and creation information.
 * 
 * @param task - The task to format
 * @param lines - Output lines array to append formatted content
 * @param format - Display format (compact or detailed)
 */
function formatSingleTask(task: any, lines: string[], format: 'compact' | 'detailed', readyItemIds: Set<string>): void {
  const statusIcon = getStatusIcon(task.status);
  const priorityIcon = getPriorityIcon(task.priority);
  const dependencyIcon = getDependencyIcon(task, readyItemIds);
  
  if (format === 'compact') {
    // Compact format: one line per task
    const tags = task.tags.length > 0 ? ` [${task.tags.join(', ')}]` : '';
    const duration = task.estimatedDuration ? ` (${task.estimatedDuration}min)` : '';
    const depCount = task.dependencies.length > 0 ? ` (${task.dependencies.length} deps)` : '';
    lines.push(`${statusIcon} ${priorityIcon} ${dependencyIcon} ${task.title}${tags}${duration}${depCount}`);
  } else {
    // Detailed format: multiple lines per task
    lines.push(`${statusIcon} **${task.title}** ${priorityIcon} ${dependencyIcon}`);
    
    if (task.description) {
      lines.push(`   ${task.description}`);
    }
    
    const metadata: string[] = [];
    if (task.tags.length > 0) {
      metadata.push(`Tags: ${task.tags.join(', ')}`);
    }
    if (task.estimatedDuration) {
      metadata.push(`Duration: ${task.estimatedDuration}min`);
    }
    
    // Add dependency information
    if (task.dependencies.length > 0) {
      const isReady = readyItemIds.has(task.id);
      const depStatus = isReady ? 'Ready' : 'Blocked';
      metadata.push(`Dependencies: ${task.dependencies.length} (${depStatus})`);
    }
    
    metadata.push(`Created: ${new Date(task.createdAt).toLocaleDateString()}`);
    
    if (metadata.length > 0) {
      lines.push(`   *${metadata.join(' | ')}*`);
    }
    
    lines.push('');
  }
}

/**
 * Group tasks by status
 */
function groupTasksByStatus(tasks: any[]): Map<TaskStatus, any[]> {
  const groups = new Map<TaskStatus, any[]>();
  
  tasks.forEach(task => {
    if (!groups.has(task.status)) {
      groups.set(task.status, []);
    }
    groups.get(task.status)!.push(task);
  });
  
  return groups;
}

/**
 * Group tasks by priority
 */
function groupTasksByPriority(tasks: any[]): Map<Priority, any[]> {
  const groups = new Map<Priority, any[]>();
  
  tasks.forEach(task => {
    if (!groups.has(task.priority)) {
      groups.set(task.priority, []);
    }
    groups.get(task.priority)!.push(task);
  });
  
  return groups;
}

/**
 * Get status counts for summary
 */
function getStatusCounts(tasks: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  tasks.forEach(task => {
    counts[task.status] = (counts[task.status] || 0) + 1;
  });
  
  return counts;
}

/**
 * Get priority counts for summary
 */
function getPriorityCounts(tasks: any[]): Record<number, number> {
  const counts: Record<number, number> = {};
  
  tasks.forEach(task => {
    counts[task.priority] = (counts[task.priority] || 0) + 1;
  });
  
  return counts;
}

/**
 * Format status name for display
 */
function formatStatusName(status: string): string {
  switch (status) {
    case TaskStatus.PENDING:
      return 'Pending';
    case TaskStatus.IN_PROGRESS:
      return 'In Progress';
    case TaskStatus.COMPLETED:
      return 'Completed';
    case TaskStatus.BLOCKED:
      return 'Blocked';
    case TaskStatus.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Format priority name for display
 */
function formatPriorityName(priority: number): string {
  switch (priority) {
    case Priority.MINIMAL:
      return 'Minimal';
    case Priority.LOW:
      return 'Low';
    case Priority.MEDIUM:
      return 'Medium';
    case Priority.HIGH:
      return 'High';
    case Priority.CRITICAL:
      return 'Critical';
    default:
      return `Priority ${priority}`;
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '⏳';
    case TaskStatus.IN_PROGRESS:
      return '🔄';
    case TaskStatus.COMPLETED:
      return '✅';
    case TaskStatus.BLOCKED:
      return '🚫';
    case TaskStatus.CANCELLED:
      return '❌';
    default:
      return '📋';
  }
}

/**
 * Get priority icon
 */
function getPriorityIcon(priority: number): string {
  switch (priority) {
    case Priority.CRITICAL:
      return '🔴';
    case Priority.HIGH:
      return '🟠';
    case Priority.MEDIUM:
      return '🟡';
    case Priority.LOW:
      return '🟢';
    case Priority.MINIMAL:
      return '🔵';
    default:
      return '⚪';
  }
}

/**
 * Get dependency status icon
 */
function getDependencyIcon(task: any, readyItemIds: Set<string>): string {
  if (task.dependencies.length === 0) {
    return '🆓'; // No dependencies
  }
  
  const isReady = readyItemIds.has(task.id);
  if (isReady) {
    return '✅'; // Ready (all dependencies completed)
  } else {
    return '⛔'; // Blocked by dependencies
  }
}