/**
 * Agent prompt orchestrator interface for template management and rendering
 * Handles template validation, variable substitution, and performance optimization
 */

import {
  TemplateResult,
  TemplateVariable,
  TemplateValidationResult,
} from '../../../shared/types/template';

import { BaseOrchestrator } from './base-orchestrator';

export interface AgentPromptOrchestrator extends BaseOrchestrator {
  /**
   * Gets rendered agent prompt for a task with variable substitution
   * Performance requirement: < 10ms for simple templates, < 50ms for complex
   */
  getAgentPrompt(
    taskId: string,
    useDefault?: boolean
  ): Promise<
    TemplateResult & {
      hasTemplate: boolean;
      usedDefault: boolean;
    }
  >;

  /**
   * Validates agent prompt template syntax and variables
   */
  validateTemplate(template: string): TemplateValidationResult;

  /**
   * Renders template with actual task and list data
   */
  renderTemplate(
    template: string,
    context: { taskId: string; listId: string }
  ): Promise<TemplateResult>;

  /**
   * Sets agent prompt template for a task
   */
  setAgentPromptTemplate(taskId: string, template: string): Promise<void>;

  /**
   * Removes agent prompt template from a task
   */
  removeAgentPromptTemplate(taskId: string): Promise<void>;

  /**
   * Gets available template variables for context
   */
  getAvailableVariables(taskId: string): Promise<TemplateVariable[]>;
}
