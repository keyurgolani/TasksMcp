/**
 * Template types for agent prompt orchestration
 * Defines structures for template rendering and variable substitution
 */

import { Task } from '../../domain/models/task';
import { TaskList } from '../../domain/models/task-list';

export interface TemplateVariable {
  name: string;
  namespace: 'task' | 'list';
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}

export interface TemplateContext {
  task: Task;
  list: TaskList;
  variables: TemplateVariable[];
}

export interface TemplateResult {
  rendered: string;
  renderTime: number;
  variablesUsed: string[];
  errors?: string[];
  warnings?: string[];
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variablesFound: string[];
  complexity: 'simple' | 'complex';
}

export interface TemplateError {
  message: string;
  position?: number;
  variable?: string;
  actionableGuidance?: string;
}

export interface TemplateWarning {
  message: string;
  variable?: string;
  suggestion?: string;
}

// Template performance requirements
export const TEMPLATE_MAX_RENDER_TIME = 10; // milliseconds
export const TEMPLATE_MAX_RENDER_TIME_COMPLEX = 50; // milliseconds
