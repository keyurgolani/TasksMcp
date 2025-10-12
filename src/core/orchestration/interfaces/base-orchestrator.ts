/**
 * Base orchestrator interface for all domain orchestrators
 * Provides common patterns for validation, error handling, and data delegation
 */

import { OrchestrationError } from '../../../shared/errors/orchestration-error';
import { ValidationResult } from '../../../shared/types/validation';

export interface DataOperation {
  type: 'create' | 'read' | 'update' | 'delete' | 'search';
  entity: string;
  data?: unknown;
  filters?: Record<string, unknown>;
}

export interface BaseOrchestrator {
  /**
   * Validates input data according to domain rules
   */
  validate(data: unknown): ValidationResult;

  /**
   * Handles errors with proper context and guidance
   */
  handleError(error: Error, context: string): OrchestrationError;

  /**
   * Delegates data operations to appropriate data layer
   */
  delegateData(operation: DataOperation): Promise<unknown>;
}
