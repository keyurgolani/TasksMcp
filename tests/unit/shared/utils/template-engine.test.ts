/**
 * Unit tests for TemplateEngine
 * Tests template parsing, rendering, and variable substitution
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';
import { TemplateEngine } from '../../../../src/shared/utils/template-engine.js';

import type {
  Task,
  TaskList,
  TemplateContext,
} from '../../../../src/shared/types/task.js';

describe('TemplateEngine', () => {
  let mockTask: Task;
  let mockList: TaskList;
  let context: TemplateContext;

  beforeEach(() => {
    mockTask = {
      id: 'task-123',
      title: 'Test Task',
      description: 'A test task for template rendering',
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      dependencies: ['dep-1', 'dep-2'],
      tags: ['urgent', 'frontend'],
      metadata: { customField: 'customValue' },
      implementationNotes: [],
      exitCriteria: [],
    };

    mockList = {
      id: 'list-456',
      title: 'Test Project',
      description: 'A test project list',
      items: [mockTask],
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      context: 'test-context',
      isArchived: false,
      totalItems: 1,
      completedItems: 0,
      progress: 0,
      analytics: {
        totalItems: 1,
        completedItems: 0,
        pendingItems: 1,
        inProgressItems: 0,
        blockedItems: 0,
        progress: 0,
        averageCompletionTime: 0,
        estimatedTimeRemaining: 0,
        velocityMetrics: {
          itemsPerDay: 0,
          completionRate: 0,
        },
        tagFrequency: { urgent: 1, frontend: 1 },
        dependencyGraph: [],
      },
      metadata: {},
      projectTag: 'test-project',
      implementationNotes: [],
    };

    context = TemplateEngine.createTemplateContext(mockTask, mockList);
  });

  describe('validateTemplate', () => {
    it('should validate empty template as valid', () => {
      const result = TemplateEngine.validateTemplate('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate template with valid variables', () => {
      const template = 'Task: {{task.title}} in {{list.title}}';
      const result = TemplateEngine.validateTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject template exceeding maximum length', () => {
      const template = 'x'.repeat(10001);
      const result = TemplateEngine.validateTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Template exceeds maximum length of 10000 characters (current: 10001)'
      );
    });

    it('should reject template with invalid variable syntax', () => {
      const template = 'Task: {{invalid.namespace.field}}';
      const result = TemplateEngine.validateTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid variable references');
    });

    it('should reject template with malformed variable paths', () => {
      const template = 'Task: {{task..title}} and {{list.}}';
      const result = TemplateEngine.validateTemplate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid variable references');
    });
  });

  describe('renderTemplate', () => {
    it('should render empty template', async () => {
      const result = await TemplateEngine.renderTemplate('', context);
      expect(result.rendered).toBe('');
      expect(result.variablesUsed).toEqual([]);
      expect(result.errors).toBeUndefined();
    });

    it('should render template with task variables', async () => {
      const template = 'Task: {{task.title}} ({{task.status}})';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.rendered).toBe('Task: Test Task (pending)');
      expect(result.variablesUsed).toEqual([
        '{{task.title}}',
        '{{task.status}}',
      ]);
      expect(result.errors).toBeUndefined();
    });

    it('should render template with list variables', async () => {
      const template = 'Project: {{list.title}} ({{list.projectTag}})';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.rendered).toBe('Project: Test Project (test-project)');
      expect(result.variablesUsed).toEqual([
        '{{list.title}}',
        '{{list.projectTag}}',
      ]);
      expect(result.errors).toBeUndefined();
    });

    it('should render template with nested properties', async () => {
      const template = 'Custom: {{task.metadata.customField}}';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.rendered).toBe('Custom: customValue');
      expect(result.variablesUsed).toEqual(['{{task.metadata.customField}}']);
      expect(result.errors).toBeUndefined();
    });

    it('should render template with array properties', async () => {
      const template =
        'Tags: {{task.tags}} Dependencies: {{task.dependencies}}';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.rendered).toBe(
        'Tags: urgent, frontend Dependencies: dep-1, dep-2'
      );
      expect(result.variablesUsed).toEqual([
        '{{task.tags}}',
        '{{task.dependencies}}',
      ]);
      expect(result.errors).toBeUndefined();
    });

    it('should render template with date properties', async () => {
      const template = 'Created: {{task.createdAt}}';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.rendered).toBe('Created: 2023-01-01T00:00:00.000Z');
      expect(result.variablesUsed).toEqual(['{{task.createdAt}}']);
      expect(result.errors).toBeUndefined();
    });

    it('should handle missing properties gracefully', async () => {
      const template = 'Missing: {{task.nonexistent}}';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.rendered).toBe('Missing: ');
      expect(result.variablesUsed).toEqual(['{{task.nonexistent}}']);
      expect(result.errors).toBeUndefined();
    });

    it('should handle null/undefined values', async () => {
      const taskWithNulls = { ...mockTask, description: undefined };
      const contextWithNulls = TemplateEngine.createTemplateContext(
        taskWithNulls,
        mockList
      );
      const template = 'Description: {{task.description}}';
      const result = await TemplateEngine.renderTemplate(
        template,
        contextWithNulls
      );
      expect(result.rendered).toBe('Description: ');
      expect(result.variablesUsed).toEqual(['{{task.description}}']);
      expect(result.errors).toBeUndefined();
    });

    it('should track render time', async () => {
      const template = 'Simple: {{task.title}}';
      const result = await TemplateEngine.renderTemplate(template, context);
      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.renderTime).toBeLessThan(100); // Should be very fast
    });

    it('should identify simple templates correctly', async () => {
      const simpleTemplate = 'Task: {{task.title}}';
      const result = await TemplateEngine.renderTemplate(
        simpleTemplate,
        context
      );
      expect(result.renderTime).toBeLessThan(50); // Simple template should be fast
    });

    it('should handle complex templates', async () => {
      const complexTemplate = `
# Task: {{task.title}}

## Description
{{task.description}}

## Status and Priority
- Status: {{task.status}}
- Priority: {{task.priority}}
- Created: {{task.createdAt}}
- Updated: {{task.updatedAt}}

## Project Context
- List: {{list.title}}
- Project: {{list.projectTag}}
- Progress: {{list.progress}}%

## Dependencies
{{task.dependencies}}

## Tags
{{task.tags}}

## Metadata
{{task.metadata}}
      `.trim();

      const result = await TemplateEngine.renderTemplate(
        complexTemplate,
        context
      );
      expect(result.rendered).toContain('Task: Test Task');
      expect(result.rendered).toContain('Status: pending');
      expect(result.rendered).toContain('Project: test-project');
      expect(result.variablesUsed.length).toBeGreaterThan(10);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('createTemplateContext', () => {
    it('should create context with task and list data', () => {
      const context = TemplateEngine.createTemplateContext(mockTask, mockList);
      expect(context.task).toBe(mockTask);
      expect(context.list).toBe(mockList);
      expect(context.variables).toBeDefined();
      expect(context.variables.length).toBeGreaterThan(0);
    });

    it('should create template variables for task properties', () => {
      const context = TemplateEngine.createTemplateContext(mockTask, mockList);
      const taskVariables = context.variables.filter(
        v => v.namespace === 'task'
      );
      expect(taskVariables.length).toBeGreaterThan(0);

      const titleVar = taskVariables.find(v => v.name === 'title');
      expect(titleVar).toBeDefined();
      expect(titleVar!.value).toBe('Test Task');
    });

    it('should create template variables for list properties', () => {
      const context = TemplateEngine.createTemplateContext(mockTask, mockList);
      const listVariables = context.variables.filter(
        v => v.namespace === 'list'
      );
      expect(listVariables.length).toBeGreaterThan(0);

      const titleVar = listVariables.find(v => v.name === 'title');
      expect(titleVar).toBeDefined();
      expect(titleVar!.value).toBe('Test Project');
    });
  });

  describe('performance requirements', () => {
    it('should render simple templates in under 10ms', async () => {
      const simpleTemplate = 'Task: {{task.title}} - {{task.status}}';
      const startTime = performance.now();
      const result = await TemplateEngine.renderTemplate(
        simpleTemplate,
        context
      );
      const endTime = performance.now();

      expect(result.errors).toBeUndefined();
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should render complex templates in under 50ms', async () => {
      const complexTemplate = `
# Task Analysis: {{task.title}}

## Overview
- **Status**: {{task.status}}
- **Priority**: {{task.priority}}
- **Created**: {{task.createdAt}}
- **Updated**: {{task.updatedAt}}

## Project Context
- **List**: {{list.title}}
- **Project Tag**: {{list.projectTag}}
- **Total Items**: {{list.totalItems}}
- **Completed**: {{list.completedItems}}
- **Progress**: {{list.progress}}%

## Task Details
- **Description**: {{task.description}}
- **Dependencies**: {{task.dependencies}}
- **Tags**: {{task.tags}}
- **Metadata**: {{task.metadata}}

## Analytics
- **Tag Frequency**: {{list.analytics.tagFrequency}}
- **Velocity**: {{list.analytics.velocityMetrics}}
      `.trim();

      const startTime = performance.now();
      const result = await TemplateEngine.renderTemplate(
        complexTemplate,
        context
      );
      const endTime = performance.now();

      expect(result.errors).toBeUndefined();
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('error handling', () => {
    it('should handle invalid template gracefully', async () => {
      const invalidTemplate = 'x'.repeat(10001); // Too long
      const result = await TemplateEngine.renderTemplate(
        invalidTemplate,
        context
      );
      expect(result.rendered).toBe(invalidTemplate); // Returns original on validation failure
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle missing context gracefully', async () => {
      const template = 'Task: {{task.title}}';
      const emptyContext = { task: mockTask, list: mockList, variables: [] };
      const result = await TemplateEngine.renderTemplate(
        template,
        emptyContext
      );
      expect(result.rendered).toBe('Task: Test Task');
      expect(result.errors).toBeUndefined();
    });

    it('should handle template rendering exceptions', async () => {
      const template = 'Task: {{task.title}}';
      const invalidContext = {
        task: null as any,
        list: mockList,
        variables: [],
      };
      const result = await TemplateEngine.renderTemplate(
        template,
        invalidContext
      );
      expect(result.rendered).toBe('Task: {{task.title}}');
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain(
        'Failed to resolve variable {{task.title}}'
      );
    });
  });

  describe('variable substitution scenarios', () => {
    it('should handle persona-based templates', async () => {
      const personaTemplate = `
You are a {{task.tags}} developer working on {{task.title}}.

Your task is: {{task.description}}

Context:
- Project: {{list.title}}
- Status: {{task.status}}
- Priority: {{task.priority}}

Please approach this task with expertise in {{task.tags}} development.
      `.trim();

      const result = await TemplateEngine.renderTemplate(
        personaTemplate,
        context
      );
      expect(result.rendered).toContain('You are a urgent, frontend developer');
      expect(result.rendered).toContain('working on Test Task');
      expect(result.rendered).toContain('Project: Test Project');
      expect(result.errors).toBeUndefined();
    });

    it('should handle instruction-based templates', async () => {
      const instructionTemplate = `
# Instructions for {{task.title}}

## Objective
{{task.description}}

## Requirements
- Status must be: {{task.status}}
- Priority level: {{task.priority}}
- Must include tags: {{task.tags}}

## Context
This task is part of {{list.title}} project ({{list.projectTag}}).
Current progress: {{list.progress}}%

## Dependencies
Before starting, ensure these tasks are complete: {{task.dependencies}}
      `.trim();

      const result = await TemplateEngine.renderTemplate(
        instructionTemplate,
        context
      );
      expect(result.rendered).toContain('Instructions for Test Task');
      expect(result.rendered).toContain('Priority level: 4');
      expect(result.rendered).toContain('Must include tags: urgent, frontend');
      expect(result.errors).toBeUndefined();
    });

    it('should handle mixed variable types', async () => {
      const mixedTemplate = `
Task: {{task.title}} ({{task.status}})
Priority: {{task.priority}} 
Created: {{task.createdAt}}
Tags: {{task.tags}}
Dependencies: {{task.dependencies}}
Metadata: {{task.metadata}}
List Progress: {{list.progress}}%
      `.trim();

      const result = await TemplateEngine.renderTemplate(
        mixedTemplate,
        context
      );
      expect(result.rendered).toContain('Task: Test Task (pending)');
      expect(result.rendered).toContain('Priority: 4');
      expect(result.rendered).toContain('Tags: urgent, frontend');
      expect(result.rendered).toContain('Dependencies: dep-1, dep-2');
      expect(result.errors).toBeUndefined();
    });
  });
});
