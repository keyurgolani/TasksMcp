/**
 * Base configuration for all environments
 */

export const baseConfig = {
  server: {
    name: 'task-list-mcp',
    version: '1.0.0',
  },
  features: {
    maxListsPerContext: 100,
    maxItemsPerList: 1000,
  },
  health: {
    enabled: true,
    interval: 30000, // 30 seconds
  },
  monitoring: {
    enabled: true,
    port: 9090,
    performanceInterval: 5000, // 5 seconds
    memoryInterval: 10000, // 10 seconds
    metricsRetention: 3600000, // 1 hour
    alerting: {
      enabled: true,
      escalationTime: 1800000, // 30 minutes
      cooldownTime: 300000, // 5 minutes
    },
  },
  performance: {
    maxConcurrentOperations: 100,
    operationTimeout: 30000, // 30 seconds
    memoryThreshold: 0.85, // 85% of heap limit
    responseTimeThreshold: 2000, // 2 seconds
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
    },
  },
  backup: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    maxFiles: 30,
    retentionDays: 7,
  },
  security: {
    rateLimit: {
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
  },
  logging: {
    level: 'info',
    format: 'json',
    fileEnabled: true,
    filePath: './logs/combined.log',
  },
} as const;
