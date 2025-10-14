/**
 * REST API search routes
 * Provides HTTP endpoints for search operations using orchestration layer
 */

import { Router } from 'express';

import { SearchController } from '../controllers/search-controller.js';

import type { SearchOrchestrator } from '../../../core/orchestration/interfaces/search-orchestrator.js';

/**
 * Create search routes
 */
export function createSearchRoutes(
  searchOrchestrator: SearchOrchestrator
): Router {
  const router = Router();
  const controller = new SearchController(searchOrchestrator);

  // Search operations
  router.get('/tasks', controller.searchTasks.bind(controller));
  router.get('/lists', controller.searchLists.bind(controller));
  router.get('/unified', controller.unifiedSearch.bind(controller));

  return router;
}
