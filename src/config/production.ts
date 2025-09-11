/**
 * Production environment configuration
 */

import { baseConfig } from './base.js';

export const productionConfig = {
  ...baseConfig,
  storage: {
    type: 'file' as const,
    file: {
      dataDirectory: process.env['DATA_DIRECTORY'] ?? '/app/data',
      backupRetentionDays: 30,
      enableCompression: true,
    },
  },
  health: {
    ...baseConfig.health,
    enabled: true,
    interval: 30000,
  },
  monitoring: {
    enabled: true,
    port: 9090,
  },
  backup: {
    ...baseConfig.backup,
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    maxFiles: 90, // Keep 3 months of backups
    retentionDays: 30,
  },
  security: {
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
    },
  },
  logging: {
    level: 'info',
    format: 'json',
    fileEnabled: true,
    filePath: '/app/logs/combined.log',
  },
} as const;
