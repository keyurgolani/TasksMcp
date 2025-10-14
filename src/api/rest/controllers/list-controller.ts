/**
 * REST API list controller
 * Handles HTTP requests for list operations using orchestration layer
 */

import { Request, Response } from 'express';
import { z } from 'zod';

import { ListOrchestrator } from '../../../core/orchestration/interfaces/list-orchestrator.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import {
  CreateListData,
  UpdateListData,
  ListFilters,
} from '../../../shared/types/list-operations.js';
import { logger } from '../../../shared/utils/logger.js';

// Validation schemas
const createListSchema = z.object({
  title: z.string().min(1).max(1000),
  description: z.string().optional(),
  projectTag: z.string().max(250).optional(),
});

const updateListSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  description: z.string().optional(),
  projectTag: z.string().max(250).optional(),
});

const bulkListSchema = z.object({
  listIds: z.array(z.string().uuid()).min(1),
});

const bulkCreateListSchema = z.object({
  lists: z.array(createListSchema).min(1).max(50), // Limit bulk operations
});

const bulkUpdateListSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        data: updateListSchema,
      })
    )
    .min(1)
    .max(50),
});

/**
 * REST API controller for task list operations
 *
 * Handles HTTP requests for creating, reading, updating, and deleting task lists.
 * Provides endpoints for list management with proper validation and error handling.
 */
export class ListController {
  constructor(private listOrchestrator: ListOrchestrator) {}

  async createList(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const listData = createListSchema.parse(req.body);

      logger.info('Creating list', {
        title: listData.title,
        projectTag: listData.projectTag,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanListData: CreateListData = {
        title: listData.title,
        ...(listData.description !== undefined && {
          description: listData.description,
        }),
        ...(listData.projectTag !== undefined && {
          projectTag: listData.projectTag,
        }),
      };

      const list = await this.listOrchestrator.createList(cleanListData);

      const duration = Date.now() - startTime;
      res.status(201).json({
        success: true,
        data: list,
        message: 'List created successfully',
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

  async getAllLists(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const filters: ListFilters = {};
      if (req.query['projectTag']) {
        filters.projectTag = req.query['projectTag'] as string;
      }
      if (req.query['limit']) {
        filters.limit = parseInt(req.query['limit'] as string);
      }

      logger.info('Getting all lists', {
        filters,
        requestId: req.headers['x-request-id'],
      });

      const lists = await this.listOrchestrator.getAllLists(filters);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: lists,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          count: lists.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async getList(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'List ID is required' },
        });
        return;
      }

      logger.info('Getting list', {
        listId: id,
        requestId: req.headers['x-request-id'],
      });

      const list = await this.listOrchestrator.getList(id);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: list,
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

  async updateList(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'List ID is required' },
        });
        return;
      }
      const updateData = updateListSchema.parse(req.body);

      logger.info('Updating list', {
        listId: id,
        updates: Object.keys(updateData),
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanUpdateData: UpdateListData = {};
      if (updateData.title !== undefined)
        cleanUpdateData.title = updateData.title;
      if (updateData.description !== undefined)
        cleanUpdateData.description = updateData.description;
      if (updateData.projectTag !== undefined)
        cleanUpdateData.projectTag = updateData.projectTag;

      const list = await this.listOrchestrator.updateList(id, cleanUpdateData);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: list,
        message: 'List updated successfully',
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

  async deleteList(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'List ID is required' },
        });
        return;
      }

      logger.info('Deleting list', {
        listId: id,
        requestId: req.headers['x-request-id'],
      });

      await this.listOrchestrator.deleteList(id);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        message: 'List deleted successfully',
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

  // Bulk operations (not available in MCP)
  async createBulkLists(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { lists } = bulkCreateListSchema.parse(req.body);

      logger.info('Creating bulk lists', {
        count: lists.length,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanLists: CreateListData[] = lists.map(list => ({
        title: list.title,
        ...(list.description !== undefined && {
          description: list.description,
        }),
        ...(list.projectTag !== undefined && { projectTag: list.projectTag }),
      }));

      const createdLists =
        await this.listOrchestrator.createBulkLists(cleanLists);

      const duration = Date.now() - startTime;
      res.status(201).json({
        success: true,
        data: createdLists,
        message: `${createdLists.length} lists created successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: createdLists.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async updateBulkLists(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { updates } = bulkUpdateListSchema.parse(req.body);

      logger.info('Updating bulk lists', {
        count: updates.length,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanUpdates = updates.map(update => ({
        id: update.id,
        data: {
          ...(update.data.title !== undefined && { title: update.data.title }),
          ...(update.data.description !== undefined && {
            description: update.data.description,
          }),
          ...(update.data.projectTag !== undefined && {
            projectTag: update.data.projectTag,
          }),
        } as UpdateListData,
      }));

      const updatedLists =
        await this.listOrchestrator.updateBulkLists(cleanUpdates);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: updatedLists,
        message: `${updatedLists.length} lists updated successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: updatedLists.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async deleteBulkLists(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { listIds } = bulkListSchema.parse(req.body);

      logger.info('Deleting bulk lists', {
        count: listIds.length,
        requestId: req.headers['x-request-id'],
      });

      const deletedCount = await this.listOrchestrator.deleteBulkLists(listIds);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        message: `${deletedCount} lists deleted successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: deletedCount,
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
        return 400;
      case 'ListNotFoundError':
        return 404;
      case 'ListAlreadyExistsError':
        return 409;
      default:
        return 500;
    }
  }
}
