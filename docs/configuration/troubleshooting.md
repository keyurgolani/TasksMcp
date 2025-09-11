# Configuration Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common configuration issues with the MCP Task Manager. It covers validation steps, common problems, debugging techniques, and connection troubleshooting.

## Quick Diagnostic Commands

### Basic Health Check
```bash
# Test server startup
npx task-list-mcp@latest --version

# Expected output:
# MCP Task Manager v1.0.0
# Node.js v18.x.x
# Platform: darwin arm64

# Test with verbose logging
npx task-list-mcp@latest --verbose
```

### Configuration Validation
```bash
# Validate environment variables
node -e "
const { ConfigManager } = require('./dist/config/index.js');
try {
  const config = ConfigManager.getInstance().getConfig();
  console.log('✅ Configuration valid');
  console.log('Storage type:', config.storage.type);
  console.log('Data directory:', config.storage.file?.dataDirectory || 'N/A');
} catch (error) {
  console.error('❌ Configuration error:', error.message);
}
"
```

### MCP Protocol Test
```bash
# Test MCP server directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx task-list-mcp@latest

# Expected: JSON response with available tools
```

## Common Configuration Problems

### 1. Server Won't Start

#### Problem: "Configuration validation failed"
```
Error: Configuration validation failed: NODE_ENV: Invalid enum value. Expected 'development' | 'production' | 'test', received 'prod'
```

**Cause**: Invalid environment variable values

**Solution**:
```bash
# Check current environment variables
env | grep -E "(NODE_ENV|STORAGE_TYPE|LOG_LEVEL)"

# Fix invalid values
export NODE_ENV=production  # Not 'prod'
export STORAGE_TYPE=file    # Not 'filesystem'
export LOG_LEVEL=info       # Not 'INFO' (case sensitive)
```

**Valid Values Reference**:
- `NODE_ENV`: `development`, `production`, `test`
- `STORAGE_TYPE`: `memory`, `file`, `postgresql`
- `LOG_LEVEL`: `error`, `warn`, `info`, `debug`, `silent`

#### Problem: "Data directory not accessible"
```
Error: EACCES: permission denied, mkdir '/app/data'
```

**Cause**: Insufficient permissions for data directory

**Solution**:
```bash
# Check directory permissions
ls -la /app/

# Create directory with correct permissions
sudo mkdir -p /app/data
sudo chown $(whoami):$(whoami) /app/data
sudo chmod 755 /app/data

# Or use a directory you own
export DATA_DIRECTORY=./data
mkdir -p ./data
```

#### Problem: "PostgreSQL connection failed"
```
Error: PostgreSQL configuration incomplete. Required: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
```

**Cause**: Missing PostgreSQL environment variables

**Solution**:
```bash
# Set all required PostgreSQL variables
export STORAGE_TYPE=postgresql
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=task_manager
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password

# Test PostgreSQL connection
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();"
```

### 2. MCP Client Connection Issues

#### Problem: "Server not found in MCP client"
**Symptoms**: MCP client doesn't show task-manager tools

**Debugging Steps**:
```bash
# 1. Verify server starts manually
npx task-list-mcp@latest --version

# 2. Check MCP client configuration syntax
cat ~/.kiro/settings/mcp.json | jq '.'  # Should parse without errors

# 3. Test with minimal configuration
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"]
    }
  }
}

# 4. Check MCP client logs for connection errors
```

**Common Solutions**:
```bash
# Fix 1: Restart MCP client after configuration changes
# Claude Desktop: Restart application
# Kiro IDE: Reload window or restart

# Fix 2: Use absolute paths
{
  "mcpServers": {
    "task-manager": {
      "command": "/usr/local/bin/npx",
      "args": ["task-list-mcp@latest"]
    }
  }
}

# Fix 3: Test command accessibility
which npx
npx --version
```

#### Problem: "Connection refused" or "Server timeout"
**Symptoms**: MCP client shows connection errors

**Debugging Steps**:
```bash
# 1. Test server startup time
time npx task-list-mcp@latest --version

# 2. Check for port conflicts
lsof -i :3000  # Default MCP port

# 3. Test with increased timeout
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "timeout": 30000
    }
  }
}
```

#### Problem: "Environment variables not working"
**Symptoms**: Server uses default values instead of configured environment variables

**Debugging**:
```bash
# Check if environment variables are passed correctly
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "/tmp/test-data"
      }
    }
  }
}

# Verify with debug logging
# Look for "Configuration loaded successfully" message with your values
```

### 3. Storage and Data Issues

#### Problem: "File storage corruption"
```
Error: Unexpected token in JSON at position 0
```

**Cause**: Corrupted JSON files or incomplete writes

**Solution**:
```bash
# 1. Check for backup files
ls -la ./data/*.backup

# 2. Restore from backup if available
cp ./data/list-id.json.backup ./data/list-id.json

# 3. Validate JSON files
find ./data -name "*.json" -exec sh -c 'echo "Checking $1"; cat "$1" | jq empty' _ {} \;

# 4. Enable compression to reduce corruption risk
export ENABLE_COMPRESSION=true
```

#### Problem: "PostgreSQL connection pool exhausted"
```
Error: Connection pool exhausted. Unable to acquire connection
```

**Cause**: Too many concurrent connections or connection leaks

**Solution**:
```bash
# Increase connection pool size
export POSTGRES_MAX_CONNECTIONS=25

# Check for connection leaks in PostgreSQL
SELECT count(*) FROM pg_stat_activity WHERE datname = 'task_manager';

# Restart server to reset connections
```

#### Problem: "Backup failures"
```
Error: Backup failed: ENOSPC: no space left on device
```

**Cause**: Insufficient disk space or backup directory issues

**Solution**:
```bash
# Check disk space
df -h

# Clean old backups
find ./data/backups -name "*.backup" -mtime +30 -delete

# Adjust backup retention
export BACKUP_RETENTION_DAYS=7
export BACKUP_MAX_FILES=10

# Disable backups temporarily if needed
export BACKUP_ENABLED=false
```

### 4. Performance Issues

#### Problem: "Slow response times"
**Symptoms**: Operations taking longer than expected

**Debugging**:
```bash
# Enable performance monitoring
export METRICS_ENABLED=true
export LOG_LEVEL=debug

# Check metrics endpoint
curl http://localhost:9090/metrics | grep mcp_request_duration

# Monitor memory usage
export NODE_OPTIONS="--max-old-space-size=2048"
```

**Solutions**:
```bash
# 1. Enable compression for file storage
export ENABLE_COMPRESSION=true

# 2. Increase limits if needed
export MAX_ITEMS_PER_LIST=5000
export MAX_LISTS_PER_CONTEXT=1000

# 3. Use PostgreSQL for better performance at scale
export STORAGE_TYPE=postgresql

# 4. Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Problem: "Memory leaks or high memory usage"
**Symptoms**: Memory usage continuously increasing

**Debugging**:
```bash
# Enable memory monitoring
export METRICS_ENABLED=true

# Check memory metrics
curl http://localhost:9090/metrics | grep nodejs_heap

# Enable garbage collection logging
export NODE_OPTIONS="--expose-gc --trace-gc"
```

**Solutions**:
```bash
# 1. Restart server periodically in production
# 2. Use memory storage for testing only
export STORAGE_TYPE=file  # Not memory for production

# 3. Reduce cache sizes
export MAX_LISTS_PER_CONTEXT=100
export MAX_ITEMS_PER_LIST=1000
```

## Environment Variable Validation

### Validation Script
Create a validation script to check your configuration:

```bash
#!/bin/bash
# validate-config.sh

echo "🔍 Validating MCP Task Manager Configuration"

# Check required Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
    exit 1
fi
echo "✅ Node.js version: $NODE_VERSION"

# Validate environment variables
validate_env() {
    local var_name=$1
    local valid_values=$2
    local current_value=${!var_name}
    
    if [ -n "$current_value" ]; then
        if [[ " $valid_values " =~ " $current_value " ]]; then
            echo "✅ $var_name: $current_value"
        else
            echo "❌ $var_name: '$current_value' is invalid. Valid values: $valid_values"
            return 1
        fi
    else
        echo "ℹ️  $var_name: not set (will use default)"
    fi
}

# Validate core variables
validate_env "NODE_ENV" "development production test"
validate_env "STORAGE_TYPE" "memory file postgresql"
validate_env "LOG_LEVEL" "error warn info debug silent"

# Check data directory if using file storage
if [ "$STORAGE_TYPE" = "file" ]; then
    DATA_DIR=${DATA_DIRECTORY:-"./data"}
    if [ -d "$DATA_DIR" ] && [ -w "$DATA_DIR" ]; then
        echo "✅ Data directory: $DATA_DIR (writable)"
    elif [ ! -d "$DATA_DIR" ]; then
        if mkdir -p "$DATA_DIR" 2>/dev/null; then
            echo "✅ Data directory: $DATA_DIR (created)"
        else
            echo "❌ Data directory: $DATA_DIR (cannot create)"
            exit 1
        fi
    else
        echo "❌ Data directory: $DATA_DIR (not writable)"
        exit 1
    fi
fi

# Check PostgreSQL variables if using postgresql storage
if [ "$STORAGE_TYPE" = "postgresql" ]; then
    required_vars=("POSTGRES_HOST" "POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ $var is required for PostgreSQL storage"
            exit 1
        else
            echo "✅ $var: set"
        fi
    done
fi

# Test server startup
echo "🚀 Testing server startup..."
if timeout 10s npx task-list-mcp@latest --version >/dev/null 2>&1; then
    echo "✅ Server starts successfully"
else
    echo "❌ Server startup failed"
    exit 1
fi

echo "🎉 Configuration validation complete!"
```

### Usage
```bash
chmod +x validate-config.sh
./validate-config.sh
```

## MCP Client-Specific Troubleshooting

### Claude Desktop Issues

#### Problem: "Server not appearing in tools list"
**Solution**:
```bash
# 1. Check configuration file location
# macOS: ~/Library/Application Support/Claude/mcp.json
# Windows: %APPDATA%/Claude/mcp.json
# Linux: ~/.config/claude/mcp.json

# 2. Validate JSON syntax
cat ~/Library/Application\ Support/Claude/mcp.json | jq '.'

# 3. Restart Claude Desktop completely
# 4. Check Claude Desktop logs for errors
```

#### Problem: "Permission denied errors"
**Solution**:
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Or use sudo (not recommended)
sudo npx task-list-mcp@latest --version
```

### Kiro IDE Issues

#### Problem: "MCP server not connecting"
**Solution**:
```bash
# 1. Check workspace configuration
cat .kiro/settings/mcp.json | jq '.'

# 2. Reload Kiro window
# Command Palette -> "Developer: Reload Window"

# 3. Check MCP Server view in Kiro feature panel
# 4. Enable all tools in autoApprove for testing
```

#### Problem: "Environment variables not working in Kiro"
**Solution**:
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./kiro-data"
      },
      "disabled": false,
      "autoApprove": ["create_todo_list", "get_todo_list"]
    }
  }
}
```

## Debugging Techniques

### Enable Debug Logging
```bash
# Method 1: Environment variable
export LOG_LEVEL=debug

# Method 2: Command line flag
npx task-list-mcp@latest --verbose

# Method 3: MCP client configuration
{
  "env": {
    "LOG_LEVEL": "debug"
  }
}
```

### Trace MCP Protocol Messages
```bash
# Enable MCP protocol tracing
export MCP_TRACE=true

# Or use debug logging to see all messages
export LOG_LEVEL=debug
```

### Monitor System Resources
```bash
# Monitor memory usage
watch -n 1 'ps aux | grep task-list-mcp'

# Monitor file descriptors
lsof -p $(pgrep -f task-list-mcp)

# Monitor disk usage
watch -n 5 'df -h'
```

### Test Individual Components

#### Test Storage Backend
```bash
node -e "
const { StorageFactory } = require('./dist/storage/storage-factory.js');
const config = { type: 'file', file: { dataDirectory: './test-data' } };
const storage = StorageFactory.createStorage(config);
console.log('Storage backend created successfully');
"
```

#### Test Configuration Loading
```bash
node -e "
const { ConfigManager } = require('./dist/config/index.js');
const config = ConfigManager.getInstance().getConfig();
console.log(JSON.stringify(config, null, 2));
"
```

## Recovery Procedures

### Data Recovery

#### From File Storage Backups
```bash
# List available backups
ls -la ./data/*.backup

# Restore from backup
cp ./data/list-id.json.backup ./data/list-id.json

# Verify restored data
cat ./data/list-id.json | jq '.'
```

#### From PostgreSQL Backups
```bash
# Restore from PostgreSQL dump
pg_restore -h localhost -U postgres -d task_manager backup.dump

# Or from SQL backup
psql -h localhost -U postgres -d task_manager < backup.sql
```

### Configuration Recovery

#### Reset to Default Configuration
```bash
# Remove custom environment variables
unset NODE_ENV STORAGE_TYPE DATA_DIRECTORY LOG_LEVEL

# Test with defaults
npx task-list-mcp@latest --version

# Gradually add back custom configuration
export NODE_ENV=production
npx task-list-mcp@latest --version
```

#### MCP Client Configuration Reset
```bash
# Backup current configuration
cp ~/.kiro/settings/mcp.json ~/.kiro/settings/mcp.json.backup

# Use minimal configuration
echo '{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"]
    }
  }
}' > ~/.kiro/settings/mcp.json

# Test and gradually add features back
```

## Getting Additional Help

### Collect Diagnostic Information
```bash
#!/bin/bash
# collect-diagnostics.sh

echo "=== MCP Task Manager Diagnostics ==="
echo "Date: $(date)"
echo "Platform: $(uname -a)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo

echo "=== Environment Variables ==="
env | grep -E "(NODE_ENV|STORAGE_TYPE|DATA_DIRECTORY|LOG_LEVEL|POSTGRES_)" | sort
echo

echo "=== Configuration Test ==="
npx task-list-mcp@latest --version
echo

echo "=== File System ==="
ls -la ./data/ 2>/dev/null || echo "No data directory"
df -h . 2>/dev/null
echo

echo "=== Process Information ==="
ps aux | grep -E "(node|task-list-mcp)" | grep -v grep
echo

echo "=== Network ==="
netstat -an | grep -E "(3000|9090)" 2>/dev/null || echo "No listening ports found"
```

### Support Checklist
When seeking help, provide:

1. **Environment Information**:
   - Operating system and version
   - Node.js version
   - npm version
   - MCP client (Claude Desktop, Kiro IDE, etc.)

2. **Configuration**:
   - Environment variables (sanitized)
   - MCP client configuration (sanitized)
   - Storage type and settings

3. **Error Details**:
   - Complete error messages
   - Steps to reproduce
   - Expected vs actual behavior

4. **Diagnostic Output**:
   - Server startup logs
   - MCP client logs
   - Configuration validation results

5. **Troubleshooting Attempted**:
   - Steps already tried
   - Temporary workarounds found
   - Configuration changes made

## Next Steps

- Review [Environment Variables Guide](./environment-variables.md) for detailed variable documentation
- Check [Environment-Specific Configuration](./environment-specific.md) for setup examples
- See [MCP Client Configuration Examples](../../examples/) for working configurations