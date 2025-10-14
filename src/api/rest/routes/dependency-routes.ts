/**
 * REST API dependency routes
 * Provides HTTP endpoints for dependency management using orchestration layer
 */

import { Router } from 'express';

import { DependencyController } from '../controllers/dependency-controller.js';

import type { DependencyOrchestrator } from '../../../core/orchestration/interfaces/dependency-orchestrator.js';

/**
 * Create dependency routes
 */
export function createDependencyRoutes(
  dependencyOrchestrator: DependencyOrchestrator
): Router {
  const router = Router();
  const controller = new DependencyController(dependencyOrchestrator);

  // Dependency operations
  router.post('/set', controller.setTaskDependencies.bind(controller));
  router.get(
    '/analyze/:listId',
    controller.analyzeDependencies.bind(controller)
  );
  router.get('/ready/:listId', controller.getReadyTasks.bind(controller));
  router.post('/validate', controller.validateDependencies.bind(controller));

  // Bulk dependency operations (not available in MCP)
  router.post('/bulk/set', controller.setBulkTaskDependencies.bind(controller));
  router.post(
    '/bulk/clear',
    controller.clearBulkTaskDependencies.bind(controller)
  );

  return router;
}
