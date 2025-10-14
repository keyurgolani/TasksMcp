/**
 * Exit Criteria Manager - Handles CRUD operations for task exit criteria
 */

import { v4 as uuidv4 } from 'uuid';

import { createOrchestrationError } from '../../shared/utils/error-formatter.js';
import { logger } from '../../shared/utils/logger.js';

import type { ExitCriteria } from '../../shared/types/task.js';
import type { ITaskListRepository } from '../repositories/task-list.repository.js';

export interface CreateExitCriteriaInput {
  taskId: string;
  description: string;
}

export interface UpdateExitCriteriaInput {
  criteriaId: string;
  description?: string;
  isMet?: boolean;
  notes?: string;
}

export interface ExitCriteriaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Manages exit criteria for tasks - conditions that must be met for task completion
 *
 * Provides functionality for:
 * - Creating and validating exit criteria
 * - Updating criteria status and notes
 * - Checking if all criteria are met for task completion
 *
 * @example
 * ```typescript
 * const manager = new ExitCriteriaManager(repository);
 * const criteria = await manager.createExitCriteria({
 *   taskId: 'task-123',
 *   description: 'All tests must pass'
 * });
 * ```
 */
export class ExitCriteriaManager {
  // Repository for future direct exit criteria persistence
  // Currently unused but prepared for future enhancements
  private readonly repository: ITaskListRepository | undefined;

  constructor(repository?: ITaskListRepository) {
    this.repository = repository;

    logger.debug('ExitCriteriaManager initialized', {
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
   * Creates a new exit criteria for a task
   */
  async createExitCriteria(
    input: CreateExitCriteriaInput
  ): Promise<ExitCriteria> {
    try {
      logger.debug('Creating exit criteria', {
        taskId: input.taskId,
        description: input.description,
      });

      // Validate input
      this.validateExitCriteriaDescription(input.description);

      const criteriaId = uuidv4();

      const exitCriteria: ExitCriteria = {
        id: criteriaId,
        description: input.description.trim(),
        isMet: false,
      };

      logger.info('Exit criteria created successfully', {
        criteriaId,
        taskId: input.taskId,
        description: exitCriteria.description,
      });

      return exitCriteria;
    } catch (error) {
      logger.error('Failed to create exit criteria', {
        taskId: input.taskId,
        error,
      });
      throw error;
    }
  }

  /**
   * Updates an existing exit criteria
   */
  async updateExitCriteria(
    existingCriteria: ExitCriteria,
    updates: Partial<ExitCriteria>
  ): Promise<ExitCriteria> {
    try {
      logger.debug('Updating exit criteria', {
        criteriaId: existingCriteria.id,
        hasDescriptionUpdate: !!updates.description,
        hasStatusUpdate: updates.isMet !== undefined,
      });

      // Validate updates
      if (updates.description !== undefined) {
        this.validateExitCriteriaDescription(updates.description);
      }

      const now = new Date();

      const updatedCriteria: ExitCriteria = {
        ...existingCriteria,
        ...updates,
        // Preserve original ID
        id: existingCriteria.id,
      };

      // Trim description if updated
      if (updatedCriteria.description) {
        updatedCriteria.description = updatedCriteria.description.trim();
      }

      // Handle completion timestamp
      if (updates.isMet === true && existingCriteria.isMet !== true) {
        updatedCriteria.metAt = now;
      } else if (updates.isMet === false) {
        delete updatedCriteria.metAt;
      }

      logger.info('Exit criteria updated successfully', {
        criteriaId: existingCriteria.id,
        descriptionChanged: updates.description !== undefined,
        statusChanged: updates.isMet !== undefined,
        newStatus: updatedCriteria.isMet,
      });

      return updatedCriteria;
    } catch (error) {
      logger.error('Failed to update exit criteria', {
        criteriaId: existingCriteria.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Marks an exit criteria as met
   */
  async markCriteriaMet(
    existingCriteria: ExitCriteria,
    notes?: string
  ): Promise<ExitCriteria> {
    return this.updateExitCriteria(existingCriteria, {
      isMet: true,
      ...(notes && { notes }),
    });
  }

  /**
   * Marks an exit criteria as not met
   */
  async markCriteriaNotMet(
    existingCriteria: ExitCriteria,
    notes?: string
  ): Promise<ExitCriteria> {
    return this.updateExitCriteria(existingCriteria, {
      isMet: false,
      ...(notes && { notes }),
    });
  }

  /**
   * Calculates completion percentage for exit criteria
   */
  calculateCriteriaProgress(criteria: ExitCriteria[]): number {
    try {
      if (criteria.length === 0) {
        return 100; // No criteria means task can be completed
      }

      const metCriteria = criteria.filter(c => c.isMet).length;
      const progress = Math.round((metCriteria / criteria.length) * 100);

      logger.debug('Exit criteria progress calculated', {
        totalCriteria: criteria.length,
        metCriteria,
        progress,
      });

      return progress;
    } catch (error) {
      logger.error('Failed to calculate criteria progress', { error });
      return 0;
    }
  }

  /**
   * Checks if all exit criteria are met
   */
  areAllCriteriaMet(criteria: ExitCriteria[]): boolean {
    if (criteria.length === 0) {
      return true; // No criteria means task can be completed
    }

    return criteria.every(c => c.isMet);
  }

  /**
   * Gets unmet exit criteria
   */
  getUnmetCriteria(criteria: ExitCriteria[]): ExitCriteria[] {
    return criteria.filter(c => !c.isMet);
  }

  /**
   * Gets met exit criteria
   */
  getMetCriteria(criteria: ExitCriteria[]): ExitCriteria[] {
    return criteria.filter(c => c.isMet);
  }

  /**
   * Validates exit criteria description
   */
  private validateExitCriteriaDescription(
    description: string
  ): ExitCriteriaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if description is provided
    if (!description || description.trim().length === 0) {
      errors.push('Exit criteria description cannot be empty');
    }

    // Check description length (reasonable limits)
    if (description.length > 500) {
      errors.push(
        'Exit criteria description is too long (maximum 500 characters)'
      );
    }

    // Check for minimum meaningful content
    if (description.trim().length < 5) {
      warnings.push(
        'Exit criteria description is very short and may not be meaningful'
      );
    }

    // Check for potentially problematic content
    if (description.includes('\0')) {
      errors.push('Exit criteria description contains null characters');
    }

    const result: ExitCriteriaValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (!result.isValid) {
      throw createOrchestrationError('Exit criteria validation failed', {
        context: {
          operation: 'Exit Criteria Validation',
          field: 'exitCriteria',
          currentValue: errors,
          expectedValue: 'valid exit criteria',
          additionalContext: { errorCount: errors.length },
        },
        actionableGuidance: `Fix the following validation errors: ${errors.join('; ')}. Ensure all exit criteria have clear, measurable descriptions.`,
      });
    }

    if (warnings.length > 0) {
      logger.warn('Exit criteria validation warnings', {
        warnings,
        descriptionLength: description.length,
      });
    }

    return result;
  }

  /**
   * Gets exit criteria progress
   */
  getExitCriteriaProgress(criteria: ExitCriteria[]): {
    total: number;
    met: number;
    unmet: number;
    progress: number;
    completedToday: number;
    averageCompletionTime?: number;
  } {
    const total = criteria.length;
    const met = this.getMetCriteria(criteria).length;
    const unmet = this.getUnmetCriteria(criteria).length;
    const progress = this.calculateCriteriaProgress(criteria);

    // Count criteria completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = criteria.filter(c => {
      if (!c.isMet || !c.metAt) {
        return false;
      }
      const metDate = c.metAt instanceof Date ? c.metAt : new Date(c.metAt);
      return metDate >= today;
    }).length;

    return {
      total,
      met,
      unmet,
      progress,
      completedToday,
    };
  }

  /**
   * Formats exit criteria for display
   */
  formatCriteriaForDisplay(
    criteria: ExitCriteria[],
    options: {
      showOnlyUnmet?: boolean;
      includeNotes?: boolean;
      includeTimestamps?: boolean;
    } = {}
  ): string {
    const {
      showOnlyUnmet = false,
      includeNotes = true,
      includeTimestamps = false,
    } = options;

    if (criteria.length === 0) {
      return 'No exit criteria defined.';
    }

    let filteredCriteria = criteria;
    if (showOnlyUnmet) {
      filteredCriteria = this.getUnmetCriteria(criteria);
      if (filteredCriteria.length === 0) {
        return 'All exit criteria have been met! ✅';
      }
    }

    const sortedCriteria = filteredCriteria;

    const formattedCriteria = sortedCriteria.map((criteria, index) => {
      const status = criteria.isMet ? '✅' : '❌';
      let formatted = `${index + 1}. ${status} ${criteria.description}`;

      if (includeNotes && criteria.notes) {
        formatted += `\n   Notes: ${criteria.notes}`;
      }

      if (includeTimestamps && criteria.metAt) {
        const metAt =
          criteria.metAt instanceof Date
            ? criteria.metAt
            : new Date(criteria.metAt);
        formatted += `\n   Completed: ${metAt.toLocaleString()}`;
      }

      return formatted;
    });

    const progress = this.getExitCriteriaProgress(criteria);
    const header = `Exit Criteria Progress: ${progress.met}/${progress.total} (${progress.progress}%)`;

    return `${header}\n\n${formattedCriteria.join('\n\n')}`;
  }

  /**
   * Validates a collection of exit criteria
   */
  validateExitCriteriaCollection(criteria: ExitCriteria[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validCriteria: ExitCriteria[];
    invalidCriteria: Array<{ criteria: ExitCriteria; errors: string[] }>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validCriteria: ExitCriteria[] = [];
    const invalidCriteria: Array<{ criteria: ExitCriteria; errors: string[] }> =
      [];

    for (const criterion of criteria) {
      try {
        // Validate criteria structure
        if (!criterion.id || typeof criterion.id !== 'string') {
          invalidCriteria.push({
            criteria: criterion,
            errors: ['Missing or invalid criteria ID'],
          });
          continue;
        }

        if (
          !criterion.description ||
          typeof criterion.description !== 'string'
        ) {
          invalidCriteria.push({
            criteria: criterion,
            errors: ['Missing or invalid criteria description'],
          });
          continue;
        }

        if (typeof criterion.isMet !== 'boolean') {
          invalidCriteria.push({
            criteria: criterion,
            errors: ['Missing or invalid criteria status'],
          });
          continue;
        }

        // Validate description
        this.validateExitCriteriaDescription(criterion.description);

        validCriteria.push(criterion);
      } catch (validationError) {
        const errorMessage =
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error';
        invalidCriteria.push({ criteria: criterion, errors: [errorMessage] });
      }
    }

    if (invalidCriteria.length > 0) {
      errors.push(`${invalidCriteria.length} invalid exit criteria found`);
    }

    if (criteria.length > 20) {
      warnings.push('Large number of exit criteria may be difficult to manage');
    }

    // Check for duplicate descriptions
    const descriptions = validCriteria.map(c => c.description.toLowerCase());
    const duplicates = descriptions.filter(
      (desc, index) => descriptions.indexOf(desc) !== index
    );
    if (duplicates.length > 0) {
      warnings.push('Duplicate exit criteria descriptions found');
    }

    return {
      isValid: invalidCriteria.length === 0,
      errors,
      warnings,
      validCriteria,
      invalidCriteria,
    };
  }
}
