/**
 * Pretty Print Formatter for Human-Readable Task and List Display
 *
 * Provides formatting capabilities for task lists and tasks with:
 * - Single detailed output format
 * - Progress visualization
 * - Color support for terminal output
 * - Customizable formatting options
 *
 * Key Features:
 * - Status and priority icons with color coding
 * - Action plan step-by-step formatting
 * - Implementation notes with type indicators
 * - Flexible grouping (by status, priority, project)
 * - Responsive width handling
 */

import {
  type TaskList,
  type Task,
  type ActionPlan,
  type ActionStep,
  type ImplementationNote,
  TaskStatus,
  Priority,
} from '../../shared/types/task.js';

import { LOGGER } from './logger.js';

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
  };
}

/**
 * Main formatter class for creating human-readable output
 * Handles formatting of task lists, tasks, and summaries with customization options
 */
export class PrettyPrintFormatter {
  /** Default formatting options for readability */
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

  /**
   * Formats a complete task list with all its tasks and metadata
   * Supports grouping and filtering
   *
   * @param list - The task list to format
   * @param options - Formatting options to customize the output
   * @returns FormattedOutput - The formatted content with metadata
   */
  formatTaskList(
    list: TaskList,
    options: Partial<FormatOptions> = {}
  ): FormattedOutput {
    const startTime = performance.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      const lines: string[] = [];
      let itemsToProcess = list.items;
      let wasTruncated = false;

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

      // Tasks section
      if (itemsToProcess.length > 0) {
        const formattedTasks = this.formatTasksWithGrouping(
          itemsToProcess,
          opts
        );
        lines.push(...formattedTasks);
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
        },
      };

      return result;
    } catch (error) {
      LOGGER.error('Failed to format task list', { listId: list.id, error });
      return this.formatError('Failed to format task list', error);
    }
  }

  /**
   * Format a single task item
   */
  formatTask(
    task: Task,
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
      LOGGER.error('Failed to format task', { taskId: task.id, error });
      return this.formatError('Failed to format task', error);
    }
  }

  /**
   * Format a summary of multiple tasks
   */
  formatTaskSummary(
    tasks: Task[],
    options: Partial<FormatOptions> = {}
  ): FormattedOutput {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const lines: string[] = [];

      // Calculate counts
      const total = tasks.length;
      const completed = tasks.filter(
        t => t.status === TaskStatus.COMPLETED
      ).length;
      const progressPercentage =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      lines.push(this.formatSectionHeader('Task Summary', opts));
      lines.push(`Total Tasks: ${total}`);

      if (opts.includeProgress) {
        lines.push(this.formatProgressBar(completed, total, opts));
        lines.push(`Progress: ${completed}/${total} (${progressPercentage}%)`);
      }

      // Status breakdown
      const statusCounts: Record<TaskStatus, number> = {} as Record<
        TaskStatus,
        number
      >;
      Object.values(TaskStatus).forEach(status => {
        statusCounts[status] = 0;
      });

      tasks.forEach(task => {
        statusCounts[task.status]++;
      });

      lines.push('');
      lines.push('Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
          const icon = this.getStatusIcon(status as TaskStatus, opts);
          lines.push(
            `  ${icon} ${this.formatStatusName(status as TaskStatus)}: ${count}`
          );
        }
      });

      // Priority breakdown
      const priorityCounts = new Map<Priority, number>();
      tasks.forEach(task => {
        const currentCount = priorityCounts.get(task.priority) || 0;
        priorityCounts.set(task.priority, currentCount + 1);
      });

      if (priorityCounts.size > 0) {
        lines.push('');
        lines.push('Priority Breakdown:');
        Array.from(priorityCounts.entries())
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
      LOGGER.error('Failed to format task summary', {
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
      LOGGER.error('Failed to format progress bar', {
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
        plan.steps.forEach((step, index) => {
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
      LOGGER.error('Failed to format action plan', { planId: plan.id, error });
      return '  [error formatting action plan]';
    }
  }

  // Private helper methods

  private formatListHeader(list: TaskList, opts: FormatOptions): string {
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

  private formatListSummary(list: TaskList, opts: FormatOptions): string {
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
    tasks: Task[],
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

  private formatTaskHeader(task: Task, opts: FormatOptions): string {
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

  private formatTaskLine(task: Task, opts: FormatOptions): string {
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

  private formatTaskMetadata(task: Task, opts: FormatOptions): string | null {
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

    // For colorized output, use cleaner symbols that work better with colors
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
    tasks: Task[],
    groupBy: FormatOptions['groupBy']
  ): Record<string, Task[]> {
    const groups: Record<string, Task[]> = {};

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

  private calculateGroupCount(
    tasks: Task[],
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
}
