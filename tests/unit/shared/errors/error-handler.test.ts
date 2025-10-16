/**
 * Error handler tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ERROR_HANDLER } from '../../../../src/shared/errors/error-handler.js';
import {
  ActionPlanParseError,
  ProjectManagementError,
  NotesError,
  PrettyPrintError,
  CleanupError,
  MigrationError,
} from '../../../../src/shared/types/errors.js';
import { validator } from '../../../../src/shared/utils/validation.js';

describe('Error Handler', () => {
  beforeEach(() => {
    // Clear any existing error reports
    ERROR_HANDLER['errorReports'] = [];
    ERROR_HANDLER['alerts'] = [];
    ERROR_HANDLER['circuitBreakers'].clear();
  });

  afterEach(() => {
    // Clean up after each test
    ERROR_HANDLER['errorReports'] = [];
    ERROR_HANDLER['alerts'] = [];
    ERROR_HANDLER['circuitBreakers'].clear();
  });

  describe('Error Handling', () => {
    it('should handle basic errors', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'test_operation',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report).toBeDefined();
      expect(report.error).toBe(error);
      expect(report.context).toBe(context);
      expect(report.category).toBe('unknown');
      expect(report.severity).toBe('low');
    });

    it('should categorize action plan errors', () => {
      const error = new ActionPlanParseError(
        'Invalid action plan format',
        'parse failed'
      );
      const context = {
        operation: 'parse_action_plan',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report.category).toBe('action_plan');
      expect(report.recoverable).toBe(true);
    });

    it('should categorize project management errors', () => {
      const error = new ProjectManagementError(
        'Invalid project tag',
        'PROJECT_TAG_INVALID'
      );
      const context = {
        operation: 'validate_project_tag',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report.category).toBe('project_management');
      expect(report.recoverable).toBe(true);
    });

    it('should categorize notes errors', () => {
      const error = new NotesError('Note content too long', 'NOTE_TOO_LONG');
      const context = {
        operation: 'save_note',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report.category).toBe('notes');
      expect(report.recoverable).toBe(true);
    });

    it('should categorize pretty print errors', () => {
      const error = new PrettyPrintError(
        'Invalid format options',
        'INVALID_FORMAT'
      );
      const context = {
        operation: 'format_output',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report.category).toBe('formatting');
      expect(report.recoverable).toBe(true);
    });

    it('should categorize cleanup errors', () => {
      const error = new CleanupError(
        'Cleanup operation failed',
        'CLEANUP_FAILED'
      );
      const context = {
        operation: 'cleanup_lists',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report.category).toBe('cleanup');
      expect(report.recoverable).toBe(true);
    });

    it('should categorize migration errors', () => {
      const error = new MigrationError('Migration failed', 'MIGRATION_FAILED');
      const context = {
        operation: 'migrate_data',
        timestamp: Date.now(),
      };

      const report = ERROR_HANDLER.handleError(error, context);

      expect(report.category).toBe('migration');
      expect(report.recoverable).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const context = {
        operation: 'retry_test',
        timestamp: Date.now(),
      };

      const result = await ERROR_HANDLER.executeWithRetry(operation, context, {
        maxAttempts: 3,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));
      const context = {
        operation: 'retry_test_fail',
        timestamp: Date.now(),
      };

      await expect(
        ERROR_HANDLER.executeWithRetry(operation, context, {
          maxAttempts: 2,
          baseDelay: 10,
        })
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));
      const context = {
        operation: 'circuit_test',
        timestamp: Date.now(),
      };

      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await ERROR_HANDLER.executeWithRetry(operation, context, {
            maxAttempts: 1,
          });
        } catch {
          // Expected to fail
        }
      }

      // Circuit should be open now
      const states = ERROR_HANDLER.getCircuitBreakerStates();
      const circuitState = states.find(s => s.name === 'circuit_test');

      expect(circuitState?.state).toBe('open');
    });

    it('should reset circuit breaker', () => {
      // First, create a circuit breaker by triggering failures
      const _context = {
        operation: 'reset_test',
        timestamp: Date.now(),
      };

      // Manually create circuit breaker state
      ERROR_HANDLER['circuitBreakers'].set('reset_test', {
        name: 'reset_test',
        state: 'open',
        failureCount: 5,
        lastFailureTime: Date.now(),
        nextAttemptTime: Date.now() + 60000,
        successCount: 0,
      });

      ERROR_HANDLER.resetCircuitBreaker('reset_test');

      const states = ERROR_HANDLER.getCircuitBreakerStates();
      const circuitState = states.find(s => s.name === 'reset_test');

      expect(circuitState?.state).toBe('closed');
      expect(circuitState?.failureCount).toBe(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle operation timeout', async () => {
      const slowOperation = () =>
        new Promise(resolve => setTimeout(resolve, 200));
      const context = {
        operation: 'timeout_test',
        timestamp: Date.now(),
      };

      await expect(
        ERROR_HANDLER.executeWithTimeout(slowOperation, context, {
          timeout: 50,
        })
      ).rejects.toThrow('Operation timed out after 50ms');
    });

    it('should complete fast operations within timeout', async () => {
      const fastOperation = () => Promise.resolve('completed');
      const context = {
        operation: 'fast_test',
        timestamp: Date.now(),
      };

      const result = await ERROR_HANDLER.executeWithTimeout(
        fastOperation,
        context,
        { timeout: 1000 }
      );

      expect(result).toBe('completed');
    });
  });
});

describe('Enhanced Validation', () => {
  describe('Safe Validation', () => {
    it('should return valid result for successful validation', () => {
      const result = validator.validateSafely(
        () => 'valid result',
        'fallback',
        'test context'
      );

      expect(result.isValid).toBe(true);
      expect(result.result).toBe('valid result');
    });

    it('should return fallback for failed validation', () => {
      const result = validator.validateSafely(
        () => {
          throw new Error('validation failed');
        },
        'fallback value',
        'test context'
      );

      expect(result.isValid).toBe(false);
      expect(result.result).toBe('fallback value');
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex error scenarios', async () => {
      // Simulate a complex scenario where multiple features fail
      const actionPlanError = new ActionPlanParseError(
        'invalid content',
        'parse failed'
      );
      const projectError = new ProjectManagementError(
        'invalid tag',
        'INVALID_TAG'
      );
      const notesError = new NotesError('note too long', 'TOO_LONG');

      const errors = [actionPlanError, projectError, notesError];
      const reports = errors.map((error, index) =>
        ERROR_HANDLER.handleError(error, {
          operation: `complex_scenario_${index}`,
          timestamp: Date.now(),
        })
      );

      expect(reports).toHaveLength(3);
      expect(reports[0]!.category).toBe('action_plan');
      expect(reports[1]!.category).toBe('project_management');
      expect(reports[2]!.category).toBe('notes');

      // All should be recoverable
      expect(reports.every(r => r.recoverable)).toBe(true);
    });
  });
});
