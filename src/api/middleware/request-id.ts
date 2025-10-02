/**
 * Request ID generation and tracking middleware
 */

import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { ApiRequest } from '../../shared/types/api.js';

/**
 * Middleware to generate and attach a unique request ID to each request
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiReq = req as ApiRequest;
  
  // Generate unique request ID
  apiReq.id = randomUUID();
  apiReq.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', apiReq.id);
  
  next();
}
