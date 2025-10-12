/**
 * Pretty Print Formatter for Human-Readable Task and List Display
 *
 * Provides comprehensive formatting capabilities for todo lists and tasks with:
 * - Multiple output formats (compact, detailed, grouped)
 * - Progress visualization with bars and statistics
 * - Color support for terminal output
 * - Caching for performance optimization
 * - Lazy loading for large datasets
 * - Customizable formatting options
 *
 * Key Features:
 * - Status and priority icons with color coding
 * - Action plan step-by-step formatting
 * - Implementation notes with type indicators
 * - Flexible grouping (by status, priority, project)
 * - Performance optimization and caching
 * - Responsive width handling
 */

import {
  type TodoList,
  type TodoItem,
  type ActionPlan,
  type ActionStep,
  type ImplementationNote,
  TaskStatus,
  Priority,
} from '../types/todo.js';

import { logger } from './logger.js';

/**
 * Configuration options for formatting output
 * Controls all aspects of how tasks and lists are displayed
 */
export interface FormatOptions {
  includeNotes: boolean; // Whether to include implementation notes
  includeActionPlans: boolean; // Whether to include action plan details
  includeProgress: boolean; // Whether to show progress bars and percentages
  colorize: boolean; // Whether to use ANSI color codes for terminal output
  maxWidth: number; // Maximum character width for output lines
  groupBy: 'status' | 'priority' | 'project' | 'none'; // How to group tasks
  showSummary: boolean; // Whether to show list summary information
  compactMode: boolean; // Whether to use compact single-line format
  showIds: boolean; // Whether to display entity IDs
  truncateNotes: number; // Maximum characters for notes display
  maxItems?: number; // Maximum number of items to format (for performance)
  lazyLoad?: boolean; // Enable lazy loading for large datasets
  chunkSize?: number; // Size of chunks for processing large datasets
  enableCaching?: boolean; // Enable result caching for performance
}

/**
 * Result of formatting operations
 * Contains the formatted content plus metadata about the formatting process
 */
export interface FormattedOutput {
  content: string; // The formatted text content
  metadata: {
    totalLines: number; // Number of lines in the output
    totalCharacters: number; // Total character count
    groupCount: number; // Number of groups in the output
    itemCount: number; // Number of items formatted
    processingTime?: number; // Time taken to process in milliseconds
    wasTruncated?: boolean; // Whether the output was truncated due to limits
    cacheHits?: number; // Number of cache hits during processing
  };
  chunks?: Array<{
    content: string; // Content of this chunk
    itemCount: number; // Number of items in this chunk
    startIndex: number; // Starting index in the original array
    endIndex: number; // Ending index in the original array
  }>; // Chunks for lazy loading large datasets
}

/**
 * Main formatter class for creating human-readable output
 * Handles formatting of todo lists, tasks, and summaries with extensive customization options
 */
export class PrettyPrintFormatter {
  /** Default formatting options optimized for readability and compatibility */
  private readonly defaultOptions: FormatOptions = {
    includeNotes: true,
    includeActionPlans: true,
    includeProgress: true,
    colorize: false, // Default to false for compatibility with non-terminal output
    maxWidth: 80,
    groupBy: 'status',
    showSummary: true,
    compactMode: false,
    showIds: false,
    truncateNotes: 200,
  };

  /** Cache for formatted results to improve performance on repeated requests */
  private cache = new Map<
    string,
    { result: FormattedOutput; timestamp: number }
  >();
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout

  /**
   * Formats a complete todo list with all its tasks and metadata
   * Supports grouping, filtering, caching, and lazy loading for large datasets
   *
   * @param list - The todo list to format
   * @param options - Formatting options to customize the output
   * @returns FormattedOutput - The formatted content with metadata
   */
  formatTaskList(
    list: TodoList,
    options: Partial<FormatOptions> = {}
  ): FormattedOutput {
    const startTime = performance.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Check cache if enabled
      if (opts.enableCaching) {
        const cacheKey = this.generateCacheKey(list, opts);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.cacheHits++;
          cached.metadata.cacheHits = this.cacheHits;
          return cached;
        }
      }

      const lines: string[] = [];
      let itemsToProcess = list.items;
      let wasTruncated = false;
      let chunks: Array<{
        content: string;
        itemCount: number;
        startIndex: number;
        endIndex: number;
      }> = [];

      // Apply maxItems limit
      if (opts.maxItems && list.items.length > opts.maxItems) {
        itemsToProcess = list.items.slice(0, opts.maxItems);
        wasTruncated = true;
      }

      // Header section
      lines.push(this.formatListHeader(list, opts));
      lines.push('');

      // Summary section
      if (opts.showSummary) {
        lines.push(this.formatListSummary(list, opts));
        lines.push('');
      }

      // List-level notes
      if (opts.includeNotes && list.implementationNotes?.length > 0) {
        lines.push(this.formatSectionHeader('List Notes', opts));
        list.implementationNotes.forEach(note => {
          lines.push(this.formatNote(note, opts, '  '));
        });
        lines.push('');
      }

      // Tasks section with chunking support
      if (itemsToProcess.length > 0) {
        if (opts.lazyLoad && opts.chunkSize) {
          chunks = this.formatTasksInChunks(itemsToProcess, opts);
          const allChunkContent = chunks.map(chunk => chunk.content).join('\n');
          lines.push(allChunkContent);
        } else {
          const formattedTasks = this.formatTasksWithGrouping(
            itemsToProcess,
            opts
          );
          lines.push(...formattedTasks);
        }
      } else {
        lines.push(this.formatEmptyState(opts));
      }

      const content = lines.join('\n');
      const processingTime = performance.now() - startTime;

      const result: FormattedOutput = {
        content,
        metadata: {
          totalLines: lines.length,
          totalCharacters: content.length,
          groupCount: this.calculateGroupCount(itemsToProcess, opts.groupBy),
          itemCount: itemsToProcess.length,
          processingTime,
          wasTruncated,
          cacheHits: this.cacheHits,
        },
        ...(chunks.length > 0 && { chunks }),
      };

      // Cache result if enabled
      if (opts.enableCaching) {
        const cacheKey = this.generateCacheKey(list, opts);
        this.setInCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      logger.error('Failed to format task list', { listId: list.id, error });
      return this.formatError('Failed to format task list', error);
    }
  }

  /**
   * Format a single task item
   */
  formatTask(
    task: TodoItem,
    options: Partial<FormatOptions> = {}
  ): FormattedOutput {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const lines: string[] = [];

      // Task header with status and priority
      lines.push(this.formatTaskHeader(task, opts));

      // Task description
      if (task.description && !opts.compactMode) {
        lines.push(this.formatTaskDescription(task.description, opts));
      }

      // Task metadata (tags, duration, etc.)
      if (!opts.compactMode) {
        const metadata = this.formatTaskMetadata(task, opts);
        if (metadata) {
          lines.push(metadata);
        }
      }

      // Action plan
      if (opts.includeActionPlans && task.actionPlan) {
        lines.push('');
        lines.push(this.formatActionPlan(task.actionPlan, opts));
      }

      // Implementation notes
      if (opts.includeNotes && task.implementationNotes?.length > 0) {
        lines.push('');
        lines.push(this.formatSectionHeader('Notes', opts, '  '));
        task.implementationNotes.forEach(note => {
          lines.push(this.formatNote(note, opts, '    '));
        });
      }

      const content = lines.join('\n');

      return {
        content,
        metadata: {
          totalLines: lines.length,
          totalCharacters: content.length,
          groupCount: 1,
          itemCount: 1,
        },
      };
    } catch (error) {
      logger.error('Failed to format task', { taskId: task.id, error });
      return this.formatError('Failed to format task', error);
    }
  }

  /**
   * Format a summary of multiple tasks
   */
  formatTaskSummary(
    tasks: TodoItem[],
    options: Partial<FormatOptions> = {}
  ): FormattedOutput {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const lines: string[] = [];

      // Calculate statistics
      const stats = this.calculateTaskStatistics(tasks);

      lines.push(this.formatSectionHeader('Task Summary', opts));
      lines.push(`Total Tasks: ${stats.total}`);

      if (opts.includeProgress) {
        lines.push(this.formatProgressBar(stats.completed, stats.total, opts));
        lines.push(
          `Progress: ${stats.completed}/${stats.total} (${stats.progressPercentage}%)`
        );
      }

      // Status breakdown
      lines.push('');
      lines.push('Status Breakdown:');
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        if (count > 0) {
          const icon = this.getStatusIcon(status as TaskStatus, opts);
          lines.push(
            `  ${icon} ${this.formatStatusName(status as TaskStatus)}: ${count}`
          );
        }
      });

      // Priority breakdown
      if (stats.byPriority.size > 0) {
        lines.push('');
        lines.push('Priority Breakdown:');
        Array.from(stats.byPriority.entries())
          .sort(([a], [b]) => b - a) // Sort by priority (high to low)
          .forEach(([priority, count]) => {
            const icon = this.getPriorityIcon(priority, opts);
            lines.push(
              `  ${icon} ${this.formatPriorityName(priority)}: ${count}`
            );
          });
      }

      const content = lines.join('\n');

      return {
        content,
        metadata: {
          totalLines: lines.length,
          totalCharacters: content.length,
          groupCount: 1,
          itemCount: tasks.length,
        },
      };
    } catch (error) {
      logger.error('Failed to format task summary', {
        taskCount: tasks.length,
        error,
      });
      return this.formatError('Failed to format task summary', error);
    }
  }

  /**
   * Format a progress bar
   */
  formatProgressBar(
    completed: number,
    total: number,
    options: Partial<FormatOptions> = {}
  ): string {
    try {
      const opts = { ...this.defaultOptions, ...options };

      if (total === 0) {
        return opts.colorize ? '\x1b[90m[no tasks]\x1b[0m' : '[no tasks]';
      }

      const percentage = Math.round((completed / total) * 100);
      const barWidth = Math.min(20, opts.maxWidth - 20); // Reserve space for text
      const filledWidth = Math.round((completed / total) * barWidth);
      const emptyWidth = barWidth - filledWidth;

      const filledChar = opts.colorize ? '\x1b[32m█\x1b[0m' : '█';
      const emptyChar = opts.colorize ? '\x1b[90m░\x1b[0m' : '░';

      const filled = filledChar.repeat(filledWidth);
      const empty = emptyChar.repeat(emptyWidth);

      const percentageText = opts.colorize
        ? `\x1b[1m${percentage}%\x1b[0m`
        : `${percentage}%`;

      return `[${filled}${empty}] ${percentageText}`;
    } catch (error) {
      logger.error('Failed to format progress bar', {
        completed,
        total,
        error,
      });
      return '[error formatting progress]';
    }
  }

  /**
   * Format an action plan with steps
   */
  formatActionPlan(
    plan: ActionPlan,
    options: Partial<FormatOptions> = {}
  ): string {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const lines: string[] = [];

      lines.push(this.formatSectionHeader('Action Plan', opts, '  '));

      if (opts.includeProgress && plan.steps.length > 0) {
        const completedSteps = plan.steps.filter(
          step => step.status === 'completed'
        ).length;
        lines.push(
          `  ${this.formatProgressBar(completedSteps, plan.steps.length, opts)}`
        );
        lines.push(
          `  Progress: ${completedSteps}/${plan.steps.length} steps completed`
        );
        lines.push('');
      }

      // Format steps
      if (plan.steps.length > 0) {
        plan.steps
          .sort((a, b) => a.order - b.order)
          .forEach((step, index) => {
            lines.push(this.formatActionStep(step, index + 1, opts));
          });
      } else if (plan.content) {
        // Fallback to content if no structured steps
        const contentLines = plan.content.split('\n');
        contentLines.forEach(line => {
          lines.push(`    ${line}`);
        });
      }

      return lines.join('\n');
    } catch (error) {
      logger.error('Failed to format action plan', { planId: plan.id, error });
      return '  [error formatting action plan]';
    }
  }

  // Private helper methods

  private formatListHeader(list: TodoList, opts: FormatOptions): string {
    const title = opts.colorize ? `\x1b[1m${list.title}\x1b[0m` : list.title;
    const projectTag = list.projectTag || list.context || 'default';
    const project = opts.colorize
      ? `\x1b[36m[${projectTag}]\x1b[0m`
      : `[${projectTag}]`;

    let header = `${title} ${project}`;

    if (opts.showIds) {
      const id = opts.colorize ? `\x1b[90m(${list.id})\x1b[0m` : `(${list.id})`;
      header += ` ${id}`;
    }

    return header;
  }

  private formatListSummary(list: TodoList, opts: FormatOptions): string {
    const lines: string[] = [];

    if (opts.includeProgress) {
      lines.push(
        this.formatProgressBar(list.completedItems, list.totalItems, opts)
      );
    }

    lines.push(`Tasks: ${list.completedItems}/${list.totalItems} completed`);

    if (list.description) {
      lines.push(`Description: ${list.description}`);
    }

    return lines.join('\n');
  }

  private formatTasksWithGrouping(
    tasks: TodoItem[],
    opts: FormatOptions
  ): string[] {
    const lines: string[] = [];

    if (opts.groupBy === 'none') {
      // No grouping, just list all tasks
      tasks.forEach(task => {
        if (
          opts.compactMode ||
          (!opts.includeActionPlans && !opts.includeNotes)
        ) {
          lines.push(this.formatTaskLine(task, opts));
        } else {
          const taskOutput = this.formatTask(task, opts);
          lines.push(taskOutput.content);
        }
        if (!opts.compactMode) {
          lines.push('');
        }
      });
    } else {
      // Group tasks
      const groups = this.groupTasks(tasks, opts.groupBy);

      Object.entries(groups).forEach(([groupName, groupTasks], groupIndex) => {
        if (groupIndex > 0) {
          lines.push('');
        }

        lines.push(this.formatGroupHeader(groupName, groupTasks.length, opts));

        groupTasks.forEach(task => {
          if (
            opts.compactMode ||
            (!opts.includeActionPlans && !opts.includeNotes)
          ) {
            lines.push(this.formatTaskLine(task, opts));
          } else {
            const taskOutput = this.formatTask(task, opts);
            lines.push(taskOutput.content);
          }
          if (!opts.compactMode) {
            lines.push('');
          }
        });
      });
    }

    return lines;
  }

  private formatTaskHeader(task: TodoItem, opts: FormatOptions): string {
    const statusIcon = this.getStatusIcon(task.status, opts);
    const priorityIcon = this.getPriorityIcon(task.priority, opts);

    let header = `${statusIcon} ${task.title}`;

    if (task.priority !== Priority.MEDIUM) {
      header += ` ${priorityIcon}`;
    }

    if (opts.showIds) {
      const id = opts.colorize ? `\x1b[90m(${task.id})\x1b[0m` : `(${task.id})`;
      header += ` ${id}`;
    }

    return header;
  }

  private formatTaskLine(task: TodoItem, opts: FormatOptions): string {
    const lines: string[] = [];

    // Main task line
    lines.push(this.formatTaskHeader(task, opts));

    // Additional details in compact mode
    if (opts.compactMode) {
      const details: string[] = [];

      if (task.estimatedDuration) {
        details.push(`${task.estimatedDuration}min`);
      }

      if (task.tags.length > 0) {
        details.push(`#${task.tags.join(' #')}`);
      }

      if (details.length > 0) {
        const detailText = opts.colorize
          ? `\x1b[90m(${details.join(', ')})\x1b[0m`
          : `(${details.join(', ')})`;
        lines[0] += ` ${detailText}`;
      }
    } else {
      // Full details
      if (task.description) {
        lines.push(this.formatTaskDescription(task.description, opts));
      }

      const metadata = this.formatTaskMetadata(task, opts);
      if (metadata) {
        lines.push(metadata);
      }

      // Action plan progress
      if (opts.includeActionPlans && task.actionPlan && opts.includeProgress) {
        const completedSteps = task.actionPlan.steps.filter(
          s => s.status === 'completed'
        ).length;
        const totalSteps = task.actionPlan.steps.length;
        if (totalSteps > 0) {
          lines.push(`  Plan: ${completedSteps}/${totalSteps} steps completed`);
        }
      }

      // Notes summary
      if (opts.includeNotes && task.implementationNotes?.length > 0) {
        const noteCount = task.implementationNotes.length;
        const recentNote =
          task.implementationNotes[task.implementationNotes.length - 1];
        if (recentNote) {
          const truncated = this.truncateText(
            recentNote.content,
            opts.truncateNotes
          );
          lines.push(`  Note: ${truncated} (${noteCount} total)`);
        }
      }
    }

    return lines.join('\n');
  }

  private formatTaskDescription(
    description: string,
    opts: FormatOptions
  ): string {
    const truncated = this.truncateText(description, opts.maxWidth - 4);
    const color = opts.colorize ? '\x1b[90m' : '';
    const reset = opts.colorize ? '\x1b[0m' : '';
    return `  ${color}${truncated}${reset}`;
  }

  private formatTaskMetadata(
    task: TodoItem,
    opts: FormatOptions
  ): string | null {
    const metadata: string[] = [];

    if (task.estimatedDuration) {
      metadata.push(`Duration: ${task.estimatedDuration}min`);
    }

    if (task.dependencies.length > 0) {
      metadata.push(`Dependencies: ${task.dependencies.length}`);
    }

    if (task.tags.length > 0) {
      metadata.push(`Tags: #${task.tags.join(' #')}`);
    }

    if (task.completedAt) {
      const date = task.completedAt.toLocaleDateString();
      metadata.push(`Completed: ${date}`);
    }

    if (metadata.length === 0) {
      return null;
    }

    const text = metadata.join(' | ');
    const color = opts.colorize ? '\x1b[90m' : '';
    const reset = opts.colorize ? '\x1b[0m' : '';
    return `  ${color}${text}${reset}`;
  }

  private formatActionStep(
    step: ActionStep,
    index: number,
    opts: FormatOptions
  ): string {
    const statusIcon = this.getStepStatusIcon(step.status, opts);
    const stepNumber = opts.colorize ? `\x1b[90m${index}.\x1b[0m` : `${index}.`;

    let line = `    ${stepNumber} ${statusIcon} ${step.content}`;

    if (step.notes && !opts.compactMode) {
      const truncated = this.truncateText(step.notes, opts.truncateNotes);
      const noteText = opts.colorize
        ? `\x1b[90m(${truncated})\x1b[0m`
        : `(${truncated})`;
      line += ` ${noteText}`;
    }

    return line;
  }

  private formatNote(
    note: ImplementationNote,
    opts: FormatOptions,
    indent: string = ''
  ): string {
    const typeIcon = this.getNoteTypeIcon(note.type, opts);
    const date = note.createdAt.toLocaleDateString();
    const truncated = this.truncateText(note.content, opts.truncateNotes);

    const dateText = opts.colorize ? `\x1b[90m[${date}]\x1b[0m` : `[${date}]`;

    return `${indent}${typeIcon} ${truncated} ${dateText}`;
  }

  private formatSectionHeader(
    title: string,
    opts: FormatOptions,
    indent: string = ''
  ): string {
    const text = opts.colorize ? `\x1b[1m${title}:\x1b[0m` : `${title}:`;
    return `${indent}${text}`;
  }

  private formatGroupHeader(
    groupName: string,
    count: number,
    opts: FormatOptions
  ): string {
    const title = opts.colorize ? `\x1b[1m${groupName}\x1b[0m` : groupName;
    const countText = opts.colorize
      ? `\x1b[90m(${count})\x1b[0m`
      : `(${count})`;
    return `${title} ${countText}`;
  }

  private formatEmptyState(opts: FormatOptions): string {
    const text = 'No tasks found';
    return opts.colorize ? `\x1b[90m${text}\x1b[0m` : text;
  }

  private formatError(message: string, error: unknown): FormattedOutput {
    const errorText = error instanceof Error ? error.message : 'Unknown error';
    const content = `Error: ${message}\nDetails: ${errorText}`;

    return {
      content,
      metadata: {
        totalLines: 2,
        totalCharacters: content.length,
        groupCount: 0,
        itemCount: 0,
      },
    };
  }

  // Icon and symbol methods

  private getStatusIcon(status: TaskStatus, opts: FormatOptions): string {
    if (!opts.colorize) {
      switch (status) {
        case TaskStatus.PENDING:
          return '○';
        case TaskStatus.IN_PROGRESS:
          return '◐';
        case TaskStatus.COMPLETED:
          return '●';
        case TaskStatus.BLOCKED:
          return '◯';
        case TaskStatus.CANCELLED:
          return '✗';
        default:
          return '?';
      }
    }

    switch (status) {
      case TaskStatus.PENDING:
        return '\x1b[90m○\x1b[0m';
      case TaskStatus.IN_PROGRESS:
        return '\x1b[33m◐\x1b[0m';
      case TaskStatus.COMPLETED:
        return '\x1b[32m●\x1b[0m';
      case TaskStatus.BLOCKED:
        return '\x1b[31m◯\x1b[0m';
      case TaskStatus.CANCELLED:
        return '\x1b[31m✗\x1b[0m';
      default:
        return '\x1b[90m?\x1b[0m';
    }
  }

  private getPriorityIcon(priority: Priority, opts: FormatOptions): string {
    if (!opts.colorize) {
      switch (priority) {
        case Priority.CRITICAL:
          return '🔥';
        case Priority.HIGH:
          return '⬆';
        case Priority.MEDIUM:
          return '→';
        case Priority.LOW:
          return '⬇';
        case Priority.MINIMAL:
          return '↓';
        default:
          return '';
      }
    }

    switch (priority) {
      case Priority.CRITICAL:
        return '\x1b[91m🔥\x1b[0m';
      case Priority.HIGH:
        return '\x1b[31m⬆\x1b[0m';
      case Priority.MEDIUM:
        return '\x1b[33m→\x1b[0m';
      case Priority.LOW:
        return '\x1b[32m⬇\x1b[0m';
      case Priority.MINIMAL:
        return '\x1b[90m↓\x1b[0m';
      default:
        return '';
    }
  }

  private getStepStatusIcon(
    status: ActionStep['status'],
    opts: FormatOptions
  ): string {
    if (!opts.colorize) {
      switch (status) {
        case 'pending':
          return '○';
        case 'in_progress':
          return '◐';
        case 'completed':
          return '●';
        default:
          return '?';
      }
    }

    switch (status) {
      case 'pending':
        return '\x1b[90m○\x1b[0m';
      case 'in_progress':
        return '\x1b[33m◐\x1b[0m';
      case 'completed':
        return '\x1b[32m●\x1b[0m';
      default:
        return '\x1b[90m?\x1b[0m';
    }
  }

  private getNoteTypeIcon(
    type: ImplementationNote['type'],
    opts: FormatOptions
  ): string {
    if (!opts.colorize) {
      switch (type) {
        case 'general':
          return '📝';
        case 'technical':
          return '⚙️';
        case 'decision':
          return '🎯';
        case 'learning':
          return '💡';
        default:
          return '📄';
      }
    }

    // For colorized output, use simpler symbols that work better with colors
    switch (type) {
      case 'general':
        return '\x1b[34m•\x1b[0m';
      case 'technical':
        return '\x1b[36m⚙\x1b[0m';
      case 'decision':
        return '\x1b[35m→\x1b[0m';
      case 'learning':
        return '\x1b[33m!\x1b[0m';
      default:
        return '\x1b[90m•\x1b[0m';
    }
  }

  // Utility methods

  private groupTasks(
    tasks: TodoItem[],
    groupBy: FormatOptions['groupBy']
  ): Record<string, TodoItem[]> {
    const groups: Record<string, TodoItem[]> = {};

    tasks.forEach(task => {
      let groupKey: string;

      switch (groupBy) {
        case 'status':
          groupKey = this.formatStatusName(task.status);
          break;
        case 'priority':
          groupKey = this.formatPriorityName(task.priority);
          break;
        case 'project':
          // Note: Individual tasks don't have projectTag, this would need to be passed from the list
          groupKey = 'All Tasks';
          break;
        default:
          groupKey = 'All Tasks';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey]!.push(task);
    });

    return groups;
  }

  private calculateTaskStatistics(tasks: TodoItem[]) {
    const stats = {
      total: tasks.length,
      completed: 0,
      byStatus: {} as Record<TaskStatus, number>,
      byPriority: new Map<Priority, number>(),
      progressPercentage: 0,
    };

    // Initialize status counts
    Object.values(TaskStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });

    tasks.forEach(task => {
      // Count by status
      stats.byStatus[task.status]++;

      if (task.status === TaskStatus.COMPLETED) {
        stats.completed++;
      }

      // Count by priority
      const currentCount = stats.byPriority.get(task.priority) || 0;
      stats.byPriority.set(task.priority, currentCount + 1);
    });

    stats.progressPercentage =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return stats;
  }

  private calculateGroupCount(
    tasks: TodoItem[],
    groupBy: FormatOptions['groupBy']
  ): number {
    if (groupBy === 'none') {
      return 1;
    }

    const groups = this.groupTasks(tasks, groupBy);
    return Object.keys(groups).length;
  }

  private formatStatusName(status: TaskStatus): string {
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
        return 'Unknown';
    }
  }

  private formatPriorityName(priority: Priority): string {
    switch (priority) {
      case Priority.CRITICAL:
        return 'Critical';
      case Priority.HIGH:
        return 'High';
      case Priority.MEDIUM:
        return 'Medium';
      case Priority.LOW:
        return 'Low';
      case Priority.MINIMAL:
        return 'Minimal';
      default:
        return 'Unknown';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate cache key for a list and options
   */
  private generateCacheKey(
    list: TodoList,
    options: Partial<FormatOptions>
  ): string {
    const optionsStr = JSON.stringify(options);
    return `${list.id}-${list.updatedAt.getTime()}-${optionsStr}`;
  }

  /**
   * Get result from cache
   */
  private getFromCache(key: string): FormattedOutput | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.cacheMisses++;
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    return cached.result;
  }

  /**
   * Set result in cache
   */
  private setInCache(key: string, result: FormattedOutput): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Format tasks in chunks for lazy loading
   */
  private formatTasksInChunks(
    items: TodoItem[],
    options: FormatOptions
  ): Array<{
    content: string;
    itemCount: number;
    startIndex: number;
    endIndex: number;
  }> {
    const chunks = [];
    const chunkSize = options.chunkSize || 50;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunkItems = items.slice(i, i + chunkSize);
      const chunkLines = this.formatTasksWithGrouping(chunkItems, options);

      chunks.push({
        content: chunkLines.join('\n'),
        itemCount: chunkItems.length,
        startIndex: i,
        endIndex: Math.min(i + chunkSize - 1, items.length - 1),
      });
    }

    return chunks;
  }

  /**
   * Clear the formatter cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }
}
