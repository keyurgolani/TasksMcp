# Data Source Configuration Guide

This guide explains how to configure multiple data sources for the MCP Task Manager, enabling pluggable storage backends and multi-source data aggregation.

## Overview

The data source configuration system allows you to:

- Use multiple storage backends simultaneously (filesystem, PostgreSQL, MongoDB, in-memory)
- Route specific task lists to specific data sources based on tags
- Aggregate data from multiple sources with conflict resolution
- Securely manage credentials through environment variables
- Configure failover and fallback mechanisms

## Configuration Methods

### 1. Configuration File (Recommended)

Create a configuration file at one of these locations:

- `./config/data-sources.json`
- `./config/data-sources.yaml` (YAML support coming soon)
- `./.kiro/config/data-sources.json`

Example configuration:

```json
{
  "sources": [
    {
      "id": "local-file",
      "name": "Local File Storage",
      "type": "filesystem",
      "priority": 100,
      "readonly": false,
      "enabled": true,
      "tags": ["local", "development"],
      "config": {
        "dataDirectory": "./data",
        "backupRetentionDays": 7,
        "enableCompression": false
      }
    },
    {
      "id": "shared-postgres",
      "name": "Shared PostgreSQL Database",
      "type": "postgresql",
      "priority": 200,
      "readonly": false,
      "enabled": true,
      "tags": ["shared", "production"],
      "config": {
        "host": "localhost",
        "port": 5432,
        "database": "task_manager",
        "user": "postgres",
        "password": "${POSTGRES_PASSWORD}",
        "ssl": true,
        "maxConnections": 10
      }
    }
  ],
  "conflictResolution": "latest",
  "aggregationEnabled": true,
  "operationTimeout": 30000,
  "maxRetries": 3,
  "allowPartialFailure": true
}
```

### 2. Environment Variables

You can define data sources entirely through environment variables:

```bash
# Number of data sources
export DATASOURCE_COUNT=2

# First data source (filesystem)
export DATASOURCE_0_ID=local-file
export DATASOURCE_0_NAME="Local File Storage"
export DATASOURCE_0_TYPE=filesystem
export DATASOURCE_0_PRIORITY=100
export DATASOURCE_0_READONLY=false
export DATASOURCE_0_ENABLED=true
export DATASOURCE_0_DATA_DIRECTORY=./data

# Second data source (PostgreSQL)
export DATASOURCE_1_ID=shared-postgres
export DATASOURCE_1_NAME="Shared PostgreSQL"
export DATASOURCE_1_TYPE=postgresql
export DATASOURCE_1_PRIORITY=200
export DATASOURCE_1_READONLY=false
export DATASOURCE_1_ENABLED=true
export DATASOURCE_1_HOST=localhost
export DATASOURCE_1_PORT=5432
export DATASOURCE_1_DATABASE=task_manager
export DATASOURCE_1_USER=postgres
export DATASOURCE_1_PASSWORD=secret123

# Global settings
export DATASOURCE_CONFLICT_RESOLUTION=latest
export DATASOURCE_AGGREGATION_ENABLED=true
export DATASOURCE_OPERATION_TIMEOUT=30000
```

### 3. Environment Variable Overrides

For security, you can override credentials in config files with environment variables:

```bash
# Override PostgreSQL password for source with id "shared-postgres"
export DATASOURCE_SHARED_POSTGRES_PASSWORD=secret123

# Override MongoDB URI for source with id "archive-mongo"
export DATASOURCE_ARCHIVE_MONGO_URI=mongodb://user:pass@host:27017/db
```

## Data Source Types

### Filesystem

Local file-based storage (default).

```json
{
  "type": "filesystem",
  "config": {
    "dataDirectory": "./data",
    "backupRetentionDays": 7,
    "enableCompression": false
  }
}
```

**Configuration Options:**
- `dataDirectory` (required): Directory for storing data files
- `backupRetentionDays` (optional): Number of days to keep backups (default: 7)
- `enableCompression` (optional): Enable gzip compression (default: false)

### PostgreSQL

Enterprise-grade relational database storage.

```json
{
  "type": "postgresql",
  "config": {
    "host": "localhost",
    "port": 5432,
    "database": "task_manager",
    "user": "postgres",
    "password": "${POSTGRES_PASSWORD}",
    "ssl": true,
    "maxConnections": 10,
    "connectionTimeout": 5000,
    "idleTimeout": 30000
  }
}
```

**Configuration Options:**
- `host` (required): Database host
- `port` (required): Database port
- `database` (required): Database name
- `user` (required): Database user
- `password` (required): Database password
- `ssl` (optional): Enable SSL connection (default: false)
- `maxConnections` (optional): Connection pool size (default: 10)
- `connectionTimeout` (optional): Connection timeout in ms (default: 5000)
- `idleTimeout` (optional): Idle connection timeout in ms (default: 30000)

### MongoDB

Document-oriented NoSQL database storage.

```json
{
  "type": "mongodb",
  "config": {
    "uri": "mongodb://localhost:27017",
    "database": "task_manager",
    "collection": "tasks",
    "maxPoolSize": 10,
    "minPoolSize": 2,
    "connectTimeout": 10000,
    "socketTimeout": 30000
  }
}
```

**Configuration Options:**
- `uri` (required): MongoDB connection URI
- `database` (required): Database name
- `collection` (optional): Collection name (default: "tasks")
- `maxPoolSize` (optional): Maximum connection pool size (default: 10)
- `minPoolSize` (optional): Minimum connection pool size (default: 0)
- `connectTimeout` (optional): Connection timeout in ms (default: 10000)
- `socketTimeout` (optional): Socket timeout in ms (default: 30000)

### Memory

In-memory storage for testing and caching.

```json
{
  "type": "memory",
  "config": {
    "maxSize": 1000,
    "persistToDisk": false,
    "persistPath": "./cache"
  }
}
```

**Configuration Options:**
- `maxSize` (optional): Maximum number of items to store
- `persistToDisk` (optional): Save to disk on shutdown (default: false)
- `persistPath` (optional): Path for disk persistence

## Data Source Properties

### Core Properties

- **id** (required): Unique identifier for the data source
- **name** (required): Human-readable name for logging and UI
- **type** (required): Storage backend type (`filesystem`, `postgresql`, `mongodb`, `memory`)
- **priority** (required): Priority for conflict resolution (higher = preferred)
- **readonly** (required): Whether this source is read-only
- **enabled** (required): Whether this source is currently active
- **tags** (optional): Tags for routing specific lists to this source

### Priority System

Priority determines which source is preferred when:
- Writing new data (highest priority writable source is used)
- Resolving conflicts (highest priority version is kept with `priority` strategy)
- Selecting fallback sources (next highest priority is tried)

Example priority scheme:
- 300: In-memory cache (fastest, temporary)
- 200: Primary database (PostgreSQL)
- 100: Local filesystem (fallback)
- 50: Archive storage (read-only)

### Tags for Routing

Use tags to route specific task lists to specific data sources:

```json
{
  "sources": [
    {
      "id": "local-dev",
      "tags": ["development", "local"],
      "config": { ... }
    },
    {
      "id": "shared-prod",
      "tags": ["production", "shared"],
      "config": { ... }
    }
  ]
}
```

When creating a task list with a matching tag, it will be routed to the appropriate source.

## Multi-Source Configuration

### Conflict Resolution Strategies

When the same task list exists in multiple sources, conflicts are resolved using:

- **latest**: Use the most recently updated version (based on `updatedAt` timestamp)
- **priority**: Use version from highest priority source
- **manual**: Require manual resolution (throws error)
- **merge**: Attempt to merge changes (advanced, may not always succeed)

### Aggregation Settings

```json
{
  "aggregationEnabled": true,
  "operationTimeout": 30000,
  "maxRetries": 3,
  "allowPartialFailure": true
}
```

- **aggregationEnabled**: Enable querying multiple sources simultaneously
- **operationTimeout**: Maximum time to wait for source operations (ms)
- **maxRetries**: Number of retries for failed operations
- **allowPartialFailure**: Continue if some sources fail

## Security Best Practices

### 1. Use Environment Variables for Credentials

Never commit passwords to configuration files. Use environment variable substitution:

```json
{
  "password": "${POSTGRES_PASSWORD}"
}
```

Or use environment variable overrides:

```bash
export DATASOURCE_SHARED_POSTGRES_PASSWORD=secret123
```

### 2. Enable SSL for Database Connections

Always use SSL for production database connections:

```json
{
  "type": "postgresql",
  "config": {
    "ssl": true
  }
}
```

### 3. Use Read-Only Sources for Archives

Mark archive sources as read-only to prevent accidental modifications:

```json
{
  "id": "archive",
  "readonly": true,
  "config": { ... }
}
```

### 4. Restrict File Permissions

Ensure configuration files have appropriate permissions:

```bash
chmod 600 config/data-sources.json
```

## Examples

### Single File Storage (Default)

```json
{
  "sources": [
    {
      "id": "default",
      "name": "Default File Storage",
      "type": "filesystem",
      "priority": 100,
      "readonly": false,
      "enabled": true,
      "config": {
        "dataDirectory": "./data"
      }
    }
  ],
  "conflictResolution": "latest",
  "aggregationEnabled": false,
  "operationTimeout": 30000,
  "maxRetries": 3,
  "allowPartialFailure": true
}
```

### Multi-Source with Failover

```json
{
  "sources": [
    {
      "id": "primary-postgres",
      "name": "Primary Database",
      "type": "postgresql",
      "priority": 200,
      "readonly": false,
      "enabled": true,
      "config": {
        "host": "primary.db.example.com",
        "database": "tasks"
      }
    },
    {
      "id": "fallback-file",
      "name": "Fallback File Storage",
      "type": "filesystem",
      "priority": 100,
      "readonly": false,
      "enabled": true,
      "config": {
        "dataDirectory": "./data"
      }
    }
  ],
  "conflictResolution": "priority",
  "aggregationEnabled": false,
  "operationTimeout": 5000,
  "maxRetries": 3,
  "allowPartialFailure": true
}
```

### Development + Production Split

```json
{
  "sources": [
    {
      "id": "dev-local",
      "name": "Development Local",
      "type": "filesystem",
      "priority": 100,
      "readonly": false,
      "enabled": true,
      "tags": ["development"],
      "config": {
        "dataDirectory": "./data/dev"
      }
    },
    {
      "id": "prod-postgres",
      "name": "Production Database",
      "type": "postgresql",
      "priority": 200,
      "readonly": false,
      "enabled": true,
      "tags": ["production"],
      "config": {
        "host": "prod.db.example.com",
        "database": "tasks_prod"
      }
    }
  ],
  "conflictResolution": "priority",
  "aggregationEnabled": true,
  "operationTimeout": 30000,
  "maxRetries": 3,
  "allowPartialFailure": false
}
```

## Troubleshooting

### Configuration Not Loading

1. Check file exists at expected location
2. Verify JSON syntax is valid
3. Check file permissions
4. Enable debug logging: `LOG_LEVEL=debug`

### Connection Failures

1. Verify database is running and accessible
2. Check credentials are correct
3. Verify network connectivity
4. Check SSL settings match database requirements
5. Review connection timeout settings

### Conflict Resolution Issues

1. Check `conflictResolution` strategy is appropriate
2. Verify source priorities are set correctly
3. Review timestamps on conflicting data
4. Consider using `manual` strategy for critical data

## Migration Guide

### From Single to Multi-Source

1. Create configuration file with existing source as primary
2. Add new sources with lower priority
3. Enable aggregation gradually
4. Test conflict resolution with non-critical data
5. Increase priority of new sources as confidence grows

### Changing Storage Backends

1. Add new backend with lower priority
2. Enable aggregation to read from both
3. Migrate data to new backend
4. Increase priority of new backend
5. Disable old backend once migration is complete

## API Reference

See the TypeScript interfaces in `src/infrastructure/config/data-source-config.ts` for complete API documentation.
