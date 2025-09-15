/**
 * Proactive cleanup suggestion system for completed task lists
 */

import { logger } from '../../shared/utils/logger.js';
import type { TodoList } from '../../shared/types/todo.js';


export interface CleanupSuggestion {
  list: TodoList;
  reason: string;
  completedDaysAgo: number;
  estimatedSpaceSaved: number; // bytes
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CleanupResult {
  success: boolean;
  operation: 'archived' | 'deleted';
  listsProcessed: number;
  totalSpaceSaved: number; // bytes
  errors: string[];
}

export interface CleanupSuggestionOptions {
  projectTag?: string;
  minCompletedDays?: number;
  maxSuggestions?: number;
  respectDeclineHistory?: boolean;
}

export class CleanupSuggestionManager {
  private readonly COMPLETED_DAYS_THRESHOLD = 7; // Default threshold for suggestions
  private readonly DECLINE_COOLDOWN_DAYS = 30; // Days to wait before suggesting again
  private readonly BYTES_PER_TASK_ESTIMATE = 1024; // Rough estimate of storage per task
  private readonly BYTES_PER_LIST_OVERHEAD = 512; // Overhead per list

  constructor() {}

  /**
   * Identify completed task lists that are candidates for cleanup
   */
  identifyCompletedLists(lists: TodoList[], projectTag?: string): TodoList[] {
    const completedLists = lists.filter(list => {
      // Don't suggest archived lists
      if (list.isArchived) {
        return false;
      }

      // Filter by project tag if specified
      if (projectTag && list.projectTag !== projectTag) {
        return false;
      }

      // Check if all tasks are completed
      return this.isListFullyCompleted(list);
    });

    logger.info('Identified completed lists', {
      totalLists: lists.length,
      completedLists: completedLists.length,
      projectTag,
    });

    return completedLists;
  }

  /**
   * Generate cleanup suggestions based on completed lists
   */
  generateCleanupSuggestions(lists: TodoList[], options: CleanupSuggestionOptions = {}): CleanupSuggestion[] {
    const {
      projectTag,
      minCompletedDays = this.COMPLETED_DAYS_THRESHOLD,
      maxSuggestions = 10,
      respectDeclineHistory = true,
    } = options;

    const completedLists = this.identifyCompletedLists(lists, projectTag);
    const suggestions: CleanupSuggestion[] = [];

    for (const list of completedLists) {
      if (suggestions.length >= maxSuggestions) {
        break;
      }

      if (!this.shouldSuggestCleanup(list, minCompletedDays, respectDeclineHistory)) {
        continue;
      }

      const suggestion = this.createCleanupSuggestion(list);
      suggestions.push(suggestion);
    }

    // Sort by priority (days completed desc, then by estimated space saved desc)
    suggestions.sort((a, b) => {
      if (a.completedDaysAgo !== b.completedDaysAgo) {
        return b.completedDaysAgo - a.completedDaysAgo;
      }
      return b.estimatedSpaceSaved - a.estimatedSpaceSaved;
    });

    logger.info('Generated cleanup suggestions', {
      suggestionsCount: suggestions.length,
      projectTag,
    });

    return suggestions;
  }



  /**
   * Check if a specific list should be suggested for cleanup
   */
  shouldSuggestCleanup(
    list: TodoList,
    minCompletedDays = this.COMPLETED_DAYS_THRESHOLD,
    respectDeclineHistory = true
  ): boolean {
    // Don't suggest archived lists
    if (list.isArchived) {
      return false;
    }

    // Check if list is fully completed
    if (!this.isListFullyCompleted(list)) {
      return false;
    }

    // Calculate completion age
    const completedDaysAgo = this.calculateCompletionAge(list);
    if (completedDaysAgo <= minCompletedDays) {
      return false;
    }

    // Check decline history if requested
    if (respectDeclineHistory && this.wasRecentlyDeclined(list)) {
      return false;
    }

    return true;
  }

  /**
   * Mark cleanup as declined for a list to avoid repeated suggestions
   */
  markCleanupDeclined(list: TodoList): TodoList {
    logger.debug('Marking cleanup as declined', { listId: list.id });

    const updatedList: TodoList = {
      ...list,
      cleanupDeclined: new Date(),
      updatedAt: new Date(),
    };

    logger.info('Cleanup decline recorded', { listId: list.id });
    return updatedList;
  }

  /**
   * Perform cleanup operations on multiple lists
   */
  async performCleanup(
    lists: TodoList[],
    listIds: string[],
    permanent = false
  ): Promise<{
    success: boolean;
    processedLists: TodoList[];
    archivedLists: TodoList[];
    deletedLists: TodoList[];
    errors: string[];
    backup?: {
      lists: TodoList[];
      timestamp: Date;
    };
  }> {
    const result = {
      success: true,
      processedLists: [] as TodoList[],
      archivedLists: [] as TodoList[],
      deletedLists: [] as TodoList[],
      errors: [] as string[],
      backup: {
        lists: [] as TodoList[],
        timestamp: new Date(),
      },
    };

    try {
      logger.info('Starting cleanup operation', {
        listIds,
        permanent,
        listCount: listIds.length,
      });

      for (const listId of listIds) {
        try {
          const list = lists.find(l => l.id === listId);
          if (!list) {
            result.errors.push(`List not found: ${listId}`);
            continue;
          }

          // Create backup before cleanup
          result.backup.lists.push({ ...list });

          if (permanent) {
            // Permanent deletion
            result.deletedLists.push(list);
            // Don't add to processedLists for permanent deletion
          } else {
            // Archive the list
            const archivedList: TodoList = {
              ...list,
              isArchived: true,
              updatedAt: new Date(),
            };
            result.archivedLists.push(archivedList);
            result.processedLists.push(archivedList);
          }

          logger.debug('List cleanup completed', {
            listId,
            operation: permanent ? 'deleted' : 'archived',
          });
        } catch (error) {
          const errorMessage = `Failed to cleanup list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          logger.error('List cleanup failed', { listId, error });
        }
      }

      // Success is true even if there are errors, as long as the operation completed
      // Only set success to false if there was a catastrophic failure
      result.success = true;

      logger.info('Cleanup operation completed', {
        success: result.success,
        processedCount: result.processedLists.length,
        errorCount: result.errors.length,
      });

      return result;
    } catch (error) {
      logger.error('Cleanup operation failed', { error, listIds, permanent });
      result.success = false;
      result.errors.push(`Cleanup operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Create a cleanup suggestion for a specific list
   */
  private createCleanupSuggestion(list: TodoList): CleanupSuggestion {
    const completedDaysAgo = this.calculateCompletionAge(list);
    const estimatedSpaceSaved = this.calculateSpaceUsage(list);
    const riskLevel = this.assessRiskLevel(list);
    const reason = this.generateCleanupReason(list, completedDaysAgo);

    return {
      list,
      reason,
      completedDaysAgo,
      estimatedSpaceSaved,
      riskLevel,
    };
  }

  /**
   * Check if a list is fully completed (all tasks are completed)
   */
  private isListFullyCompleted(list: TodoList): boolean {
    if (!list.items || list.items.length === 0) {
      return true; // Empty lists can be cleaned up
    }

    return list.items.every(item => item.status === 'completed');
  }

  /**
   * Calculate how many days ago the list was completed
   */
  private calculateCompletionAge(list: TodoList): number {
    let completionDate: Date;

    if (list.completedAt) {
      completionDate = new Date(list.completedAt);
    } else {
      // Find the latest completion date among tasks
      const completedTasks = list.items.filter(item => item.completedAt);
      if (completedTasks.length === 0) {
        return 0; // No completed tasks
      }

      const latestCompletion = completedTasks.reduce((latest, task) => {
        const taskCompletedAt = new Date(task.completedAt!);
        return taskCompletedAt > latest ? taskCompletedAt : latest;
      }, new Date(0));

      completionDate = latestCompletion;
    }

    const now = new Date();
    const diffMs = now.getTime() - completionDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // Convert to days
  }

  /**
   * Check if cleanup was recently declined for this list
   */
  private wasRecentlyDeclined(list: TodoList): boolean {
    if (!list.cleanupDeclined) {
      return false;
    }

    const declinedDate = new Date(list.cleanupDeclined);
    const now = new Date();
    const daysSinceDeclined = Math.floor(
      (now.getTime() - declinedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceDeclined < this.DECLINE_COOLDOWN_DAYS;
  }

  /**
   * Estimate space usage of a list in bytes
   */
  private calculateSpaceUsage(list: TodoList): number {
    let totalBytes = this.BYTES_PER_LIST_OVERHEAD;

    // Add bytes for each task
    totalBytes += list.items.length * this.BYTES_PER_TASK_ESTIMATE;

    // Add bytes for text content (rough estimate)
    totalBytes += (list.title?.length || 0) * 2; // UTF-16 encoding
    totalBytes += (list.description?.length || 0) * 2;

    list.items.forEach(item => {
      totalBytes += (item.title?.length || 0) * 2;
      totalBytes += (item.description?.length || 0) * 2;
      
      // Add bytes for action plans
      if (item.actionPlan) {
        totalBytes += (item.actionPlan.content?.length || 0) * 2;
        item.actionPlan.steps.forEach(step => {
          totalBytes += (step.content?.length || 0) * 2;
          totalBytes += (step.notes?.length || 0) * 2;
        });
      }

      // Add bytes for implementation notes
      item.implementationNotes.forEach(note => {
        totalBytes += (note.content?.length || 0) * 2;
      });
    });

    // Add bytes for list-level implementation notes
    list.implementationNotes?.forEach(note => {
      totalBytes += (note.content?.length || 0) * 2;
    });

    return totalBytes;
  }

  /**
   * Assess the risk level of cleaning up a list
   */
  private assessRiskLevel(list: TodoList): 'low' | 'medium' | 'high' {
    const completedDaysAgo = this.calculateCompletionAge(list);
    const hasNotes = (list.implementationNotes?.length || 0) > 0 ||
                     list.items.some(item => (item.implementationNotes?.length || 0) > 0);
    const hasActionPlans = list.items.some(item => item.actionPlan);
    const hasDependencies = list.items.some(item => item.dependencies && item.dependencies.length > 0);
    const taskCount = list.items.length;

    // High risk: Has many notes (>= 10), action plans, or very recent completion
    if ((list.implementationNotes?.length || 0) >= 10 || hasActionPlans || completedDaysAgo < 7) {
      return 'high';
    }

    // Medium risk: Has dependencies, some notes, or moderate task count
    if (hasDependencies || hasNotes || taskCount > 10) {
      return 'medium';
    }

    // Low risk: Old completion, simple list, no special features
    return 'low';
  }

  /**
   * Generate a human-readable reason for cleanup suggestion
   */
  private generateCleanupReason(list: TodoList, completedDaysAgo: number): string {
    const taskCount = list.items.length;
    
    if (taskCount === 0) {
      return `Empty list created ${completedDaysAgo} days ago`;
    }

    return `All ${taskCount} tasks completed ${completedDaysAgo} days ago`;
  }

  /**
   * Calculate space saved for a list (public method for testing)
   */
  calculateSpaceSaved(list: TodoList): number {
    return this.calculateSpaceUsage(list);
  }

  /**
   * Get risk level for a list (public method for testing)
   */
  getRiskLevel(list: TodoList): 'low' | 'medium' | 'high' {
    return this.assessRiskLevel(list);
  }

  /**
   * Get cleanup statistics for multiple lists
   */
  getCleanupStatistics(lists: TodoList[]): {
    totalLists: number;
    completedLists: number;
    eligibleForCleanup: number;
    totalSpaceSavings: number;
    riskDistribution: Record<string, number>;
    averageAge: number;
    oldestCompletedList?: Date;
  } {
    const completedLists = this.identifyCompletedLists(lists);
    const eligibleLists = completedLists.filter(list => 
      this.shouldSuggestCleanup(list, this.COMPLETED_DAYS_THRESHOLD, true)
    );

    const stats: {
      totalLists: number;
      completedLists: number;
      eligibleForCleanup: number;
      totalSpaceSavings: number;
      riskDistribution: Record<string, number>;
      averageAge: number;
      oldestCompletedList?: Date;
    } = {
      totalLists: lists.length,
      completedLists: completedLists.length,
      eligibleForCleanup: eligibleLists.length,
      totalSpaceSavings: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      averageAge: 0,
    };

    if (eligibleLists.length === 0) {
      return stats;
    }

    let totalAge = 0;
    let oldestDate: Date | undefined;

    for (const list of eligibleLists) {
      stats.totalSpaceSavings += this.calculateSpaceUsage(list);
      const risk = this.assessRiskLevel(list);
      if (stats.riskDistribution[risk] !== undefined) {
        stats.riskDistribution[risk]++;
      } else {
        stats.riskDistribution[risk] = 1;
      }
      totalAge += this.calculateCompletionAge(list);

      // Find oldest completed list
      const completedDate = list.completedAt || list.updatedAt;
      if (!oldestDate || completedDate < oldestDate) {
        oldestDate = completedDate;
      }
    }

    stats.averageAge = Math.round(totalAge / eligibleLists.length);
    if (oldestDate) {
      stats.oldestCompletedList = oldestDate;
    }
    return stats;
  }

  /**
   * Format cleanup suggestion for display
   */
  formatCleanupSuggestion(suggestion: CleanupSuggestion): string {
    const { list, completedDaysAgo, estimatedSpaceSaved, riskLevel } = suggestion;
    const spaceKB = (estimatedSpaceSaved / 1024).toFixed(1);
    const riskEmoji = riskLevel === 'low' ? '🟢' : riskLevel === 'medium' ? '🟡' : '🔴';
    const riskText = riskLevel === 'low' ? 'Low risk' : riskLevel === 'medium' ? 'Medium risk' : 'High risk';
    
    return `${riskEmoji} ${list.title} - All ${list.items.length} tasks completed ${completedDaysAgo} days ago (${spaceKB} KB saved, ${riskText})`;
  }

  /**
   * Generate batch cleanup suggestions with overall assessment
   */
  batchCleanupSuggestions(lists: TodoList[], options: CleanupSuggestionOptions = {}): {
    suggestions: CleanupSuggestion[];
    totalSpaceSavings: number;
    riskAssessment: 'low' | 'medium' | 'high';
    recommendedAction: string;
  } {
    const suggestions = this.generateCleanupSuggestions(lists, options);
    const stats = this.getCleanupStatistics(suggestions.map(s => s.list));
    
    // Determine overall risk based on distribution
    let riskAssessment: 'low' | 'medium' | 'high' = 'low';
    if ((stats.riskDistribution['high'] || 0) > 0) {
      riskAssessment = 'high';
    } else if ((stats.riskDistribution['medium'] || 0) > 0) {
      riskAssessment = 'medium';
    }

    const recommendedAction = riskAssessment === 'low' 
      ? 'Safe to proceed with cleanup'
      : riskAssessment === 'medium'
      ? 'Review suggestions carefully before cleanup'
      : 'Manual review recommended before cleanup';

    return {
      suggestions,
      totalSpaceSavings: stats.totalSpaceSavings,
      riskAssessment,
      recommendedAction,
    };
  }


}