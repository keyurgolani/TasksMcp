# Environment Variables Configuration Guide

**Last Updated**: September 15, 2025  
**Version**: 2.0.0 (Production Ready)

## Overview

The MCP Task Manager supports extensive configuration through environment variables, allowing you to customize behavior for different deployment environments. This guide covers all supported environment variables, their purposes, valid values, and configuration examples.

## Core Environment Variables

### NODE_ENV
**Purpose**: Defines the runtime environment mode, affecting logging, performance optimizations, and default configurations.

**Valid Values**: 
- `development` - Development mode with debug logging and relaxed security
- `production` - Production mode with optimized performance and security
- `test` - Testing mode with minimal logging and in-memory storage

**Default**: `development`

**Impact**: 
- Controls default logging levels and formats
- Enables/disables development-specific features
- Affects error reporting verbosity
- Determines default storage and backup settings

**Examples**:
```bash
# Development
NODE_ENV=development

# Production deployment
NODE_ENV=production

# Testing environment
NODE_ENV=test
```

### STORAGE_TYPE
**Purpose**: Specifies the storage backend for persistent data storage.

**Valid Values**:
- `memory` - In-memory storage (non-persistent, fast)
- `file` - File-based storage with JSON files (persistent, reliable)
- `postgresql` - PostgreSQL database storage (persistent, scalable)

**Default**: `file`

**Impact**:
- Determines where todo lists and items are stored
- Affects performance characteristics and persistence
- Influences backup and recovery capabilities

**Examples**:
```bash
# File-based storage (recommended for most use cases)
STORAGE_TYPE=file

# In-memory storage (development/testing)
STORAGE_TYPE=memory

# PostgreSQL storage (enterprise deployments)
STORAGE_TYPE=postgresql
```

### DATA_DIRECTORY
**Purpose**: Specifies the directory path for file-based storage and backups.

**Valid Values**: Any valid directory path (absolute or relative)

**Default**: `./data`

**Impact**:
- Only used when `STORAGE_TYPE=file`
- Must be writable by the application process
- Used for storing todo lists, backups, and indexes

**Examples**:
```bash
# Relative path (development)
DATA_DIRECTORY=./data

# Absolute path (production)
DATA_DIRECTORY=/app/data

# User-specific directory
DATA_DIRECTORY=~/.task-manager-data

# Temporary directory (testing)
DATA_DIRECTORY=/tmp/task-list-mcp-data
```

### MCP_LOG_LEVEL / LOG_LEVEL
**Purpose**: Controls the verbosity of application logging.

**Valid Values**:
- `error` - Only error messages
- `warn` - Warnings and errors
- `info` - Informational messages, warnings, and errors
- `debug` - All messages including debug information
- `silent` - No logging output

**Default**: `info`

**Impact**:
- Affects log file size and performance
- Controls debugging information availability
- Influences troubleshooting capabilities

**Examples**:
```bash
# Production logging
LOG_LEVEL=info

# Development debugging
LOG_LEVEL=debug

# Minimal logging
LOG_LEVEL=error

# MCP-specific log level (alternative)
MCP_LOG_LEVEL=info
```

## Storage Configuration Variables

### File Storage Variables

#### BACKUP_RETENTION_DAYS
**Purpose**: Number of days to retain backup files.

**Valid Values**: Positive integers

**Default**: `7`

**Examples**:
```bash
# Short retention (development)
BACKUP_RETENTION_DAYS=3

# Standard retention
BACKUP_RETENTION_DAYS=7

# Extended retention (production)
BACKUP_RETENTION_DAYS=30
```

#### ENABLE_COMPRESSION
**Purpose**: Enable compression for stored data files.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `false`

**Impact**:
- Reduces storage space usage
- Slightly increases CPU usage
- Recommended for production deployments

**Examples**:
```bash
# Enable compression
ENABLE_COMPRESSION=true

# Disable compression
ENABLE_COMPRESSION=false
```

### PostgreSQL Configuration Variables

Required when `STORAGE_TYPE=postgresql`:

#### POSTGRES_HOST
**Purpose**: PostgreSQL server hostname or IP address.

**Examples**:
```bash
POSTGRES_HOST=localhost
POSTGRES_HOST=db.example.com
POSTGRES_HOST=10.0.1.100
```

#### POSTGRES_PORT
**Purpose**: PostgreSQL server port number.

**Default**: `5432`

**Examples**:
```bash
POSTGRES_PORT=5432
POSTGRES_PORT=5433
```

#### POSTGRES_DB
**Purpose**: PostgreSQL database name.

**Examples**:
```bash
POSTGRES_DB=task_manager
POSTGRES_DB=mcp_tasks
```

#### POSTGRES_USER
**Purpose**: PostgreSQL username for authentication.

**Examples**:
```bash
POSTGRES_USER=task_manager_user
POSTGRES_USER=postgres
```

#### POSTGRES_PASSWORD
**Purpose**: PostgreSQL password for authentication.

**Security Note**: Use secure password management in production.

**Examples**:
```bash
POSTGRES_PASSWORD=secure_password_123
```

#### POSTGRES_SSL
**Purpose**: Enable SSL/TLS connection to PostgreSQL.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `false`

**Examples**:
```bash
# Enable SSL (recommended for production)
POSTGRES_SSL=true

# Disable SSL (local development)
POSTGRES_SSL=false
```

#### POSTGRES_MAX_CONNECTIONS
**Purpose**: Maximum number of concurrent PostgreSQL connections.

**Valid Values**: Positive integers

**Default**: `10`

**Examples**:
```bash
# Standard connection pool
POSTGRES_MAX_CONNECTIONS=10

# High-traffic deployment
POSTGRES_MAX_CONNECTIONS=50
```

## Performance and Scaling Variables

### MAX_LISTS_PER_CONTEXT
**Purpose**: Maximum number of todo lists allowed per context/workspace.

**Valid Values**: Positive integers

**Default**: `100`

**Examples**:
```bash
# Standard limit
MAX_LISTS_PER_CONTEXT=100

# Enterprise deployment
MAX_LISTS_PER_CONTEXT=1000
```

### MAX_ITEMS_PER_LIST
**Purpose**: Maximum number of items allowed per todo list.

**Valid Values**: Positive integers

**Default**: `1000`

**Examples**:
```bash
# Standard limit
MAX_ITEMS_PER_LIST=1000

# Large project support
MAX_ITEMS_PER_LIST=5000
```

## Monitoring and Health Check Variables

### HEALTH_CHECK_ENABLED
**Purpose**: Enable/disable health check endpoint.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `true`

**Examples**:
```bash
# Enable health checks (recommended)
HEALTH_CHECK_ENABLED=true

# Disable health checks
HEALTH_CHECK_ENABLED=false
```

### HEALTH_CHECK_INTERVAL
**Purpose**: Interval between health checks in milliseconds.

**Valid Values**: Positive integers

**Default**: `30000` (30 seconds)

**Examples**:
```bash
# Standard interval
HEALTH_CHECK_INTERVAL=30000

# Frequent checks (development)
HEALTH_CHECK_INTERVAL=10000

# Less frequent checks
HEALTH_CHECK_INTERVAL=60000
```

### METRICS_ENABLED
**Purpose**: Enable/disable metrics collection and endpoint.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `false`

**Examples**:
```bash
# Enable metrics (production)
METRICS_ENABLED=true

# Disable metrics (development)
METRICS_ENABLED=false
```

### METRICS_PORT
**Purpose**: Port number for metrics endpoint.

**Valid Values**: Valid port numbers (1-65535)

**Default**: `9090`

**Examples**:
```bash
# Standard Prometheus port
METRICS_PORT=9090

# Alternative port
METRICS_PORT=8080
```

## Backup Configuration Variables

### BACKUP_ENABLED
**Purpose**: Enable/disable automatic backup functionality.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `true`

**Examples**:
```bash
# Enable backups (production)
BACKUP_ENABLED=true

# Disable backups (development)
BACKUP_ENABLED=false
```

### BACKUP_SCHEDULE
**Purpose**: Cron expression for backup schedule.

**Default**: `0 2 * * *` (daily at 2 AM)

**Examples**:
```bash
# Daily at 2 AM
BACKUP_SCHEDULE="0 2 * * *"

# Every 6 hours
BACKUP_SCHEDULE="0 */6 * * *"

# Weekly on Sunday at midnight
BACKUP_SCHEDULE="0 0 * * 0"
```

### BACKUP_MAX_FILES
**Purpose**: Maximum number of backup files to retain.

**Valid Values**: Positive integers

**Default**: `30`

**Examples**:
```bash
# Standard retention
BACKUP_MAX_FILES=30

# Extended retention
BACKUP_MAX_FILES=90

# Minimal retention
BACKUP_MAX_FILES=7
```

## Security Configuration Variables

### RATE_LIMIT_ENABLED
**Purpose**: Enable/disable rate limiting for API requests.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `true`

**Examples**:
```bash
# Enable rate limiting (production)
RATE_LIMIT_ENABLED=true

# Disable rate limiting (development)
RATE_LIMIT_ENABLED=false
```

### RATE_LIMIT_WINDOW_MS
**Purpose**: Time window for rate limiting in milliseconds.

**Valid Values**: Positive integers

**Default**: `60000` (1 minute)

**Examples**:
```bash
# 1 minute window
RATE_LIMIT_WINDOW_MS=60000

# 5 minute window
RATE_LIMIT_WINDOW_MS=300000
```

### RATE_LIMIT_MAX_REQUESTS
**Purpose**: Maximum requests allowed per time window.

**Valid Values**: Positive integers

**Default**: `100`

**Examples**:
```bash
# Standard limit
RATE_LIMIT_MAX_REQUESTS=100

# High-traffic limit
RATE_LIMIT_MAX_REQUESTS=1000

# Restrictive limit
RATE_LIMIT_MAX_REQUESTS=50
```

## Logging Configuration Variables

### LOG_FORMAT
**Purpose**: Format for log output.

**Valid Values**: `json`, `simple`

**Default**: `json`

**Examples**:
```bash
# Structured JSON logging (production)
LOG_FORMAT=json

# Human-readable logging (development)
LOG_FORMAT=simple
```

### LOG_FILE_ENABLED
**Purpose**: Enable/disable logging to file.

**Valid Values**: `true`, `false`, `1`, `0`

**Default**: `true`

**Examples**:
```bash
# Enable file logging
LOG_FILE_ENABLED=true

# Console logging only
LOG_FILE_ENABLED=false
```

### LOG_FILE_PATH
**Purpose**: Path for log file output.

**Default**: `./logs/combined.log`

**Examples**:
```bash
# Standard log file
LOG_FILE_PATH=./logs/combined.log

# Production log file
LOG_FILE_PATH=/app/logs/task-manager.log

# Temporary log file
LOG_FILE_PATH=/tmp/mcp-task-manager.log
```

## Environment-Specific Configuration Examples

### Development Environment
```bash
# Core settings
NODE_ENV=development
STORAGE_TYPE=file
DATA_DIRECTORY=./data
LOG_LEVEL=debug

# Development optimizations
BACKUP_ENABLED=false
RATE_LIMIT_ENABLED=false
HEALTH_CHECK_INTERVAL=10000
LOG_FORMAT=simple
LOG_FILE_ENABLED=false

# Relaxed limits
MAX_LISTS_PER_CONTEXT=50
MAX_ITEMS_PER_LIST=500
```

### Testing Environment
```bash
# Core settings
NODE_ENV=test
STORAGE_TYPE=memory
LOG_LEVEL=error

# Testing optimizations
BACKUP_ENABLED=false
HEALTH_CHECK_ENABLED=false
METRICS_ENABLED=false
RATE_LIMIT_ENABLED=false
LOG_FILE_ENABLED=false

# Test limits
MAX_LISTS_PER_CONTEXT=10
MAX_ITEMS_PER_LIST=100
```

### Production Environment
```bash
# Core settings
NODE_ENV=production
STORAGE_TYPE=file
DATA_DIRECTORY=/app/data
LOG_LEVEL=info

# Production features
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
ENABLE_COMPRESSION=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# Security settings
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/app/logs/task-manager.log

# Performance settings
MAX_LISTS_PER_CONTEXT=1000
MAX_ITEMS_PER_LIST=5000
```

### PostgreSQL Production Environment
```bash
# Core settings
NODE_ENV=production
STORAGE_TYPE=postgresql
LOG_LEVEL=info

# PostgreSQL configuration
POSTGRES_HOST=db.example.com
POSTGRES_PORT=5432
POSTGRES_DB=task_manager_prod
POSTGRES_USER=task_manager_user
POSTGRES_PASSWORD=secure_production_password
POSTGRES_SSL=true
POSTGRES_MAX_CONNECTIONS=25

# Production features
BACKUP_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
RATE_LIMIT_ENABLED=true

# Performance settings
MAX_LISTS_PER_CONTEXT=5000
MAX_ITEMS_PER_LIST=10000
```

## Configuration Validation

The MCP Task Manager automatically validates all environment variables on startup. Invalid configurations will cause the server to fail with detailed error messages.

### Validation Rules
- All numeric values must be positive integers
- Boolean values accept: `true`, `false`, `1`, `0`
- Enum values must match exactly (case-sensitive)
- Required PostgreSQL variables must be provided when `STORAGE_TYPE=postgresql`
- Directory paths must be accessible and writable

### Validation Examples
```bash
# Valid configuration
NODE_ENV=production
STORAGE_TYPE=file
DATA_DIRECTORY=/app/data

# Invalid configuration (will fail)
NODE_ENV=invalid_env        # Not in allowed enum
STORAGE_TYPE=redis          # Not supported
MAX_ITEMS_PER_LIST=-100     # Negative number
BACKUP_ENABLED=maybe        # Invalid boolean
```

## Next Steps

- Review [Environment-Specific Configuration Guides](./environment-specific.md) for detailed setup instructions
- Check [Configuration Troubleshooting](./troubleshooting.md) for common issues and solutions
- See [MCP Client Configuration Examples](../../examples/) for complete setup examples