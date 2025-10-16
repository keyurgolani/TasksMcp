/**
 * REST API search controller
 * Handles HTTP requests for search operations using orchestration layer
 */

import { Request, Response } from 'express';
import { z } from 'zod';

import { SearchOrchestrator } from '../../../core/orchestration/interfaces/search-orchestrator.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import {
  SearchCriteria,
  UnifiedSearchCriteria,
} from '../../../shared/types/search.js';
import { LOGGER } from '../../../shared/utils/logger.js';

// Validation schemas
const searchTasksSchema = z.object({
  listId: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
    .optional(),
  priority: z.array(z.number().min(1).max(5)).optional(),
  tags: z.array(z.string()).optional(),
  tagOperator: z.enum(['AND', 'OR']).optional(),
  query: z.string().optional(),
  includeCompleted: z.boolean().optional(),
  isReady: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  hasDependencies: z.boolean().optional(),
  hasAgentPromptTemplate: z.boolean().optional(),
  estimatedDuration: z
    .object({
      min: z.number().min(1).optional(),
      max: z.number().min(1).optional(),
    })
    .optional(),
  dateRange: z
    .object({
      field: z.enum(['createdAt', 'updatedAt', 'completedAt']).optional(),
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(500).optional(),
  includeDependencyInfo: z.boolean().optional(),
});

const searchListsSchema = z.object({
  projectTag: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(500).optional(),
});

const unifiedSearchSchema = z.object({
  query: z.string().min(1),
  includeCompleted: z.boolean().optional(),
  limit: z.number().min(1).max(500).optional(),
  searchTasks: z.boolean().optional(),
  searchLists: z.boolean().optional(),
});

/**
 * REST API controller for search operations
 *
 * Handles HTTP requests for searching tasks and lists with advanced filtering,
 * sorting, and pagination capabilities.
 */
export class SearchController {
  constructor(private searchOrchestrator: SearchOrchestrator) {}

  async searchTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Parse query parameters
      const queryParams = {
        ...req.query,
        priority: req.query['priority']
          ? (req.query['priority'] as string)
              .split(',')
              .map(p => parseInt(p.trim()))
          : undefined,
        tags: req.query['tags']
          ? (req.query['tags'] as string).split(',').map(t => t.trim())
          : undefined,
        includeCompleted: req.query['includeCompleted'] === 'true',
        isReady: req.query['isReady'] === 'true',
        isBlocked: req.query['isBlocked'] === 'true',
        hasDependencies: req.query['hasDependencies'] === 'true',
        hasAgentPromptTemplate: req.query['hasAgentPromptTemplate'] === 'true',
        includeDependencyInfo: req.query['includeDependencyInfo'] === 'true',
        limit: req.query['limit']
          ? parseInt(req.query['limit'] as string)
          : undefined,
        estimatedDuration:
          req.query['minDuration'] || req.query['maxDuration']
            ? {
                min: req.query['minDuration']
                  ? parseInt(req.query['minDuration'] as string)
                  : undefined,
                max: req.query['maxDuration']
                  ? parseInt(req.query['maxDuration'] as string)
                  : undefined,
              }
            : undefined,
        dateRange:
          req.query['dateField'] ||
          req.query['startDate'] ||
          req.query['endDate']
            ? {
                field: req.query['dateField'] as
                  | 'createdAt'
                  | 'updatedAt'
                  | 'completedAt',
                start: req.query['startDate'] as string,
                end: req.query['endDate'] as string,
              }
            : undefined,
      };

      const searchCriteria = searchTasksSchema.parse(queryParams);

      LOGGER.info('Searching tasks', {
        criteria: searchCriteria,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanSearchCriteria: SearchCriteria = {};
      if (searchCriteria.query !== undefined)
        cleanSearchCriteria.query = searchCriteria.query;
      if (searchCriteria.listId !== undefined)
        cleanSearchCriteria.listId = searchCriteria.listId;
      if (searchCriteria.limit !== undefined)
        cleanSearchCriteria.limit = searchCriteria.limit;

      const result =
        await this.searchOrchestrator.searchTasks(cleanSearchCriteria);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: result.items,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          pagination: {
            total: result.totalCount,
            limit: result.limit,
            hasMore: result.hasMore,
          },
          searchCriteria,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async searchLists(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      const queryParams = {
        ...req.query,
        limit: req.query['limit']
          ? parseInt(req.query['limit'] as string)
          : undefined,
      };

      const searchCriteria = searchListsSchema.parse(queryParams);

      LOGGER.info('Searching lists', {
        criteria: searchCriteria,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanSearchCriteria: SearchCriteria = {};
      if (searchCriteria.query !== undefined)
        cleanSearchCriteria.query = searchCriteria.query;
      if (searchCriteria.projectTag !== undefined)
        cleanSearchCriteria.filters = { projectTag: searchCriteria.projectTag };
      if (searchCriteria.limit !== undefined)
        cleanSearchCriteria.limit = searchCriteria.limit;

      const result =
        await this.searchOrchestrator.searchLists(cleanSearchCriteria);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: result.items,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          pagination: {
            total: result.totalCount,
            limit: result.limit,
            hasMore: result.hasMore,
          },
          searchCriteria,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async unifiedSearch(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      const queryParams = {
        ...req.query,
        includeCompleted: req.query['includeCompleted'] === 'true',
        limit: req.query['limit']
          ? parseInt(req.query['limit'] as string)
          : undefined,
      };

      const searchCriteria = unifiedSearchSchema.parse(queryParams);

      LOGGER.info('Performing unified search', {
        criteria: searchCriteria,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanSearchCriteria: UnifiedSearchCriteria = {
        query: searchCriteria.query,
      };
      if (searchCriteria.includeCompleted !== undefined)
        cleanSearchCriteria.includeCompleted = searchCriteria.includeCompleted;
      if (searchCriteria.limit !== undefined)
        cleanSearchCriteria.limit = searchCriteria.limit;
      if (searchCriteria.searchTasks !== undefined)
        cleanSearchCriteria.searchTasks = searchCriteria.searchTasks;
      if (searchCriteria.searchLists !== undefined)
        cleanSearchCriteria.searchLists = searchCriteria.searchLists;

      const result =
        await this.searchOrchestrator.unifiedSearch(cleanSearchCriteria);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: result,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          searchCriteria,
          resultCounts: {
            tasks: result.tasks.items.length,
            lists: result.lists.items.length,
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
      LOGGER.warn('Validation error', {
        error: error.issues,
        requestId,
      });

      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid search parameters',
          details: error.issues,
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (error instanceof OrchestrationError) {
      const statusCode = this.getStatusCodeForError(error);

      LOGGER.warn('Orchestration error', {
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
    LOGGER.error('Unexpected error', {
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
      case 'SearchError':
        return 422;
      default:
        return 500;
    }
  }
}
