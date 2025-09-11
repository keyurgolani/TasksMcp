# Environment-Specific Configuration Guide

## Overview

This guide provides detailed configuration recommendations for different deployment environments. Each environment has specific requirements for security, performance, and operational characteristics.

## Development Environment Configuration

### Purpose
Development environments prioritize fast feedback, debugging capabilities, and ease of setup over security and performance.

### Recommended Configuration

#### Core Settings
```bash
NODE_ENV=development
STORAGE_TYPE=file
DATA_DIRECTORY=./data
LOG_LEVEL=debug
```

#### Development Optimizations
```bash
# Disable features that slow development
BACKUP_ENABLED=false
RATE_LIMIT_ENABLED=false
METRICS_ENABLED=false

# Fast feedback settings
HEALTH_CHECK_INTERVAL=10000
LOG_FORMAT=simple
LOG_FILE_ENABLED=false

# Relaxed limits for testing
MAX_LISTS_PER_CONTEXT=50
MAX_ITEMS_PER_LIST=500
BACKUP_RETENTION_DAYS=3
```

#### Complete Development .env File
```bash
# MCP Task Manager - Development Configuration

# Core Environment
NODE_ENV=development
STORAGE_TYPE=file
DATA_DIRECTORY=./data
LOG_LEVEL=debug

# Development Features
BACKUP_ENABLED=false
RATE_LIMIT_ENABLED=false
METRICS_ENABLED=false
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=10000

# Logging (console-friendly)
LOG_FORMAT=simple
LOG_FILE_ENABLED=false

# Relaxed Limits
MAX_LISTS_PER_CONTEXT=50
MAX_ITEMS_PER_LIST=500
BACKUP_RETENTION_DAYS=3
ENABLE_COMPRESSION=false

# Security (disabled for development)
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

#### MCP Client Configuration (Development)

**Kiro IDE (.kiro/settings/mcp.json)**:
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./dev-data",
        "STORAGE_TYPE": "file",
        "BACKUP_ENABLED": "false",
        "RATE_LIMIT_ENABLED": "false"
      },
      "disabled": false,
      "autoApprove": [
        "create_todo_list",
        "get_todo_list",
        "list_todo_lists",
        "update_todo_list",
        "delete_todo_list",
        "analyze_task_complexity",
        "search_todo_lists"
      ]
    }
  }
}
```

**Claude Desktop (development)**:
```json
{
  "mcpServers": {
    "task-manager-dev": {
      "command": "node",
      "args": ["/path/to/task-list-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "~/dev/task-manager-data",
        "BACKUP_ENABLED": "false"
      }
    }
  }
}
```

### Development Best Practices

1. **Use file storage** for persistence between restarts
2. **Enable debug logging** for troubleshooting
3. **Disable backups** to avoid cluttering development directory
4. **Use simple log format** for readable console output
5. **Disable rate limiting** for unrestricted testing
6. **Use relative paths** for portability

### Development Workflow

```bash
# Setup development environment
git clone https://github.com/keyurgolani/task-list-mcp.git
cd task-list-mcp
npm install

# Create development environment file
cp .env.example .env.development
# Edit .env.development with development settings

# Build and test
npm run build
npm run test

# Start development server
npm run dev
```

## Testing Environment Configuration

### Purpose
Testing environments prioritize speed, isolation, and reproducibility over persistence and monitoring.

### Recommended Configuration

#### Core Settings
```bash
NODE_ENV=test
STORAGE_TYPE=memory
LOG_LEVEL=error
```

#### Testing Optimizations
```bash
# Disable all non-essential features
BACKUP_ENABLED=false
HEALTH_CHECK_ENABLED=false
METRICS_ENABLED=false
RATE_LIMIT_ENABLED=false
LOG_FILE_ENABLED=false

# Minimal limits for fast tests
MAX_LISTS_PER_CONTEXT=10
MAX_ITEMS_PER_LIST=100
```

#### Complete Testing .env File
```bash
# MCP Task Manager - Testing Configuration

# Core Environment
NODE_ENV=test
STORAGE_TYPE=memory
LOG_LEVEL=error

# Disable All Non-Essential Features
BACKUP_ENABLED=false
HEALTH_CHECK_ENABLED=false
METRICS_ENABLED=false
RATE_LIMIT_ENABLED=false
LOG_FILE_ENABLED=false

# Minimal Limits for Speed
MAX_LISTS_PER_CONTEXT=10
MAX_ITEMS_PER_LIST=100

# No Logging Output
LOG_FORMAT=json
```

#### CI/CD Configuration

**GitHub Actions Example**:
```yaml
name: Test MCP Task Manager
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: test
      STORAGE_TYPE: memory
      LOG_LEVEL: error
      BACKUP_ENABLED: false
      HEALTH_CHECK_ENABLED: false
      METRICS_ENABLED: false
      RATE_LIMIT_ENABLED: false
      LOG_FILE_ENABLED: false
      MAX_LISTS_PER_CONTEXT: 10
      MAX_ITEMS_PER_LIST: 100
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run test:mcp
```

### Testing Best Practices

1. **Use memory storage** for speed and isolation
2. **Minimize logging** to reduce test noise
3. **Disable all monitoring** to focus on functionality
4. **Use small limits** to test boundary conditions
5. **Ensure test isolation** with fresh storage per test

## Production Environment Configuration

### Purpose
Production environments prioritize security, reliability, performance monitoring, and data persistence.

### Recommended Configuration

#### Core Settings
```bash
NODE_ENV=production
STORAGE_TYPE=file
DATA_DIRECTORY=/app/data
LOG_LEVEL=info
```

#### Production Features
```bash
# Enable all production features
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_FILES=90
ENABLE_COMPRESSION=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# Security settings
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Performance settings
MAX_LISTS_PER_CONTEXT=1000
MAX_ITEMS_PER_LIST=5000
```

#### Complete Production .env File
```bash
# MCP Task Manager - Production Configuration

# Core Environment
NODE_ENV=production
STORAGE_TYPE=file
DATA_DIRECTORY=/app/data
LOG_LEVEL=info

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_FILES=90
ENABLE_COMPRESSION=true

# Health and Monitoring
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
METRICS_PORT=9090

# Security Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Performance Configuration
MAX_LISTS_PER_CONTEXT=1000
MAX_ITEMS_PER_LIST=5000

# Logging Configuration
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/app/logs/task-manager.log
```

#### MCP Client Configuration (Production)

**Claude Desktop (production)**:
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.claude/task-manager-data",
        "BACKUP_ENABLED": "true",
        "ENABLE_COMPRESSION": "true",
        "RATE_LIMIT_ENABLED": "true"
      }
    }
  }
}
```

**Kiro IDE (production)**:
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/tmp/task-list-mcp-data",
        "BACKUP_ENABLED": "true",
        "ENABLE_COMPRESSION": "true",
        "HEALTH_CHECK_ENABLED": "true",
        "METRICS_ENABLED": "true",
        "RATE_LIMIT_ENABLED": "true"
      },
      "disabled": false,
      "autoApprove": [
        "create_todo_list",
        "get_todo_list",
        "list_todo_lists",
        "update_todo_list",
        "delete_todo_list",
        "analyze_task_complexity",
        "search_todo_lists"
      ]
    }
  }
}
```

### Production Security Considerations

#### File System Security
```bash
# Create secure data directory
sudo mkdir -p /app/data
sudo mkdir -p /app/logs
sudo chown -R app:app /app/data /app/logs
sudo chmod 750 /app/data /app/logs
```

#### Environment Variable Security
```bash
# Use secure environment variable management
# Never commit production secrets to version control

# Example using Docker secrets
docker run -d \
  --name task-manager \
  -e NODE_ENV=production \
  -e STORAGE_TYPE=file \
  -e DATA_DIRECTORY=/app/data \
  --secret postgres_password \
  task-list-mcp:latest
```

#### Network Security
```bash
# Restrict metrics endpoint access
METRICS_PORT=9090  # Only accessible internally

# Configure rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Production Monitoring

#### Health Check Setup
```bash
# Health check endpoint
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### Metrics Collection
```bash
# Prometheus metrics endpoint
curl http://localhost:9090/metrics

# Key metrics to monitor
# - mcp_requests_total
# - mcp_request_duration_seconds
# - mcp_errors_total
# - nodejs_heap_size_used_bytes
```

#### Log Monitoring
```bash
# Structured JSON logs for parsing
tail -f /app/logs/task-manager.log | jq '.'

# Key log fields to monitor
# - level: error, warn, info
# - operation: MCP tool name
# - duration: request processing time
# - error: error details
```

### Production Performance Tuning

#### Memory Management
```bash
# Node.js memory settings
NODE_OPTIONS="--max-old-space-size=2048"

# Monitor memory usage
METRICS_ENABLED=true
```

#### Storage Optimization
```bash
# Enable compression for storage efficiency
ENABLE_COMPRESSION=true

# Optimize backup retention
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_FILES=90
```

#### Concurrency Settings
```bash
# Adjust limits based on expected load
MAX_LISTS_PER_CONTEXT=1000
MAX_ITEMS_PER_LIST=5000

# Rate limiting for stability
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## PostgreSQL Production Environment

### Purpose
PostgreSQL environments provide enterprise-grade scalability, ACID compliance, and advanced querying capabilities.

### Prerequisites
- PostgreSQL 12+ server
- Database and user created
- Network connectivity configured
- SSL certificates (recommended)

### Database Setup
```sql
-- Create database and user
CREATE DATABASE task_manager_prod;
CREATE USER task_manager_user WITH PASSWORD 'secure_production_password';
GRANT ALL PRIVILEGES ON DATABASE task_manager_prod TO task_manager_user;

-- Connect to the database
\c task_manager_prod

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO task_manager_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO task_manager_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO task_manager_user;
```

### PostgreSQL Configuration
```bash
# MCP Task Manager - PostgreSQL Production Configuration

# Core Environment
NODE_ENV=production
STORAGE_TYPE=postgresql
LOG_LEVEL=info

# PostgreSQL Connection
POSTGRES_HOST=db.example.com
POSTGRES_PORT=5432
POSTGRES_DB=task_manager_prod
POSTGRES_USER=task_manager_user
POSTGRES_PASSWORD=secure_production_password
POSTGRES_SSL=true
POSTGRES_MAX_CONNECTIONS=25

# Production Features
BACKUP_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
RATE_LIMIT_ENABLED=true

# Performance Settings
MAX_LISTS_PER_CONTEXT=5000
MAX_ITEMS_PER_LIST=10000

# Logging
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/app/logs/task-manager.log
```

### PostgreSQL Security
```bash
# SSL Configuration
POSTGRES_SSL=true

# Connection pooling
POSTGRES_MAX_CONNECTIONS=25

# Use connection string for advanced options
POSTGRES_CONNECTION_STRING="postgresql://user:pass@host:5432/db?sslmode=require&pool_max=25"
```

### PostgreSQL Performance Tuning
```bash
# Connection pooling
POSTGRES_MAX_CONNECTIONS=25

# Higher limits for database storage
MAX_LISTS_PER_CONTEXT=5000
MAX_ITEMS_PER_LIST=10000

# Enable all monitoring
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
```

## Docker Production Deployment

### Dockerfile Configuration
```dockerfile
FROM node:18-alpine AS production

# Set production environment
ENV NODE_ENV=production
ENV STORAGE_TYPE=file
ENV DATA_DIRECTORY=/app/data
ENV LOG_LEVEL=info

# Create app user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001

# Create directories
WORKDIR /app
RUN mkdir -p /app/data /app/logs && \
    chown -R mcpuser:mcpuser /app

# Copy application
COPY --chown=mcpuser:mcpuser dist/ ./dist/
COPY --chown=mcpuser:mcpuser node_modules/ ./node_modules/
COPY --chown=mcpuser:mcpuser package.json ./

# Switch to app user
USER mcpuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

EXPOSE 3000 9090
CMD ["node", "dist/index.js"]
```

### Docker Compose Production
```yaml
version: '3.8'

services:
  task-manager:
    image: task-list-mcp:latest
    environment:
      - NODE_ENV=production
      - STORAGE_TYPE=file
      - DATA_DIRECTORY=/app/data
      - LOG_LEVEL=info
      - BACKUP_ENABLED=true
      - HEALTH_CHECK_ENABLED=true
      - METRICS_ENABLED=true
      - RATE_LIMIT_ENABLED=true
      - ENABLE_COMPRESSION=true
    volumes:
      - task_data:/app/data
      - task_logs:/app/logs
    ports:
      - "3000:3000"
      - "9090:9090"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "dist/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  task_data:
  task_logs:
```

## Kubernetes Production Deployment

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-manager-config
data:
  NODE_ENV: "production"
  STORAGE_TYPE: "postgresql"
  LOG_LEVEL: "info"
  BACKUP_ENABLED: "true"
  HEALTH_CHECK_ENABLED: "true"
  METRICS_ENABLED: "true"
  RATE_LIMIT_ENABLED: "true"
  MAX_LISTS_PER_CONTEXT: "5000"
  MAX_ITEMS_PER_LIST: "10000"
```

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: task-manager-secrets
type: Opaque
stringData:
  POSTGRES_HOST: "postgres.example.com"
  POSTGRES_DB: "task_manager_prod"
  POSTGRES_USER: "task_manager_user"
  POSTGRES_PASSWORD: "secure_production_password"
```

### Deployment
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
        image: task-list-mcp:latest
        ports:
        - containerPort: 3000
        - containerPort: 9090
        envFrom:
        - configMapRef:
            name: task-manager-config
        - secretRef:
            name: task-manager-secrets
        livenessProbe:
          exec:
            command:
            - node
            - dist/health-check.js
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          exec:
            command:
            - node
            - dist/health-check.js
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Environment Migration Guide

### Development to Production
1. **Change storage type** from memory to file or postgresql
2. **Enable security features** (rate limiting, SSL)
3. **Configure monitoring** (health checks, metrics)
4. **Set up backups** and retention policies
5. **Update logging** to structured format
6. **Increase resource limits** for production load

### File to PostgreSQL Migration
1. **Set up PostgreSQL** database and user
2. **Export existing data** from file storage
3. **Update environment variables** to PostgreSQL
4. **Import data** to PostgreSQL
5. **Test connectivity** and functionality
6. **Update backup strategy** for database

### Local to Cloud Migration
1. **Update data directories** to persistent volumes
2. **Configure secrets management** for sensitive data
3. **Set up monitoring** and alerting
4. **Configure load balancing** if needed
5. **Test disaster recovery** procedures

## Next Steps

- Review [Configuration Troubleshooting](./troubleshooting.md) for common issues
- Check [Environment Variables Guide](./environment-variables.md) for detailed variable documentation
- See [MCP Client Configuration Examples](../../examples/) for complete setup examples