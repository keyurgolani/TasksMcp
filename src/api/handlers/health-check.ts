/**
 * Health check endpoint handler
 */

import { LOGGER } from '../../shared/utils/logger.js';
import { getVersion } from '../../shared/version.js';

import type {
  HealthCheckResponse,
  HealthCheckStatus,
} from '../../shared/types/api.js';
import type { Request, Response } from 'express';

// Track server start time
const startTime = Date.now();

/**
 * Health check handler
 */
export async function healthCheckHandler(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    // Check storage health
    const storageCheck = await checkStorage();

    // Check memory health
    const memoryCheck = checkMemory();

    // Determine overall status
    const allChecks = [storageCheck, memoryCheck];
    const hasFailure = allChecks.some(check => check.status === 'fail');
    const hasWarning = allChecks.some(check => check.status === 'warn');

    const overallStatus = hasFailure
      ? 'unhealthy'
      : hasWarning
        ? 'degraded'
        : 'healthy';

    const response: HealthCheckResponse = {
      status: overallStatus,
      version: getVersion(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        storage: storageCheck,
        memory: memoryCheck,
      },
    };

    const statusCode =
      overallStatus === 'healthy'
        ? 200
        : overallStatus === 'degraded'
          ? 200
          : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    LOGGER.error('Health check failed', { error });

    const response: HealthCheckResponse = {
      status: 'unhealthy',
      version: getVersion(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        storage: {
          status: 'fail',
          message: 'Health check error',
        },
        memory: {
          status: 'fail',
          message: 'Health check error',
        },
      },
    };

    res.status(503).json(response);
  }
}

/**
 * Check storage health
 */
async function checkStorage(): Promise<HealthCheckStatus> {
  // For now, just return pass
  // This will be updated when storage backends are implemented
  return {
    status: 'pass',
    message: 'Storage is operational',
  };
}

/**
 * Check memory health
 */
function checkMemory(): HealthCheckStatus {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapUsedPercent = Math.round(
      (memUsage.heapUsed / memUsage.heapTotal) * 100
    );

    // Warn if heap usage is above 80%
    if (heapUsedPercent > 80) {
      return {
        status: 'warn',
        message: 'High memory usage',
        details: {
          heapUsedMB,
          heapTotalMB,
          heapUsedPercent,
        },
      };
    }

    return {
      status: 'pass',
      message: 'Memory usage is normal',
      details: {
        heapUsedMB,
        heapTotalMB,
        heapUsedPercent,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Memory check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
