/**
 * Development environment configuration
 */

import { baseConfig } from './base.js';

export const developmentConfig = {
  ...baseConfig,
  storage: {
    type: 'file' as const,
    file: {
      dataDirectory: './data',
      backupRetentionDays: 3,
      enableCompression: false,
    },
  },
  health: {
    ...baseConfig.health,
    interval: 10000, // 10 seconds for faster feedback
  },
  backup: {
    ...baseConfig.backup,
    enabled: false, // Disable automated backups in development
  },
  security: {
    rateLimit: {
      enabled: false, // Disable rate limiting in development
      windowMs: 60000,
      maxRequests: 1000,
    },
  },
  logging: {
    level: 'debug',
    format: 'simple',
    fileEnabled: false,
    filePath: './logs/dev.log',
  },
} as const;
