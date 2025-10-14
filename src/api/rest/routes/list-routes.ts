/**
 * REST API list routes
 * Provides HTTP endpoints for list management using orchestration layer
 */

import { Router } from 'express';

import { ListController } from '../controllers/list-controller.js';

import type { ListOrchestrator } from '../../../core/orchestration/interfaces/list-orchestrator.js';

/**
 * Create list routes
 */
export function createListRoutes(listOrchestrator: ListOrchestrator): Router {
  const router = Router();
  const controller = new ListController(listOrchestrator);

  // Individual list operations
  router.post('/', controller.createList.bind(controller));
  router.get('/', controller.getAllLists.bind(controller));
  router.get('/:id', controller.getList.bind(controller));
  router.put('/:id', controller.updateList.bind(controller));
  router.delete('/:id', controller.deleteList.bind(controller));

  // Bulk operations (not available in MCP)
  router.post('/bulk', controller.createBulkLists.bind(controller));
  router.put('/bulk', controller.updateBulkLists.bind(controller));
  router.delete('/bulk', controller.deleteBulkLists.bind(controller));

  return router;
}
