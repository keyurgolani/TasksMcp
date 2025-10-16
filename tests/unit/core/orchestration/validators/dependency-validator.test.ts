/**
 * Unit tests for DependencyValidator
 * Tests dependency validation in orchestration layer
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { DependencyValidator } from '../../../../../src/core/orchestration/validators/dependency-validator.js';

describe('DependencyValidator', () => {
  let validator: DependencyValidator;

  beforeEach(() => {
    validator = new DependencyValidator();
  });

  describe('validate', () => {
    it('should validate valid dependency data', () => {
      const data = {
        taskId: '550e8400-e29b-41d4-a716-446655440001',
        dependencyIds: ['550e8400-e29b-41d4-a716-446655440002'],
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid taskId format', () => {
      const data = {
        taskId: 'invalid-uuid',
        dependencyIds: ['550e8400-e29b-41d4-a716-446655440002'],
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('taskId');
    });

    it('should reject invalid dependency ID format', () => {
      const data = {
        taskId: '550e8400-e29b-41d4-a716-446655440001',
        dependencyIds: ['invalid-uuid'],
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty dependency array', () => {
      const data = {
        taskId: '550e8400-e29b-41d4-a716-446655440001',
        dependencyIds: [],
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject self-dependency', () => {
      const data = {
        taskId: '550e8400-e29b-41d4-a716-446655440001',
        dependencyIds: ['550e8400-e29b-41d4-a716-446655440001'],
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('self-dependency');
    });
  });
});
