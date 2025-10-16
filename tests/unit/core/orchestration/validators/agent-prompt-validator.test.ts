/**
 * Unit tests for AgentPromptValidator
 * Tests agent prompt template validation in orchestration layer
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { AgentPromptValidator } from '../../../../../src/core/orchestration/validators/agent-prompt-validator.js';

describe('AgentPromptValidator', () => {
  let validator: AgentPromptValidator;

  beforeEach(() => {
    validator = new AgentPromptValidator();
  });

  describe('validateTemplate', () => {
    it('should validate simple template successfully', () => {
      const template = 'Task: {{task.title}}';
      const result = validator.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate complex template with multiple variables', () => {
      const template = `
        # Task: {{task.title}}
        
        ## Description
        {{task.description}}
        
        ## Context
        - Status: {{task.status}}
        - Priority: {{task.priority}}
        - List: {{list.title}}
      `;
      const result = validator.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject template exceeding maximum length', () => {
      const template = 'x'.repeat(10001);
      const result = validator.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum length');
    });

    it('should validate empty template', () => {
      const template = '';
      const result = validator.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle undefined template', () => {
      const result = validator.validateTemplate(undefined);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should validate valid agent prompt data', () => {
      const data = {
        agentPromptTemplate: 'Task: {{task.title}} - {{task.description}}',
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing agentPromptTemplate field', () => {
      const data = {};
      const result = validator.validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid template length', () => {
      const data = {
        agentPromptTemplate: 'x'.repeat(10001),
      };
      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
