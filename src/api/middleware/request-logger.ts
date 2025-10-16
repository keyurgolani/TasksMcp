/**
 * Request logging middleware
 */

import { LOGGER } from '../../shared/utils/logger.js';

import type { ApiRequest } from '../../shared/types/api.js';
import type { Request, Response, NextFunction } from 'express';

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
  LOGGER.info('Incoming request', {
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

    LOGGER.info('Request completed', {
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
