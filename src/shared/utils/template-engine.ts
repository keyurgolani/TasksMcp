/**
 * Template Engine for agent prompt rendering
 * Handles variable substitution and template validation
 */

import { TaskList } from '../../domain/models/task-list.js';
import { Task } from '../../domain/models/task.js';
import {
  TemplateContext,
  TemplateResult,
  TemplateValidationResult,
  TemplateVariable,
} from '../types/template.js';

export class TemplateEngine {
  // Static methods for backward compatibility
  static createTemplateContext(task: unknown, list: unknown): TemplateContext {
    const engine = new TemplateEngine();
    return engine.createContext(task, list);
  }

  static async renderTemplate(
    template: string,
    context: TemplateContext
  ): Promise<TemplateResult> {
    const engine = new TemplateEngine();
    return await engine.render(template, context);
  }

  static validateTemplate(template: string): TemplateValidationResult {
    const engine = new TemplateEngine();
    return engine.validate(template);
  }

  createContext(task: unknown, list: unknown): TemplateContext {
    const variables: TemplateVariable[] = [];

    // Create task variables
    if (task && typeof task === 'object') {
      Object.keys(task).forEach(key => {
        const value = (task as Record<string, unknown>)[key];
        let type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

        if (Array.isArray(value)) {
          type = 'array';
        } else if (value instanceof Date) {
          type = 'date';
        } else if (typeof value === 'string') {
          type = 'string';
        } else if (typeof value === 'number') {
          type = 'number';
        } else if (typeof value === 'boolean') {
          type = 'boolean';
        } else {
          type = 'object';
        }

        variables.push({
          namespace: 'task',
          name: key,
          value,
          type,
        });
      });
    }

    // Create list variables
    if (list && typeof list === 'object') {
      Object.keys(list).forEach(key => {
        const value = (list as Record<string, unknown>)[key];
        let type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

        if (Array.isArray(value)) {
          type = 'array';
        } else if (value instanceof Date) {
          type = 'date';
        } else if (typeof value === 'string') {
          type = 'string';
        } else if (typeof value === 'number') {
          type = 'number';
        } else if (typeof value === 'boolean') {
          type = 'boolean';
        } else {
          type = 'object';
        }

        variables.push({
          namespace: 'list',
          name: key,
          value,
          type,
        });
      });
    }

    return {
      task: task as Task,
      list: list as TaskList,
      variables,
    };
  }

  async render(
    template: string,
    context: TemplateContext
  ): Promise<TemplateResult> {
    const startTime = performance.now();
    const errors: string[] = [];

    // Validate template first
    const validation = this.validate(template);
    if (!validation.isValid) {
      const renderTime = performance.now() - startTime;
      return {
        rendered: template, // Return original template on validation failure
        renderTime,
        variablesUsed: [],
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    try {
      let rendered = template;
      const variablesUsed: string[] = [];

      // Replace all template variables
      rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
        variablesUsed.push(match);

        try {
          const value = this.resolveVariable(variablePath.trim(), context);
          if (value === null || value === undefined) {
            return ''; // Replace with empty string for missing values
          }

          // Handle arrays with comma-space separation
          if (Array.isArray(value)) {
            return value.join(', ');
          }

          // Handle dates with ISO string format
          if (value instanceof Date) {
            return value.toISOString();
          }

          return String(value);
        } catch (error) {
          errors.push(
            `Failed to resolve variable ${match}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          return match; // Keep original if resolution fails
        }
      });

      const renderTime = performance.now() - startTime;

      const result: TemplateResult = {
        rendered,
        renderTime,
        variablesUsed,
        warnings: [],
      };

      if (errors.length > 0) {
        result.errors = errors;
      }

      return result;
    } catch (error) {
      const renderTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        rendered: template,
        renderTime,
        variablesUsed: [],
        errors: [errorMessage],
        warnings: [],
      };
    }
  }

  private resolveVariable(path: string, context: TemplateContext): unknown {
    const parts = path.split('.');
    if (parts.length < 2) {
      throw new Error(`Invalid variable path: ${path}`);
    }

    const namespace = parts[0];
    const propertyPath = parts.slice(1);

    let obj: unknown;
    if (namespace === 'task') {
      obj = context.task;
    } else if (namespace === 'list') {
      obj = context.list;
    } else {
      throw new Error(`Invalid namespace: ${namespace}`);
    }

    if (!obj) {
      throw new Error(`${namespace} object is null or undefined`);
    }

    // Navigate through nested properties
    let current: unknown = obj;
    for (const prop of propertyPath) {
      if (current === null || current === undefined) {
        return null;
      }
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[prop];
      } else {
        return null;
      }
    }

    return current;
  }

  validate(template: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variablesFound: string[] = [];

    // Check template length
    if (template.length > 10000) {
      errors.push(
        `Template exceeds maximum length of 10000 characters (current: ${template.length})`
      );
    }

    // Find all template variables
    const variableMatches = template.match(/\{\{([^}]+)\}\}/g) || [];

    for (const match of variableMatches) {
      variablesFound.push(match);

      // Extract variable path
      const variablePath = match.slice(2, -2).trim();

      // Validate variable syntax
      if (!this.isValidVariablePath(variablePath)) {
        errors.push(`Invalid variable references: ${match}`);
      }
    }

    // Determine complexity based on variable count and template length
    const complexity =
      variablesFound.length > 5 || template.length > 1000
        ? 'complex'
        : 'simple';

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      variablesFound,
      complexity,
    };
  }

  private isValidVariablePath(path: string): boolean {
    // Check for empty path
    if (!path || path.trim() === '') {
      return false;
    }

    const parts = path.split('.');

    // Must have at least namespace.property
    if (parts.length < 2) {
      return false;
    }

    // Check for valid namespace
    const namespace = parts[0];
    if (namespace !== 'task' && namespace !== 'list') {
      return false; // Only allow task and list namespaces
    }

    // Check for empty parts or parts starting with dot
    for (const part of parts) {
      if (!part || part === '') {
        return false;
      }
    }

    // Check for consecutive dots
    if (path.includes('..')) {
      return false;
    }

    return true;
  }
}
