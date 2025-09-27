/**
 * Action Plan Manager - Handles CRUD operations for action plans and progress tracking
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionPlan, ActionStep } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';

export interface CreateActionPlanInput {
  taskId: string;
  content: string;
}

export interface UpdateActionPlanInput {
  planId: string;
  content?: string;
  version?: number;
}

export interface UpdateStepProgressInput {
  planId: string;
  stepId: string;
  status: ActionStep['status'];
  notes?: string | undefined;
}

export interface ActionPlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ActionPlanManager {
  constructor() {
    logger.debug('ActionPlanManager initialized');
  }

  /**
   * Creates a new action plan for a task
   */
  async createActionPlan(input: CreateActionPlanInput): Promise<ActionPlan> {
    try {
      logger.debug('Creating action plan', {
        taskId: input.taskId,
        contentLength: input.content.length,
      });

      // Validate input
      this.validateActionPlanContent(input.content);

      const now = new Date();
      const planId = uuidv4();

      // Parse steps from content
      const steps = this.parseStepsFromContent(input.content);

      const actionPlan: ActionPlan = {
        id: planId,
        content: input.content,
        steps,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      logger.info('Action plan created successfully', {
        planId,
        taskId: input.taskId,
        stepCount: steps.length,
      });

      return actionPlan;
    } catch (error) {
      logger.error('Failed to create action plan', {
        taskId: input.taskId,
        error,
      });
      throw error;
    }
  }

  /**
   * Updates an existing action plan
   */
  async updateActionPlan(
    existingPlan: ActionPlan,
    updates: Partial<ActionPlan>
  ): Promise<ActionPlan> {
    try {
      logger.debug('Updating action plan', {
        planId: existingPlan.id,
        hasContentUpdate: !!updates.content,
      });

      const now = new Date();
      let updatedSteps = existingPlan.steps;

      // If content is being updated, re-parse steps
      if (updates.content !== undefined) {
        this.validateActionPlanContent(updates.content);
        updatedSteps = this.parseStepsFromContent(updates.content);
      }

      const updatedPlan: ActionPlan = {
        ...existingPlan,
        ...updates,
        steps: updatedSteps,
        updatedAt: now,
        version: existingPlan.version + 1,
      };

      logger.info('Action plan updated successfully', {
        planId: existingPlan.id,
        newVersion: updatedPlan.version,
        stepCount: updatedSteps.length,
      });

      return updatedPlan;
    } catch (error) {
      logger.error('Failed to update action plan', {
        planId: existingPlan.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Parses structured steps from action plan content
   */
  parseStepsFromContent(content: string): ActionStep[] {
    try {
      logger.debug('Parsing steps from content', {
        contentLength: content.length,
      });

      const steps: ActionStep[] = [];
      const lines = content.split('\n');
      let order = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) {
          continue;
        }

        // Look for various bullet point patterns
        const bulletPatterns = [
          /^[-*+]\s+(.+)$/,           // - item, * item, + item
          /^\d+\.\s+(.+)$/,          // 1. item, 2. item
          /^[a-zA-Z]\.\s+(.+)$/,     // a. item, A. item
          /^[ivxlcdm]+\.\s+(.+)$/i,  // i. item, ii. item (roman numerals)
          /^\[\s*\]\s+(.+)$/,        // [ ] item (checkbox)
          /^\[x\]\s+(.+)$/i,         // [x] item (completed checkbox)
        ];

        let stepContent: string | null = null;
        let initialStatus: ActionStep['status'] = 'pending';

        // Check each pattern
        for (const pattern of bulletPatterns) {
          const match = trimmedLine.match(pattern);
          if (match && match[1]) {
            stepContent = match[1].trim();
            
            // Check if it's a completed checkbox
            if (/^\[x\]\s+/i.test(trimmedLine)) {
              initialStatus = 'completed';
            }
            break;
          }
        }

        // If no bullet pattern matched, treat as a regular line if it looks like a step
        if (!stepContent && trimmedLine.length > 3) {
          stepContent = trimmedLine;
        }

        // Create step if we found content
        if (stepContent) {
          const step: ActionStep = {
            id: uuidv4(),
            content: stepContent,
            status: initialStatus,
            order: order++,
          };

          // Set completedAt if initially completed
          if (initialStatus === 'completed') {
            step.completedAt = new Date();
          }

          steps.push(step);
        }
      }

      logger.debug('Steps parsed successfully', {
        stepCount: steps.length,
        completedSteps: steps.filter(s => s.status === 'completed').length,
      });

      return steps;
    } catch (error) {
      logger.error('Failed to parse steps from content', { error });
      throw new Error(`Failed to parse action plan steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates the progress of a specific step
   */
  async updateStepProgress(
    existingPlan: ActionPlan,
    input: UpdateStepProgressInput
  ): Promise<ActionPlan> {
    try {
      logger.debug('Updating step progress', {
        planId: input.planId,
        stepId: input.stepId,
        newStatus: input.status,
      });

      const stepIndex = existingPlan.steps.findIndex(step => step.id === input.stepId);
      if (stepIndex === -1) {
        throw new Error(`Step not found: ${input.stepId}`);
      }

      const existingStep = existingPlan.steps[stepIndex];
      if (!existingStep) {
        throw new Error(`Step not found: ${input.stepId}`);
      }

      const now = new Date();
      const updatedStep: ActionStep = {
        ...existingStep,
        status: input.status,
        ...(input.notes !== undefined && { notes: input.notes }),
      };

      // Handle completion timestamp
      if (input.status === 'completed' && existingStep.status !== 'completed') {
        updatedStep.completedAt = now;
      } else if (input.status !== 'completed') {
        delete updatedStep.completedAt;
      }

      // Update the steps array
      const updatedSteps = [...existingPlan.steps];
      updatedSteps[stepIndex] = updatedStep;

      // Create updated plan
      const updatedPlan: ActionPlan = {
        ...existingPlan,
        steps: updatedSteps,
        updatedAt: now,
        version: existingPlan.version + 1,
      };

      logger.info('Step progress updated successfully', {
        planId: input.planId,
        stepId: input.stepId,
        oldStatus: existingStep.status,
        newStatus: input.status,
      });

      return updatedPlan;
    } catch (error) {
      logger.error('Failed to update step progress', {
        planId: input.planId,
        stepId: input.stepId,
        error,
      });
      throw error;
    }
  }

  /**
   * Calculates progress percentage for an action plan
   */
  calculatePlanProgress(plan: ActionPlan): number {
    try {
      if (plan.steps.length === 0) {
        return 0;
      }

      const completedSteps = plan.steps.filter(step => step.status === 'completed').length;
      const progress = Math.round((completedSteps / plan.steps.length) * 100);

      logger.debug('Plan progress calculated', {
        planId: plan.id,
        totalSteps: plan.steps.length,
        completedSteps,
        progress,
      });

      return progress;
    } catch (error) {
      logger.error('Failed to calculate plan progress', {
        planId: plan.id,
        error,
      });
      return 0;
    }
  }

  /**
   * Suggests task status update based on action plan progress
   */
  suggestTaskStatusUpdate(plan: ActionPlan): 'pending' | 'in_progress' | 'completed' | null {
    try {
      const progress = this.calculatePlanProgress(plan);
      const inProgressSteps = plan.steps.filter(step => step.status === 'in_progress').length;

      // If all steps are completed, suggest completed
      if (progress === 100) {
        return 'completed';
      }

      // If any steps are in progress or some are completed, suggest in_progress
      if (inProgressSteps > 0 || progress > 0) {
        return 'in_progress';
      }

      // If no progress has been made, suggest pending
      if (progress === 0) {
        return 'pending';
      }

      logger.debug('Task status suggestion calculated', {
        planId: plan.id,
        progress,
        inProgressSteps,
        suggestion: null,
      });

      return null;
    } catch (error) {
      logger.error('Failed to suggest task status update', {
        planId: plan.id,
        error,
      });
      return null;
    }
  }

  /**
   * Validates action plan content
   */
  private validateActionPlanContent(content: string): ActionPlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if content is provided
    if (!content || content.trim().length === 0) {
      errors.push('Action plan content cannot be empty');
    }

    // Check content length (reasonable limits)
    if (content.length > 250000) {
      errors.push('Action plan content is too long (maximum 250,000 characters)');
    }

    // Check for minimum meaningful content
    if (content.trim().length < 10) {
      warnings.push('Action plan content is very short and may not be meaningful');
    }

    // Try to parse steps and warn if none found
    try {
      const steps = this.parseStepsFromContent(content);
      if (steps.length === 0) {
        warnings.push('No structured steps found in action plan content');
      } else if (steps.length > 100) {
        warnings.push('Action plan has many steps (>100), consider breaking into smaller plans');
      }
    } catch (error) {
      warnings.push('Could not parse structured steps from content');
    }

    const result: ActionPlanValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (!result.isValid) {
      throw new Error(`Action plan validation failed: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      logger.warn('Action plan validation warnings', {
        warnings,
        contentLength: content.length,
      });
    }

    return result;
  }

  /**
   * Gets action plan statistics
   */
  getActionPlanStats(plan: ActionPlan): {
    totalSteps: number;
    completedSteps: number;
    inProgressSteps: number;
    pendingSteps: number;
    progress: number;
    estimatedTimeRemaining?: number;
  } {
    const totalSteps = plan.steps.length;
    const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
    const inProgressSteps = plan.steps.filter(s => s.status === 'in_progress').length;
    const pendingSteps = plan.steps.filter(s => s.status === 'pending').length;
    const progress = this.calculatePlanProgress(plan);

    return {
      totalSteps,
      completedSteps,
      inProgressSteps,
      pendingSteps,
      progress,
    };
  }

  /**
   * Gets all steps with a specific status
   */
  getStepsByStatus(plan: ActionPlan, status: ActionStep['status']): ActionStep[] {
    return plan.steps.filter(step => step.status === status);
  }

  /**
   * Gets the next pending step in order
   */
  getNextPendingStep(plan: ActionPlan): ActionStep | null {
    const pendingSteps = this.getStepsByStatus(plan, 'pending');
    if (pendingSteps.length === 0) {
      return null;
    }

    // Sort by order and return the first one
    return pendingSteps.sort((a, b) => a.order - b.order)[0] || null;
  }

  /**
   * Gets completion timeline for completed steps
   */
  getCompletionTimeline(plan: ActionPlan): Array<{
    stepId: string;
    stepContent: string;
    completedAt: Date;
  }> {
    return plan.steps
      .filter(step => step.status === 'completed' && step.completedAt)
      .map(step => ({
        stepId: step.id,
        stepContent: step.content,
        completedAt: step.completedAt instanceof Date ? step.completedAt : new Date(step.completedAt!),
      }))
      .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  }

  /**
   * Calculates average time between step completions
   */
  calculateAverageStepCompletionTime(plan: ActionPlan): number | null {
    const timeline = this.getCompletionTimeline(plan);
    
    if (timeline.length < 2) {
      return null; // Need at least 2 completed steps to calculate average
    }

    let totalTime = 0;
    for (let i = 1; i < timeline.length; i++) {
      const timeDiff = timeline[i]!.completedAt.getTime() - timeline[i - 1]!.completedAt.getTime();
      totalTime += timeDiff;
    }

    // Return average time in minutes
    return Math.round(totalTime / (timeline.length - 1) / (1000 * 60));
  }

  /**
   * Estimates time to completion based on current progress
   */
  estimateTimeToCompletion(plan: ActionPlan): {
    estimatedMinutes: number | null;
    confidence: 'low' | 'medium' | 'high';
    reasoning: string;
  } {
    const stats = this.getActionPlanStats(plan);
    const avgTime = this.calculateAverageStepCompletionTime(plan);

    if (stats.completedSteps === 0) {
      return {
        estimatedMinutes: null,
        confidence: 'low',
        reasoning: 'No completed steps to base estimation on',
      };
    }

    if (stats.pendingSteps === 0) {
      return {
        estimatedMinutes: 0,
        confidence: 'high',
        reasoning: 'All steps completed',
      };
    }

    if (!avgTime || stats.completedSteps < 2) {
      return {
        estimatedMinutes: null,
        confidence: 'low',
        reasoning: 'Insufficient completion history for reliable estimation',
      };
    }

    const estimatedMinutes = avgTime * stats.pendingSteps;
    let confidence: 'low' | 'medium' | 'high' = 'low';

    if (stats.completedSteps >= 5) {
      confidence = 'high';
    } else if (stats.completedSteps >= 3) {
      confidence = 'medium';
    }

    return {
      estimatedMinutes,
      confidence,
      reasoning: `Based on ${stats.completedSteps} completed steps with average ${avgTime} minutes per step`,
    };
  }

  /**
   * Updates multiple steps at once (batch operation)
   */
  async batchUpdateSteps(
    existingPlan: ActionPlan,
    updates: Array<{
      stepId: string;
      status?: ActionStep['status'];
      notes?: string;
    }>
  ): Promise<ActionPlan> {
    try {
      logger.debug('Batch updating steps', {
        planId: existingPlan.id,
        updateCount: updates.length,
      });

      let updatedPlan = existingPlan;

      // Apply each update sequentially
      for (const update of updates) {
        if (update.status !== undefined) {
          updatedPlan = await this.updateStepProgress(updatedPlan, {
            planId: existingPlan.id,
            stepId: update.stepId,
            status: update.status,
            notes: update.notes,
          });
        }
      }

      logger.info('Batch step updates completed successfully', {
        planId: existingPlan.id,
        updateCount: updates.length,
        newVersion: updatedPlan.version,
      });

      return updatedPlan;
    } catch (error) {
      logger.error('Failed to batch update steps', {
        planId: existingPlan.id,
        updateCount: updates.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Validates step status transition
   */
  isValidStepStatusTransition(
    currentStatus: ActionStep['status'],
    newStatus: ActionStep['status']
  ): boolean {
    // Allow same status (no-op)
    if (currentStatus === newStatus) {
      return true;
    }

    // Define valid transitions for steps
    const validTransitions: Record<ActionStep['status'], ActionStep['status'][]> = {
      pending: ['in_progress', 'completed'],
      in_progress: ['completed', 'pending'],
      completed: ['pending', 'in_progress'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Gets progress summary for display
   */
  getProgressSummary(plan: ActionPlan): {
    progress: number;
    statusText: string;
    nextStep?: string;
    completedToday: number;
    estimatedCompletion?: string;
  } {
    const stats = this.getActionPlanStats(plan);
    const nextStep = this.getNextPendingStep(plan);
    const estimation = this.estimateTimeToCompletion(plan);

    // Count steps completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = plan.steps.filter(step => {
      if (step.status !== 'completed' || !step.completedAt) {
        return false;
      }
      const completedDate = step.completedAt instanceof Date ? step.completedAt : new Date(step.completedAt);
      return completedDate >= today;
    }).length;

    let statusText = '';
    if (stats.progress === 100) {
      statusText = 'All steps completed';
    } else if (stats.inProgressSteps > 0) {
      statusText = `${stats.inProgressSteps} step${stats.inProgressSteps > 1 ? 's' : ''} in progress`;
    } else if (stats.completedSteps > 0) {
      statusText = `${stats.completedSteps}/${stats.totalSteps} steps completed`;
    } else {
      statusText = 'Not started';
    }

    let estimatedCompletion: string | undefined;
    if (estimation.estimatedMinutes && estimation.confidence !== 'low') {
      const hours = Math.floor(estimation.estimatedMinutes / 60);
      const minutes = estimation.estimatedMinutes % 60;
      if (hours > 0) {
        estimatedCompletion = `~${hours}h ${minutes}m remaining`;
      } else {
        estimatedCompletion = `~${minutes}m remaining`;
      }
    }

    return {
      progress: stats.progress,
      statusText,
      ...(nextStep?.content && { nextStep: nextStep.content }),
      completedToday,
      ...(estimatedCompletion && { estimatedCompletion }),
    };
  }
}