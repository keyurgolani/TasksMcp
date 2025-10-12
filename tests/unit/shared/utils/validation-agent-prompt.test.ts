/**
 * Unit tests for Validator agentPromptTemplate validation
 * Tests validation of agent prompt templates
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { Validator } from '../../../../src/shared/utils/validation.js';

describe('Validator - agentPromptTemplate', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('validateAgentPromptTemplate', () => {
    it('should validate empty template', () => {
      const result = validator.validateAgentPromptTemplate('');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('');
      expect(result.errors).toBeUndefined();
    });

    it('should validate simple template', () => {
      const template = 'Task: {{task.title}}';
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should validate complex template with multiple variables', () => {
      const template = `
# Task: {{task.title}}

## Description
{{task.description}}

## Context
- List: {{list.title}}
- Project: {{list.projectTag}}
- Status: {{task.status}}
- Priority: {{task.priority}}

## Instructions
Please work on this task.
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should reject template exceeding maximum length', () => {
      const template = 'x'.repeat(10001);
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain(
        'String must be at most 10000 characters'
      );
    });

    it('should reject template with invalid variable syntax', () => {
      const template = 'Task: {{invalid.namespace.field}}';
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid variable references');
    });

    it('should reject template with malformed variable paths', () => {
      const template = 'Task: {{task..title}}';
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid variable references');
    });

    it('should validate template at exactly maximum length', () => {
      const template = 'x'.repeat(10000);
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should validate template with valid task variables', () => {
      const template = `
Task: {{task.title}}
Description: {{task.description}}
Status: {{task.status}}
Priority: {{task.priority}}
Created: {{task.createdAt}}
Updated: {{task.updatedAt}}
Tags: {{task.tags}}
Dependencies: {{task.dependencies}}
Metadata: {{task.metadata}}
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should validate template with valid list variables', () => {
      const template = `
List: {{list.title}}
Description: {{list.description}}
Project: {{list.projectTag}}
Progress: {{list.progress}}
Total: {{list.totalItems}}
Completed: {{list.completedItems}}
Created: {{list.createdAt}}
Updated: {{list.updatedAt}}
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should validate template with nested properties', () => {
      const template = `
Custom Field: {{task.metadata.customField}}
Analytics: {{list.analytics.progress}}
Velocity: {{list.analytics.velocityMetrics.itemsPerDay}}
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should reject template with invalid namespace', () => {
      const template = 'Invalid: {{invalid.field}}';
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid variable references');
    });

    it('should reject template with empty variable path', () => {
      const template = 'Empty: {{task.}}';
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid variable references');
    });

    it('should reject template with variable path starting with dot', () => {
      const template = 'Invalid: {{task..field}}';
      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid variable references');
    });

    it('should validate template with mixed content', () => {
      const template = `
# Agent Instructions for {{task.title}}

You are working on a task in the {{list.title}} project.

## Task Details
- **Description**: {{task.description}}
- **Status**: {{task.status}}
- **Priority**: {{task.priority}}
- **Tags**: {{task.tags}}

## Context
This is part of the {{list.projectTag}} project with {{list.totalItems}} total tasks.
Current progress: {{list.progress}}%

## Your Role
Please approach this task as an expert developer.

## Requirements
1. Follow the task description carefully
2. Consider the priority level ({{task.priority}})
3. Be aware of dependencies: {{task.dependencies}}

Good luck!
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should handle template with special characters', () => {
      const template = `
# Task: {{task.title}} 🚀

## Description
{{task.description}}

Special characters: !@#$%^&*()_+-=[]{}|;:'"<>?,.

Unicode: 你好 世界 🌍 ✨ 🎯

## Variables
Task: {{task.title}}
List: {{list.title}}
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });

    it('should validate template with no variables', () => {
      const template = `
# Static Template

This is a static template with no variables.
It should still be valid.

## Instructions
1. Do something
2. Do something else
3. Complete the task
      `.trim();

      const result = validator.validateAgentPromptTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(template);
      expect(result.errors).toBeUndefined();
    });
  });
});
