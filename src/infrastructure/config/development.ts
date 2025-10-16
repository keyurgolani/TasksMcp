/**
 * Development environment configuration
 */

import { BASE_CONFIG } from './base.js';

export const DEVELOPMENT_CONFIG = {
  ...BASE_CONFIG,
  storage: {
    type: 'file' as const,
    file: {
      dataDirectory: './data',
      backupRetentionDays: 3,
      enableCompression: false,
    },
  },
  health: {
    ...BASE_CONFIG.health,
    interval: 10000, // 10 seconds for faster feedback
  },
  backup: {
    ...BASE_CONFIG.backup,
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
    format: 'json',
    fileEnabled: false,
    filePath: './logs/dev.log',
  },
} as const;
