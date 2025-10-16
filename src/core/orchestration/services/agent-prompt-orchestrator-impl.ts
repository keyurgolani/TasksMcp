/**
 * Agent prompt orchestrator implementation
 * Manages agent prompt templates and rendering with variable substitution
 */

import { DataDelegationService } from '../../../data/delegation/data-delegation-service.js';
import { TaskList } from '../../../domain/models/task-list.js';
import { Task } from '../../../domain/models/task.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import {
  TemplateVariable,
  TemplateContext,
  TemplateResult,
  TemplateValidationResult,
} from '../../../shared/types/template.js';
import {
  ValidationResult,
  ValidationError,
} from '../../../shared/types/validation.js';
import { TemplateEngine } from '../../../shared/utils/template-engine.js';
import { AgentPromptOrchestrator } from '../interfaces/agent-prompt-orchestrator.js';
import { DataOperation } from '../interfaces/base-orchestrator.js';

export class AgentPromptOrchestratorImpl implements AgentPromptOrchestrator {
  private templateEngine: TemplateEngine;

  constructor(private dataDelegationService: DataDelegationService) {
    this.templateEngine = new TemplateEngine();
  }

  async getAgentPrompt(
    taskId: string,
    useDefault = false
  ): Promise<
    TemplateResult & {
      hasTemplate: boolean;
      usedDefault: boolean;
    }
  > {
    try {
      // const startTime = Date.now();

      // Get task and list data
      const task = await this.dataDelegationService.getTask(taskId);
      if (!task) {
        throw new OrchestrationError(
          'Task not found',
          'AgentPromptOrchestrator.getAgentPrompt',
          taskId,
          'Valid task ID',
          'Ensure the task exists and the ID is correct'
        );
      }

      const taskData = task as Task;
      const list = await this.dataDelegationService.getList(taskData.listId);
      if (!list) {
        throw new OrchestrationError(
          'Task list not found',
          'AgentPromptOrchestrator.getAgentPrompt',
          taskData.listId,
          'Valid list ID',
          'Check that the task list exists'
        );
      }

      let template = taskData.agentPromptTemplate;

      // Use default template if none provided or if explicitly requested
      if (!template || useDefault) {
        template = `Task: ${taskData.title}\nDescription: ${taskData.description || 'No description provided'}`;
      }

      // Create template context
      const context = {
        task: taskData as Task,
        list: list as TaskList,
        variables: [],
      };

      // Render template with context
      const result = await this.templateEngine.render(template, context);

      // const renderTime = Date.now() - startTime;

      return {
        ...result,
        hasTemplate: !!taskData.agentPromptTemplate,
        usedDefault: !taskData.agentPromptTemplate || useDefault,
      };
    } catch (error) {
      if (error instanceof OrchestrationError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new OrchestrationError(
        `Agent prompt generation failed: ${errorMessage}`,
        'AgentPromptOrchestrator.getAgentPrompt',
        taskId,
        undefined,
        'Check the task data and template syntax'
      );
    }
  }

  validateTemplate(template: string): TemplateValidationResult {
    const errors: ValidationError[] = [];

    if (!template) {
      errors.push({
        field: 'template',
        message: 'Template cannot be empty',
        actionableGuidance: 'Provide a non-empty template string',
      });
    }

    if (template && template.length > 10000) {
      errors.push({
        field: 'template',
        message: 'Template exceeds maximum length of 10,000 characters',
        currentValue: template.length,
        expectedValue: '≤ 10000',
        actionableGuidance:
          'Reduce template length to 10,000 characters or less',
      });
    }

    // Validate template syntax
    try {
      const validation = this.templateEngine.validate(template);
      if (!validation.isValid) {
        errors.push(
          ...validation.errors.map(err => ({
            field: 'template',
            message: err,
            actionableGuidance: 'Check template syntax and variable references',
          }))
        );
      }
    } catch (_error) {
      errors.push({
        field: 'template',
        message: 'Template validation failed',
        actionableGuidance: 'Check template syntax and variable references',
      });
    }

    // Extract variables from template
    const variableMatches = template.match(/\{\{[^}]+\}\}/g) || [];
    const variablesFound = variableMatches.map(match =>
      match.slice(2, -2).trim()
    );

    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message),
      warnings: [],
      variablesFound,
    };
  }

  async renderTemplate(
    template: string,
    context: { taskId: string; listId: string }
  ): Promise<TemplateResult> {
    const validation = this.validateTemplate(template);
    if (!validation.isValid) {
      throw new OrchestrationError(
        'Template validation failed',
        'AgentPromptOrchestrator.renderTemplate',
        template,
        'Valid template',
        validation.errors.join('; ')
      );
    }

    // Get task and list data
    const task = await this.dataDelegationService.getTask(context.taskId);
    if (!task) {
      throw new OrchestrationError(
        'Task not found',
        'AgentPromptOrchestrator.renderTemplate',
        context.taskId,
        'Valid task ID',
        'Ensure the task exists and the ID is correct'
      );
    }

    const list = await this.dataDelegationService.getList(context.listId);
    if (!list) {
      throw new OrchestrationError(
        'List not found',
        'AgentPromptOrchestrator.renderTemplate',
        context.listId,
        'Valid list ID',
        'Ensure the list exists and the ID is correct'
      );
    }

    // Create full template context
    const fullContext: TemplateContext = {
      task: task as Task,
      list: list as TaskList,
      variables: [],
    };

    const result = await this.templateEngine.render(template, fullContext);
    return result;
  }

  // BaseOrchestrator implementation
  validate(_data: unknown): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  handleError(error: Error, context: string): OrchestrationError {
    return new OrchestrationError(
      error.message,
      context,
      undefined,
      undefined,
      'Check the operation parameters and try again'
    );
  }

  async delegateData(operation: DataOperation): Promise<unknown> {
    return this.dataDelegationService.execute(operation);
  }

  async setAgentPromptTemplate(
    taskId: string,
    template: string
  ): Promise<void> {
    const validation = await this.validateTemplate(template);
    if (!validation.isValid) {
      throw new OrchestrationError(
        'Template validation failed',
        'AgentPromptOrchestrator.setAgentPromptTemplate',
        template,
        'Valid template',
        validation.errors.join('; ')
      );
    }

    const operation: DataOperation = {
      type: 'update',
      entity: 'task',
      data: { id: taskId, agentPromptTemplate: template },
    };

    await this.delegateData(operation);
  }

  async removeAgentPromptTemplate(taskId: string): Promise<void> {
    const operation: DataOperation = {
      type: 'update',
      entity: 'task',
      data: { id: taskId, agentPromptTemplate: null },
    };

    await this.delegateData(operation);
  }

  async getAvailableVariables(taskId: string): Promise<TemplateVariable[]> {
    const task = await this.dataDelegationService.getTask(taskId);
    if (!task) {
      throw new OrchestrationError(
        'Task not found',
        'AgentPromptOrchestrator.getAvailableVariables',
        taskId,
        'Valid task ID',
        'Ensure the task exists'
      );
    }

    const taskData = task as Record<string, unknown> & { listId: string };
    const list = await this.dataDelegationService.getList(taskData.listId);

    const variables: TemplateVariable[] = [];

    // Add task variables
    Object.keys(taskData).forEach(key => {
      const value = taskData[key];
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
        name: key,
        namespace: 'task',
        value,
        type,
      });
    });

    // Add list variables
    if (list) {
      const listData = list as Record<string, unknown>;
      Object.keys(listData).forEach(key => {
        const value = listData[key];
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
          name: key,
          namespace: 'list',
          value,
          type,
        });
      });
    }

    return variables;
  }
}
