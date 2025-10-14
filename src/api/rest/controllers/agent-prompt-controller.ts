/**
 * REST API agent prompt controller
 * Handles HTTP requests for agent prompt operations using orchestration layer
 */

import { Request, Response } from 'express';
import { z } from 'zod';

import { AgentPromptOrchestrator } from '../../../core/orchestration/interfaces/agent-prompt-orchestrator.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import { logger } from '../../../shared/utils/logger.js';

// Validation schemas
const validateTemplateSchema = z.object({
  template: z.string().max(10000),
});

const renderTemplateSchema = z.object({
  template: z.string().max(10000),
  taskId: z.string().uuid(),
  listId: z.string().uuid(),
});

/**
 * REST API controller for agent prompt operations
 *
 * Handles HTTP requests for retrieving and managing agent prompt templates
 * with variable substitution and performance metrics.
 */
export class AgentPromptController {
  constructor(private agentPromptOrchestrator: AgentPromptOrchestrator) {}

  async getAgentPrompt(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskId } = req.params;
      if (!taskId) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }

      const useDefault = req.query['useDefault'] === 'true';

      logger.info('Getting agent prompt', {
        taskId,
        useDefault,
        requestId: req.headers['x-request-id'],
      });

      const prompt = await this.agentPromptOrchestrator.getAgentPrompt(
        taskId,
        useDefault
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: {
          prompt: prompt.rendered,
          renderTime: prompt.renderTime,
          variablesUsed: prompt.variablesUsed,
          hasTemplate: prompt.hasTemplate,
          usedDefault: prompt.usedDefault,
        },
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          performance: {
            renderTime: prompt.renderTime,
            isSimple: prompt.renderTime < 10,
            isComplex: prompt.renderTime >= 10 && prompt.renderTime < 50,
            isSlow: prompt.renderTime >= 50,
          },
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async validateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { template } = validateTemplateSchema.parse(req.body);

      logger.info('Validating template', {
        templateLength: template.length,
        requestId: req.headers['x-request-id'],
      });

      const validation =
        await this.agentPromptOrchestrator.validateTemplate(template);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          variablesFound: validation.variablesFound,
          complexity: validation.complexity,
        },
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async renderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { template, taskId, listId } = renderTemplateSchema.parse(req.body);

      logger.info('Rendering template', {
        templateLength: template.length,
        taskId,
        listId,
        requestId: req.headers['x-request-id'],
      });

      const result = await this.agentPromptOrchestrator.renderTemplate(
        template,
        { taskId, listId }
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: {
          rendered: result.rendered,
          renderTime: result.renderTime,
          variablesUsed: result.variablesUsed,
          errors: result.errors,
        },
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          performance: {
            renderTime: result.renderTime,
            isSimple: result.renderTime < 10,
            isComplex: result.renderTime >= 10 && result.renderTime < 50,
            isSlow: result.renderTime >= 50,
          },
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  private handleError(error: unknown, res: Response, req: Request): void {
    const requestId = req.headers['x-request-id'];

    if (error instanceof z.ZodError) {
      logger.warn('Validation error', {
        error: error.issues,
        requestId,
      });

      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid request data',
          details: error.issues,
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (error instanceof OrchestrationError) {
      const statusCode = this.getStatusCodeForError(error);

      logger.warn('Orchestration error', {
        error: error.message,
        context: error.context,
        requestId,
      });

      res.status(statusCode).json({
        success: false,
        error: {
          type: error.name,
          message: error.message,
          context: error.context,
          currentValue: error.currentValue,
          expectedValue: error.expectedValue,
          actionableGuidance: error.actionableGuidance,
          timestamp: error.timestamp,
          requestId,
        },
      });
      return;
    }

    // Handle unexpected errors
    logger.error('Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        type: 'InternalServerError',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  private getStatusCodeForError(error: OrchestrationError): number {
    switch (error.name) {
      case 'ValidationError':
      case 'TemplateRenderError':
        return 400;
      case 'TaskNotFoundError':
      case 'ListNotFoundError':
        return 404;
      case 'TemplateTimeoutError':
        return 408;
      default:
        return 500;
    }
  }
}
