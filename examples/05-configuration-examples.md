# Configuration Examples

This document provides examples of configuring and integrating the MCP Task Manager with various AI agents and environments.

## MCP Server Configuration

## Deployment Approaches

### NPX (Recommended for Production)
Uses the published npm package, automatically handles installation and updates:
```json
{
  "command": "npx",
  "args": ["task-manager-mcp@latest"]
}
```

**Benefits:**
- Automatic package management
- Easy version control (`@latest`, `@1.2.3`, etc.)
- No local build management required
- Standard for production MCP servers

### Local Build (Development)
Uses a locally built version from source:
```json
{
  "command": "node",
  "args": ["/path/to/project/dist/app/cli.js"],
  "cwd": "/path/to/project"
}
```

**Benefits:**
- Full control over source code
- Immediate testing of changes
- No network dependencies
- Good for development and testing

### Global Installation
Installs the package globally and runs directly:
```json
{
  "command": "task-manager-mcp"
}
```

**Benefits:**
- Fastest startup time
- No repeated downloads
- Good for frequently used servers

### Basic Configuration (Kiro IDE)
```json
{
  "mcpServers": {
    "task-list-mcp": {
      "command": "node",
      "args": ["/path/to/TasksMcp/dist/app/cli.js"],
      "cwd": "/path/to/TasksMcp",
      "env": {
        "NODE_ENV": "development",
        "FASTMCP_LOG_LEVEL": "INFO",
        "DATA_DIRECTORY": "/path/to/TasksMcp/data"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "delete_list",
        "add_task",
        "update_task",
        "remove_task",
        "complete_task",
        "set_task_priority",
        "add_task_tags",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "analyze_task",
        "get_task_suggestions",
        "set_task_dependencies",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ]
    }
  }
}
```

### Production Configuration (NPX)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-manager-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "FASTMCP_LOG_LEVEL": "ERROR",
        "DATA_DIRECTORY": "/var/lib/task-manager/data",
        "BACKUP_DIRECTORY": "/var/backups/task-manager",
        "MAX_BACKUP_COUNT": "10"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "add_task",
        "update_task",
        "complete_task",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "get_ready_tasks"
      ]
    }
  }
}
```

### Production Configuration (Pinned Version)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-manager-mcp@1.2.3"],
      "env": {
        "NODE_ENV": "production",
        "FASTMCP_LOG_LEVEL": "ERROR",
        "DATA_DIRECTORY": "/var/lib/task-manager/data",
        "BACKUP_DIRECTORY": "/var/backups/task-manager",
        "MAX_BACKUP_COUNT": "10"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "add_task",
        "update_task",
        "complete_task",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "get_ready_tasks"
      ]
    }
  }
}
```

### Production Configuration (Local Build)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/opt/task-manager/dist/app/cli.js"],
      "cwd": "/opt/task-manager",
      "env": {
        "NODE_ENV": "production",
        "FASTMCP_LOG_LEVEL": "ERROR",
        "DATA_DIRECTORY": "/var/lib/task-manager/data",
        "BACKUP_DIRECTORY": "/var/backups/task-manager",
        "MAX_BACKUP_COUNT": "10"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "add_task",
        "update_task",
        "complete_task",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "get_ready_tasks"
      ]
    }
  }
}
```

### Claude Desktop Configuration (NPX)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-manager-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "DATA_DIRECTORY": "/Users/username/.task-manager/data"
      }
    }
  }
}
```

### Claude Desktop Configuration (Local Development)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/Users/username/task-manager/dist/app/cli.js"],
      "cwd": "/Users/username/task-manager",
      "env": {
        "NODE_ENV": "development",
        "DATA_DIRECTORY": "/Users/username/task-manager/data"
      }
    }
  }
}
```

## Environment Variables

### Development Environment
```bash
# Core Configuration
NODE_ENV=development
DATA_DIRECTORY=./data
LOG_LEVEL=debug

# Storage Configuration
STORAGE_TYPE=file
BACKUP_ENABLED=true
BACKUP_DIRECTORY=./data/backups
MAX_BACKUP_COUNT=5

# Performance Configuration
CACHE_ENABLED=true
CACHE_TTL=300
MAX_CONCURRENT_OPERATIONS=10

# Monitoring Configuration
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Production Environment
```bash
# Core Configuration
NODE_ENV=production
DATA_DIRECTORY=/var/lib/task-manager/data
LOG_LEVEL=info

# Storage Configuration
STORAGE_TYPE=file
BACKUP_ENABLED=true
BACKUP_DIRECTORY=/var/backups/task-manager
MAX_BACKUP_COUNT=30
BACKUP_INTERVAL=3600000

# Performance Configuration
CACHE_ENABLED=true
CACHE_TTL=600
MAX_CONCURRENT_OPERATIONS=50

# Monitoring Configuration
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=60000
PERFORMANCE_MONITORING=true

# Security Configuration
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=1000
```

### Docker Environment
```bash
# Docker-specific configuration
NODE_ENV=production
DATA_DIRECTORY=/app/data
LOG_LEVEL=info

# Volume mounts
BACKUP_DIRECTORY=/app/backups
STORAGE_TYPE=file

# Container optimization
CACHE_ENABLED=true
MAX_CONCURRENT_OPERATIONS=25
```

## Auto-Approval Configuration

### Conservative (Manual Approval)
```json
{
  "autoApprove": [
    "get_list",
    "list_all_lists",
    "search_tasks",
    "filter_tasks",
    "show_tasks"
  ]
}
```

### Moderate (Common Operations)
```json
{
  "autoApprove": [
    "create_list",
    "get_list",
    "list_all_lists",
    "add_task",
    "update_task",
    "complete_task",
    "set_task_priority",
    "add_task_tags",
    "search_tasks",
    "filter_tasks",
    "show_tasks",
    "get_ready_tasks"
  ]
}
```

### Full (All Operations)
```json
{
  "autoApprove": [
    "create_list",
    "get_list",
    "list_all_lists",
    "delete_list",
    "add_task",
    "update_task",
    "remove_task",
    "complete_task",
    "set_task_priority",
    "add_task_tags",
    "search_tasks",
    "filter_tasks",
    "show_tasks",
    "analyze_task",
    "get_task_suggestions",
    "set_task_dependencies",
    "get_ready_tasks",
    "analyze_task_dependencies"
  ]
}
```

## Multi-Agent Configuration

### Team Development Setup
```json
{
  "mcpServers": {
    "shared-task-manager": {
      "command": "npx",
      "args": ["task-manager-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "DATA_DIRECTORY": "/shared/task-manager/data",
        "AGENT_ID": "team-agent",
        "COLLABORATION_MODE": "true"
      },
      "autoApprove": [
        "get_list",
        "list_all_lists",
        "add_task",
        "update_task",
        "complete_task",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "get_ready_tasks"
      ]
    }
  }
}
```

### Specialized Agent Roles
```json
{
  "mcpServers": {
    "project-manager-tasks": {
      "command": "npx",
      "args": ["task-manager-mcp@latest"],
      "env": {
        "AGENT_ROLE": "project-manager",
        "DATA_DIRECTORY": "/data/pm-tasks"
      },
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "add_task",
        "set_task_priority",
        "set_task_dependencies",
        "analyze_task_dependencies",
        "get_task_suggestions"
      ]
    },
    "developer-tasks": {
      "command": "npx",
      "args": ["task-manager-mcp@latest"],
      "env": {
        "AGENT_ROLE": "developer",
        "DATA_DIRECTORY": "/data/dev-tasks"
      },
      "autoApprove": [
        "get_list",
        "add_task",
        "update_task",
        "complete_task",
        "search_tasks",
        "filter_tasks",
        "get_ready_tasks"
      ]
    }
  }
}
```

## Storage Configuration

### File-Based Storage (Default)
```bash
STORAGE_TYPE=file
DATA_DIRECTORY=./data
BACKUP_ENABLED=true
BACKUP_DIRECTORY=./data/backups
MAX_BACKUP_COUNT=10
```

### Memory Storage (Testing)
```bash
STORAGE_TYPE=memory
PERSISTENCE_ENABLED=false
```

### Custom Storage Path
```bash
STORAGE_TYPE=file
DATA_DIRECTORY=/custom/path/to/data
LISTS_DIRECTORY=/custom/path/to/data/lists
INDEXES_DIRECTORY=/custom/path/to/data/indexes
BACKUP_DIRECTORY=/custom/path/to/backups
```

## Logging Configuration

### Development Logging
```bash
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_FILE_ENABLED=false
CONSOLE_LOGGING=true
```

### Production Logging
```bash
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/var/log/task-manager/app.log
LOG_ROTATION_ENABLED=true
MAX_LOG_FILES=10
MAX_LOG_SIZE=10485760
```

### Structured Logging
```bash
LOG_LEVEL=info
LOG_FORMAT=json
STRUCTURED_LOGGING=true
LOG_CORRELATION_ID=true
LOG_PERFORMANCE_METRICS=true
```

## Performance Configuration

### High-Performance Setup
```bash
# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=600
CACHE_MAX_SIZE=1000

# Concurrency Configuration
MAX_CONCURRENT_OPERATIONS=100
OPERATION_TIMEOUT=30000

# Optimization Configuration
LAZY_LOADING=true
BATCH_OPERATIONS=true
COMPRESSION_ENABLED=true
```

### Resource-Constrained Setup
```bash
# Cache Configuration
CACHE_ENABLED=false
CACHE_TTL=60

# Concurrency Configuration
MAX_CONCURRENT_OPERATIONS=5
OPERATION_TIMEOUT=10000

# Optimization Configuration
LAZY_LOADING=true
BATCH_OPERATIONS=false
COMPRESSION_ENABLED=false
```

## Monitoring Configuration

### Basic Monitoring
```bash
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Advanced Monitoring
```bash
METRICS_ENABLED=true
PERFORMANCE_MONITORING=true
OPERATION_METRICS=true
DEPENDENCY_METRICS=true
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=15000
DETAILED_HEALTH_CHECKS=true
```

### External Monitoring Integration
```bash
METRICS_ENABLED=true
METRICS_EXPORT_ENABLED=true
METRICS_EXPORT_FORMAT=prometheus
METRICS_EXPORT_PORT=9090
HEALTH_CHECK_ENDPOINT=/health
```

## Security Configuration

### Basic Security
```bash
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=100
OPERATION_VALIDATION=strict
```

### Enhanced Security
```bash
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=1000
RATE_LIMIT_WINDOW=60000
OPERATION_VALIDATION=strict
INPUT_SANITIZATION=true
AUDIT_LOGGING=true
SECURE_HEADERS=true
```

## Integration Examples

### CI/CD Pipeline Integration
```yaml
# GitHub Actions example
- name: Update Task Status
  uses: mcp-task-manager-action@v1
  with:
    server-config: |
      {
        "command": "npx",
        "args": ["task-manager-mcp@latest"],
        "env": {
          "NODE_ENV": "ci",
          "DATA_DIRECTORY": "./ci-data"
        }
      }
    operation: complete_task
    list-id: ${{ env.PROJECT_LIST_ID }}
    task-id: ${{ env.CURRENT_TASK_ID }}

# Alternative: Use local build in CI
- name: Build and Test
  run: |
    npm run build
    node ./dist/app/cli.js --operation complete_task \
      --list-id ${{ env.PROJECT_LIST_ID }} \
      --task-id ${{ env.CURRENT_TASK_ID }}
```

### Docker Compose Setup
```yaml
version: '3.8'
services:
  task-manager:
    image: node:18-alpine
    working_dir: /app
    command: npx task-manager-mcp@latest
    environment:
      - NODE_ENV=production
      - DATA_DIRECTORY=/app/data
      - LOG_LEVEL=info
    volumes:
      - task-data:/app/data
      - task-backups:/app/backups
    restart: unless-stopped

  # Alternative: Custom built image
  task-manager-custom:
    build: .
    environment:
      - NODE_ENV=production
      - DATA_DIRECTORY=/app/data
      - LOG_LEVEL=info
    volumes:
      - task-data:/app/data
      - task-backups:/app/backups
    restart: unless-stopped

volumes:
  task-data:
  task-backups:
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-manager
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-manager
  template:
    metadata:
      labels:
        app: task-manager
    spec:
      containers:
      - name: task-manager
        image: task-manager:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATA_DIRECTORY
          value: "/app/data"
        - name: LOG_LEVEL
          value: "info"
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        - name: backup-volume
          mountPath: /app/backups
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: task-manager-data
      - name: backup-volume
        persistentVolumeClaim:
          claimName: task-manager-backups
```

## Best Practices

### Configuration Management
1. **Use environment variables** for configuration
2. **Separate development and production** configurations
3. **Version control configuration files** (excluding secrets)
4. **Use configuration validation** to catch errors early
5. **Document configuration options** for team members

### Deployment Best Practices
1. **Use NPX for production** - Better version management and reliability
2. **Pin versions in production** - Use `@1.2.3` instead of `@latest` for stability
3. **Use local builds for development** - Faster iteration and testing
4. **Consider global installation** - For frequently used servers
5. **Use Docker for containerized deployments** - Better isolation and scaling

### Security Best Practices
1. **Enable rate limiting** in production
2. **Use strict validation** for all inputs
3. **Enable audit logging** for compliance
4. **Regularly rotate backup files**
5. **Monitor for unusual activity**

### Performance Optimization
1. **Enable caching** for frequently accessed data
2. **Configure appropriate timeouts**
3. **Monitor resource usage**
4. **Use batch operations** when possible
5. **Optimize concurrent operation limits**

### Monitoring and Maintenance
1. **Enable health checks** for reliability
2. **Set up log rotation** to manage disk space
3. **Monitor performance metrics**
4. **Configure backup retention policies**
5. **Set up alerting** for critical issues