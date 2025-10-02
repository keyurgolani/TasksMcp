/**
 * Request logging middleware
 */

import type { Request, Response, NextFunction } from 'express';
import type { ApiRequest } from '../../shared/types/api.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Middleware to log incoming requests and responses
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiReq = req as ApiRequest;
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId: apiReq.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function (data): Response {
    const duration = Date.now() - apiReq.startTime;
    
    logger.info('Request completed', {
      requestId: apiReq.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
    
    return originalSend.call(this, data);
  };
  
  next();
}
