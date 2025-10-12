/**
 * Template Engine for Agent Prompt Templates
 *
 * Provides parsing and rendering capabilities for agent prompt templates
 * with support for {{task.*}} and {{list.*}} variable references.
 *
 * Performance requirements:
 * - Simple templates: < 10ms rendering time
 * - Complex templates: < 50ms rendering time
 */

import {
  Task,
  TaskList,
  TemplateContext,
  TemplateResult,
  TemplateVariable,
} from '../types/task.js';

/**
 * Template parsing and rendering engine
 */
export class TemplateEngine {
  private static readonly VARIABLE_PATTERN =
    /\{\{(task|list)\.([a-zA-Z0-9_.]+)\}\}/;
  private static readonly MAX_TEMPLATE_LENGTH = 10000;
  private static readonly SIMPLE_TEMPLATE_TIMEOUT = 10; // ms
  private static readonly COMPLEX_TEMPLATE_TIMEOUT = 50; // ms

  /**
   * Validates a template string
   * @param template - The template string to validate
   * @returns Validation result with any errors
   */
  static validateTemplate(template: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template) {
      return { isValid: true, errors: [] }; // Empty template is valid
    }

    if (template.length > this.MAX_TEMPLATE_LENGTH) {
      errors.push(
        `Template exceeds maximum length of ${this.MAX_TEMPLATE_LENGTH} characters (current: ${template.length})`
      );
    }

    // Check for valid variable syntax
    const allVariables = template.match(/\{\{[^}]*\}\}/g) || [];
    const invalidVariables: string[] = [];

    for (const variable of allVariables) {
      const match = variable.match(this.VARIABLE_PATTERN);

      if (!match) {
        // Variable doesn't match the expected pattern
        invalidVariables.push(variable);
        continue;
      }

      const [, namespace, path] = match;

      if (!namespace || !['task', 'list'].includes(namespace)) {
        invalidVariables.push(variable);
        continue;
      }

      // Check for valid property path (no empty segments)
      if (
        path &&
        (path.includes('..') || path.startsWith('.') || path.endsWith('.'))
      ) {
        invalidVariables.push(variable);
      }
    }

    if (invalidVariables.length > 0) {
      errors.push(
        `Invalid variable references: ${invalidVariables.join(', ')}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Renders a template with the provided context
   * @param template - The template string to render
   * @param context - The context containing task and list data
   * @returns Promise resolving to the render result
   */
  static async renderTemplate(
    template: string,
    context: TemplateContext
  ): Promise<TemplateResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const variablesUsed: string[] = [];

    if (!template) {
      return {
        rendered: '',
        renderTime: performance.now() - startTime,
        variablesUsed: [],
      };
    }

    // Validate template first
    const validation = this.validateTemplate(template);
    if (!validation.isValid) {
      return {
        rendered: template,
        renderTime: performance.now() - startTime,
        variablesUsed: [],
        errors: validation.errors,
      };
    }

    try {
      // Replace variables in template
      const globalPattern = new RegExp(this.VARIABLE_PATTERN.source, 'g');
      const rendered = template.replace(
        globalPattern,
        (match, namespace, path) => {
          variablesUsed.push(match);

          try {
            const value = this.resolveVariable(namespace, path, context);
            return this.formatValue(value);
          } catch (error) {
            errors.push(
              `Failed to resolve variable ${match}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            return match; // Keep original variable if resolution fails
          }
        }
      );

      const renderTime = performance.now() - startTime;

      // Check performance requirements
      const isSimple = this.isSimpleTemplate(template);
      const maxTime = isSimple
        ? this.SIMPLE_TEMPLATE_TIMEOUT
        : this.COMPLEX_TEMPLATE_TIMEOUT;

      if (renderTime > maxTime) {
        errors.push(
          `Template rendering exceeded ${maxTime}ms limit (took ${renderTime.toFixed(2)}ms)`
        );
      }

      const result: TemplateResult = {
        rendered,
        renderTime,
        variablesUsed,
      };

      if (errors.length > 0) {
        result.errors = errors;
      }

      return result;
    } catch (error) {
      return {
        rendered: template,
        renderTime: performance.now() - startTime,
        variablesUsed,
        errors: [
          `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Resolves a variable reference to its value
   * @param namespace - The namespace (task or list)
   * @param path - The property path
   * @param context - The template context
   * @returns The resolved value
   */
  private static resolveVariable(
    namespace: string,
    path: string,
    context: TemplateContext
  ): unknown {
    const source = namespace === 'task' ? context.task : context.list;

    if (!source) {
      throw new Error(`${namespace} not available in context`);
    }

    return this.getNestedProperty(source, path);
  }

  /**
   * Gets a nested property from an object using dot notation
   * @param obj - The object to traverse
   * @param path - The property path (e.g., 'status', 'metadata.priority')
   * @returns The property value
   */
  private static getNestedProperty(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined; // Return undefined for missing properties
      }

      if (typeof current !== 'object') {
        return undefined; // Return undefined for non-object values
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Formats a value for template output
   * @param value - The value to format
   * @returns Formatted string representation
   */
  private static formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.formatValue(item)).join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Determines if a template is simple or complex
   * Simple templates have fewer variables and shorter content
   * @param template - The template to analyze
   * @returns True if template is considered simple
   */
  private static isSimpleTemplate(template: string): boolean {
    const globalPattern = new RegExp(this.VARIABLE_PATTERN.source, 'g');
    const variableCount = (template.match(globalPattern) || []).length;
    const templateLength = template.length;

    // Simple criteria: <= 3 variables and <= 500 characters
    return variableCount <= 3 && templateLength <= 500;
  }

  /**
   * Creates template variables from task and list data
   * @param task - The task data
   * @param list - The list data
   * @returns Array of template variables
   */
  static createTemplateVariables(
    task: Task,
    list: TaskList
  ): TemplateVariable[] {
    const variables: TemplateVariable[] = [];

    // Add task variables
    Object.entries(task).forEach(([key, value]) => {
      variables.push({
        name: key,
        namespace: 'task',
        value,
      });
    });

    // Add list variables
    Object.entries(list).forEach(([key, value]) => {
      variables.push({
        name: key,
        namespace: 'list',
        value,
      });
    });

    return variables;
  }

  /**
   * Creates a template context from task and list data
   * @param task - The task data
   * @param list - The list data
   * @returns Template context for rendering
   */
  static createTemplateContext(task: Task, list: TaskList): TemplateContext {
    return {
      task,
      list,
      variables: this.createTemplateVariables(task, list),
    };
  }
}
