/**
 * API types and interfaces for REST API server
 */

import type { Request, Response, NextFunction } from 'express';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import type { ExitCriteriaManager } from '../../domain/tasks/exit-criteria-manager.js';
import type { ActionPlanManager } from '../../domain/tasks/action-plan-manager.js';
import type { NotesManager } from '../../domain/tasks/notes-manager.js';
import type { IntelligenceManager } from '../../domain/intelligence/intelligence-manager.js';

/**
 * API configuration
 */
export interface ApiConfig {
  port: number;
  corsOrigins: string[];
  authEnabled: boolean;
  authConfig?: AuthConfig;
  requestTimeout: number;
  bodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: 'apikey' | 'jwt';
  secret?: string;
  apiKeys?: string[];
}

/**
 * Handler context containing all managers
 */
export interface HandlerContext {
  todoListManager: TodoListManager;
  dependencyManager: DependencyResolver;
  exitCriteriaManager: ExitCriteriaManager;
  actionPlanManager: ActionPlanManager;
  notesManager: NotesManager;
  intelligenceManager: IntelligenceManager;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ResponseMeta;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string | undefined;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  duration?: number;
  pagination?: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Extended Express Request with custom properties
 */
export interface ApiRequest extends Request {
  id: string;
  startTime: number;
}

/**
 * API handler function type
 */
export type ApiHandler<T = unknown> = (
  req: ApiRequest,
  res: Response,
  context: HandlerContext
) => Promise<ApiResponse<T>>;

/**
 * Middleware function type
 */
export type ApiMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    storage: HealthCheckStatus;
    memory: HealthCheckStatus;
  };
}

/**
 * Individual health check status
 */
export interface HealthCheckStatus {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  details?: unknown;
}
