/**
 * Unit tests for Handler Error Formatter
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  formatHandlerError,
  createHandlerErrorFormatter,
  withErrorHandling,
  ERROR_CONFIGS,
} from '../../../../src/shared/utils/handler-error-formatter.js';

describe('Handler Error Formatter', () => {
  describe('formatHandlerError', () => {
    it('should format Zod validation errors with enhanced messages', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
        tags: z.array(z.string()),
      });

      try {
        schema.parse({ priority: 'high', tags: 'urgent' });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('❌');
        expect(result.content[0]?.text).toContain('🔧 Common fixes');
        expect(result.content[0]?.text).toContain('📝 Working example');
      }
    });

    it('should handle non-Zod errors gracefully', () => {
      const error = new Error('Something went wrong');
      const result = formatHandlerError(error, { toolName: 'add_task' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Error: Something went wrong');
    });

    it('should respect configuration options', () => {
      const schema = z.object({
        priority: z.number(),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const result = formatHandlerError(error, {
          toolName: 'add_task',
          includeExamples: false,
          maxCommonMistakes: 1,
        });

        expect(result.content[0]?.text).not.toContain('📝 Working example');
        expect(result.content[0]?.text).toContain('🔧 Common fixes');
      }
    });
  });

  describe('createHandlerErrorFormatter', () => {
    it('should create a reusable error formatter for a tool', () => {
      const formatError = createHandlerErrorFormatter('add_task');
      const error = new Error('Test error');
      const result = formatError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Error: Test error');
    });

    it('should use tool-specific configuration', () => {
      const formatError = createHandlerErrorFormatter('add_task', {
        includeExamples: false,
      });

      const schema = z.object({ priority: z.number() });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const result = formatError(error);
        expect(result.content[0]?.text).not.toContain('📝 Working example');
      }
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap handler functions with error formatting', async () => {
      const mockHandler = async (request: any) => {
        const schema = z.object({ priority: z.number() });
        schema.parse(request.params?.arguments);
        return { success: true };
      };

      const wrappedHandler = withErrorHandling('add_task', mockHandler);

      // Test successful execution
      const successResult = await wrappedHandler({
        params: { arguments: { priority: 5 } },
      });
      expect(successResult).toEqual({ success: true });

      // Test error handling
      const errorResult = await wrappedHandler({
        params: { arguments: { priority: 'high' } },
      });

      expect((errorResult as any).isError).toBe(true);
    });
  });

  describe('ERROR_CONFIGS', () => {
    it('should provide predefined configurations', () => {
      expect(ERROR_CONFIGS.listManagement).toBeDefined();
      expect(ERROR_CONFIGS.taskManagement).toBeDefined();
      expect(ERROR_CONFIGS.searchDisplay).toBeDefined();
      expect(ERROR_CONFIGS.advanced).toBeDefined();

      expect(ERROR_CONFIGS.taskManagement.maxCommonMistakes).toBe(3);
      expect(ERROR_CONFIGS.searchDisplay.includeExamples).toBe(false);
    });
  });

  describe('Integration with Tool Examples', () => {
    it('should include tool-specific examples when available', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });

        expect(result.content[0]?.text).toContain('📝 Working example');
        expect(result.content[0]?.text).toContain('listId');
        expect(result.content[0]?.text).toContain('title');
      }
    });

    it('should include common mistakes when available', () => {
      const schema = z.object({
        priority: z.number(),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });

        expect(result.content[0]?.text).toContain('🔧 Common fixes');
        expect(result.content[0]?.text).toContain('Use numbers 1-5');
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear, actionable error messages', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
        tags: z.array(z.string()),
      });

      try {
        schema.parse({ priority: 'urgent', tags: 'important' });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });
        const message = result.content[0]?.text || '';

        // Should contain clear error indicators
        expect(message).toContain('❌');

        // Should contain helpful sections
        expect(message).toContain('🔧 Common fixes');
        expect(message).toContain('📝 Working example');

        // Should be reasonably long (detailed)
        expect(message.length).toBeGreaterThan(200);

        // Should contain actionable guidance
        expect(message.toLowerCase()).toMatch(/use|provide|try|example/);
      }
    });

    it('should handle multiple validation errors', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
        tags: z.array(z.string()),
        estimatedDuration: z.number().min(1),
      });

      try {
        schema.parse({
          priority: 'high',
          tags: 'urgent',
          estimatedDuration: '2 hours',
        });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });
        const message = result.content[0]?.text || '';

        // Should handle multiple errors
        expect(message).toContain('validation error');
        expect(message).toContain('priority');
        expect(message).toContain('tags');
        expect(message).toContain('estimatedDuration');
      }
    });
  });
});
