/**
 * REST API agent prompt routes
 * Provides HTTP endpoints for agent prompt management using orchestration layer
 */

import { Router } from 'express';

import { AgentPromptController } from '../controllers/agent-prompt-controller.js';

import type { AgentPromptOrchestrator } from '../../../core/orchestration/interfaces/agent-prompt-orchestrator.js';

/**
 * Create agent prompt routes
 */
export function createAgentPromptRoutes(
  agentPromptOrchestrator: AgentPromptOrchestrator
): Router {
  const router = Router();
  const controller = new AgentPromptController(agentPromptOrchestrator);

  // Agent prompt operations
  router.get('/task/:taskId', controller.getAgentPrompt.bind(controller));
  router.post('/validate', controller.validateTemplate.bind(controller));
  router.post('/render', controller.renderTemplate.bind(controller));

  return router;
}
