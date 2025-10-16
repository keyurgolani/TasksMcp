/**
 * Production environment configuration
 */

import { BASE_CONFIG } from './base.js';

export const PRODUCTION_CONFIG = {
  ...BASE_CONFIG,
  storage: {
    type: 'file' as const,
    file: {
      dataDirectory: process.env['DATA_DIRECTORY'] ?? '/app/data',
      backupRetentionDays: 30,
      enableCompression: true,
    },
  },
  health: {
    ...BASE_CONFIG.health,
    enabled: true,
    interval: 30000,
  },

  backup: {
    ...BASE_CONFIG.backup,
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
