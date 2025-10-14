/**
 * Request ID generation and tracking middleware
 */

import { randomUUID } from 'crypto';

import type { ApiRequest } from '../../shared/types/api.js';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to generate and attach a unique request ID to each request
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiReq = req as ApiRequest;

  // Use provided request ID or generate a new one
  apiReq.id = (req.headers['x-request-id'] as string) || randomUUID();
  apiReq.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', apiReq.id);

  next();
}
