# Configuration Guide

This comprehensive guide covers all configuration options for the MCP Task Manager, from basic setup to advanced production deployments.

## 🔧 Environment Variables

### Core Configuration

| Variable         | Default       | Description                           | Valid Values                        |
| ---------------- | ------------- | ------------------------------------- | ----------------------------------- |
| `NODE_ENV`       | `development` | Runtime environment mode              | `development`, `production`, `test` |
| `MCP_LOG_LEVEL`  | `info`        | Logging verbosity level               | `error`, `warn`, `info`, `debug`    |
| `DATA_DIRECTORY` | `./data`      | Directory for persistent data storage | Any valid directory path            |
| `STORAGE_TYPE`   | `file`        | Storage backend type                  | `file`, `memory`                    |

### Advanced Configuration

| Variable                 | Default | Description                 |
| ------------------------ | ------- | --------------------------- |
| `MAX_ITEMS_PER_LIST`     | `1000`  | Maximum tasks per task list |
| `MAX_LISTS_PER_CONTEXT`  | `100`   | Maximum lists per context   |
| `BACKUP_ENABLED`         | `true`  | Enable automatic backups    |
| `BACKUP_RETENTION_DAYS`  | `30`    | Days to keep backup files   |
| `PERFORMANCE_MONITORING` | `false` | Enable performance tracking |
| `HEALTH_CHECK_INTERVAL`  | `30000` | Health check interval (ms)  |

## 🏗️ Environment-Specific Configurations

### Development Environment

**Purpose**: Fast feedback, debugging capabilities, ease of setup

```bash
# Core settings
NODE_ENV=development
MCP_LOG_LEVEL=debug
STORAGE_TYPE=file
DATA_DIRECTORY=./dev-data

# Development optimizations
BACKUP_ENABLED=false
PERFORMANCE_MONITORING=true
HEALTH_CHECK_INTERVAL=10000

# Relaxed limits for testing
MAX_ITEMS_PER_LIST=500
MAX_LISTS_PER_CONTEXT=50
```

**MCP Client Configuration:**

```json
{
  "mcpServers": {
    "task-manager-dev": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "STORAGE_TYPE": "file",
        "DATA_DIRECTORY": "./dev-data"
      }
    }
  }
}
```

**Features:**

- ✅ Verbose debug logging for troubleshooting
- ✅ Local data directory for easy access
- ✅ Enhanced error messages and stack traces
- ✅ Performance monitoring enabled
- ✅ Fast health checks for rapid development

### Production Environment

**Purpose**: Optimized performance, security, reliability

```bash
# Core settings
NODE_ENV=production
MCP_LOG_LEVEL=warn
STORAGE_TYPE=file
DATA_DIRECTORY=/var/lib/task-manager

# Production optimizations
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=90
PERFORMANCE_MONITORING=false
HEALTH_CHECK_INTERVAL=60000

# Production limits
MAX_ITEMS_PER_LIST=1000
MAX_LISTS_PER_CONTEXT=100
```

**MCP Client Configuration:**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "STORAGE_TYPE": "file",
        "DATA_DIRECTORY": "/var/lib/task-manager"
      }
    }
  }
}
```

**Features:**

- ✅ Minimal logging for performance
- ✅ Secure data directory with proper permissions
- ✅ Optimized error handling
- ✅ Automatic backup and recovery mechanisms
- ✅ Extended backup retention

### Testing Environment

**Purpose**: Fast execution, deterministic behavior, minimal output

```bash
# Core settings
NODE_ENV=test
MCP_LOG_LEVEL=error
STORAGE_TYPE=memory
DATA_DIRECTORY=/tmp/test-data

# Testing optimizations
BACKUP_ENABLED=false
PERFORMANCE_MONITORING=false
HEALTH_CHECK_INTERVAL=5000

# Testing limits
MAX_ITEMS_PER_LIST=100
MAX_LISTS_PER_CONTEXT=10
```

**Features:**

- ✅ Memory-only storage for fast test execution
- ✅ Minimal logging to reduce test noise
- ✅ Automatic cleanup between test runs
- ✅ Deterministic behavior for reliable testing
- ✅ Reduced limits for faster tests

## 🗂️ Data Directory Configuration

### Directory Structure

```
DATA_DIRECTORY/
├── lists/              # Task list data files
│   ├── list-uuid.json
│   └── ...
├── backups/            # Automatic backups
│   ├── 2024-01-15/
│   └── ...
├── logs/               # Application logs (if file logging enabled)
│   ├── app.log
│   └── error.log
└── metadata/           # System metadata
    ├── health.json
    └── stats.json
```

### Directory Permissions

**Development:**

```bash
mkdir -p ./dev-data
chmod 755 ./dev-data
```

**Production:**

```bash
sudo mkdir -p /var/lib/task-manager
sudo chown $USER:$USER /var/lib/task-manager
chmod 750 /var/lib/task-manager
```

### Backup Configuration

```bash
# Enable backups
BACKUP_ENABLED=true

# Backup frequency (daily by default)
BACKUP_INTERVAL=86400000  # 24 hours in milliseconds

# Retention policy
BACKUP_RETENTION_DAYS=30

# Backup compression
BACKUP_COMPRESSION=true
```

## 📊 Logging Configuration

### Log Levels

| Level   | Description             | Use Case                      |
| ------- | ----------------------- | ----------------------------- |
| `error` | Only critical errors    | Production, minimal logging   |
| `warn`  | Errors and warnings     | Production, balanced logging  |
| `info`  | Informational messages  | Development, normal operation |
| `debug` | Detailed debugging info | Development, troubleshooting  |

### Log Formats

**Simple Format (Development):**

```
2024-01-15 10:30:00 [INFO] Task created: "Learn MCP Tools"
```

**JSON Format (Production):**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Task created",
  "taskId": "uuid",
  "listId": "uuid"
}
```

### Log Configuration

```bash
# Log level
MCP_LOG_LEVEL=info

# Log format
LOG_FORMAT=json          # json, simple
LOG_FILE_ENABLED=true    # Enable file logging
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10485760    # 10MB
LOG_MAX_FILES=5          # Keep 5 log files
```

## 🚀 Performance Configuration

### Memory Management

```bash
# Memory limits
MAX_MEMORY_USAGE=536870912    # 512MB in bytes
MEMORY_CHECK_INTERVAL=30000   # Check every 30 seconds
MEMORY_CLEANUP_THRESHOLD=0.8  # Cleanup at 80% usage
```

### Concurrency Settings

```bash
# Request handling
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=30000         # 30 seconds
QUEUE_SIZE=1000              # Request queue size
```

### Cache Configuration

```bash
# Enable caching
CACHE_ENABLED=true
CACHE_TTL=300000             # 5 minutes
CACHE_MAX_SIZE=1000          # Max cached items
```

## 🔒 Security Configuration

### Access Control

```bash
# Enable security features
SECURITY_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100      # Requests per minute
RATE_LIMIT_WINDOW=60000      # 1 minute window
```

### Data Protection

```bash
# Data encryption (future feature)
ENCRYPTION_ENABLED=false
ENCRYPTION_KEY_PATH=/etc/task-manager/key

# Data validation
STRICT_VALIDATION=true
SANITIZE_INPUT=true
```

## 🔍 Monitoring Configuration

### Health Checks

```bash
# Health check settings
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000   # 30 seconds
HEALTH_CHECK_TIMEOUT=5000     # 5 seconds
HEALTH_CHECK_ENDPOINT=/health
```

### Metrics Collection

```bash
# Performance metrics
METRICS_ENABLED=false
METRICS_INTERVAL=60000        # 1 minute
METRICS_RETENTION=86400000    # 24 hours
```

## 🐳 Container Configuration

### Docker Environment

```dockerfile
# Dockerfile environment
ENV NODE_ENV=production
ENV MCP_LOG_LEVEL=info
ENV STORAGE_TYPE=file
ENV DATA_DIRECTORY=/app/data
ENV BACKUP_ENABLED=true
```

### Docker Compose

```yaml
version: '3.8'
services:
  task-manager:
    image: task-list-mcp:latest
    environment:
      - NODE_ENV=production
      - MCP_LOG_LEVEL=info
      - STORAGE_TYPE=file
      - DATA_DIRECTORY=/app/data
    volumes:
      - task-data:/app/data
      - task-logs:/app/logs
    restart: unless-stopped

volumes:
  task-data:
  task-logs:
```

### Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-manager
spec:
  replicas: 1
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
          image: task-list-mcp:latest
          env:
            - name: NODE_ENV
              value: 'production'
            - name: MCP_LOG_LEVEL
              value: 'info'
            - name: STORAGE_TYPE
              value: 'file'
            - name: DATA_DIRECTORY
              value: '/app/data'
          volumeMounts:
            - name: data-volume
              mountPath: /app/data
      volumes:
        - name: data-volume
          persistentVolumeClaim:
            claimName: task-manager-pvc
```

## 🔧 Configuration Validation

### Validation Script

```bash
#!/bin/bash
# validate-config.sh

echo "Validating MCP Task Manager configuration..."

# Check required variables
if [ -z "$NODE_ENV" ]; then
    echo "❌ NODE_ENV is not set"
    exit 1
fi

# Check data directory
if [ ! -d "$DATA_DIRECTORY" ]; then
    echo "❌ DATA_DIRECTORY does not exist: $DATA_DIRECTORY"
    exit 1
fi

# Check permissions
if [ ! -w "$DATA_DIRECTORY" ]; then
    echo "❌ DATA_DIRECTORY is not writable: $DATA_DIRECTORY"
    exit 1
fi

echo "✅ Configuration validation passed"
```

### Health Check

```bash
# Run health check
npm run health

# Expected output:
# ✅ MCP Task Manager Health Check
# ✅ Server: Running
# ✅ Storage: Initialized
# ✅ Configuration: Valid
# ✅ Memory: 145MB used
# ✅ Performance: All systems normal
```

## 🚨 Troubleshooting Configuration

### Common Issues

#### Environment Variables Not Loading

```bash
# Check if variables are set
env | grep MCP_
env | grep NODE_ENV

# Source environment file
source .env
```

#### Data Directory Issues

```bash
# Check directory exists and permissions
ls -la $DATA_DIRECTORY
test -w $DATA_DIRECTORY && echo "Writable" || echo "Not writable"

# Create directory if missing
mkdir -p $DATA_DIRECTORY
chmod 755 $DATA_DIRECTORY
```

#### Storage Backend Issues

```bash
# Test file storage
echo '{"test": true}' > $DATA_DIRECTORY/test.json
cat $DATA_DIRECTORY/test.json
rm $DATA_DIRECTORY/test.json

# Check disk space
df -h $DATA_DIRECTORY
```

### Configuration Testing

```bash
# Test configuration with different environments
NODE_ENV=development npm run health
NODE_ENV=production npm run health
NODE_ENV=test npm run health

# Test with different storage types
STORAGE_TYPE=memory npm run health
STORAGE_TYPE=file npm run health
```

## 📋 Configuration Checklist

### Pre-Deployment Checklist

- [ ] **Environment variables set** correctly for target environment
- [ ] **Data directory** exists and has proper permissions
- [ ] **Storage backend** is accessible and functional
- [ ] **Logging configuration** appropriate for environment
- [ ] **Backup settings** configured for production
- [ ] **Security settings** enabled for production
- [ ] **Performance limits** set appropriately
- [ ] **Health checks** passing
- [ ] **Configuration validation** successful

### Post-Deployment Checklist

- [ ] **Server starts** without errors
- [ ] **MCP client connects** successfully
- [ ] **Basic operations** work correctly
- [ ] **Logs are generated** at appropriate level
- [ ] **Backups are created** (if enabled)
- [ ] **Health endpoint** responds correctly
- [ ] **Performance metrics** within expected ranges
- [ ] **Error handling** works as expected

## 🔗 Related Documentation

- **[Installation Guide](installation.md)** - Setup and installation
- **[Getting Started](getting-started.md)** - Basic usage tutorial
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[Performance Guide](../reference/performance.md)** - Performance optimization
- **[API Reference](../api/tools.md)** - Complete tool documentation

---

This configuration guide provides comprehensive coverage of all configuration options. For specific deployment scenarios or advanced configurations, see the related documentation or contact support.
