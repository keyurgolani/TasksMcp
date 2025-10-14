/**
 * REST API task routes
 * Provides HTTP endpoints for task management using orchestration layer
 */

import { Router } from 'express';

import { TaskController } from '../controllers/task-controller.js';

import type { TaskOrchestrator } from '../../../core/orchestration/interfaces/task-orchestrator.js';

/**
 * Create task routes
 */
export function createTaskRoutes(taskOrchestrator: TaskOrchestrator): Router {
  const router = Router();
  const controller = new TaskController(taskOrchestrator);

  // Individual task operations
  router.post('/', controller.createTask.bind(controller));
  router.get('/search', controller.searchTasks.bind(controller));
  router.get('/:id', controller.getTask.bind(controller));
  router.put('/:id', controller.updateTask.bind(controller));
  router.delete('/:id', controller.deleteTask.bind(controller));
  router.post('/:id/complete', controller.completeTask.bind(controller));
  router.put('/:id/priority', controller.setTaskPriority.bind(controller));
  router.put('/:id/status', controller.setTaskStatus.bind(controller));
  router.post('/:id/tags', controller.addTaskTags.bind(controller));
  router.delete('/:id/tags', controller.removeTaskTags.bind(controller));

  // Bulk operations (not available in MCP)
  router.post('/bulk', controller.createBulkTasks.bind(controller));
  router.put('/bulk', controller.updateBulkTasks.bind(controller));
  router.delete('/bulk', controller.deleteBulkTasks.bind(controller));
  router.post('/bulk/complete', controller.completeBulkTasks.bind(controller));
  router.put('/bulk/priority', controller.setBulkTaskPriority.bind(controller));
  router.post('/bulk/tags', controller.addBulkTaskTags.bind(controller));
  router.delete('/bulk/tags', controller.removeBulkTaskTags.bind(controller));

  return router;
}
