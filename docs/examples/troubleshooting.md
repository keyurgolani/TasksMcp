# Troubleshooting Guide

This comprehensive troubleshooting guide covers common issues, their causes, and step-by-step solutions for the MCP Task Manager.

## Quick Diagnostic Commands

Before diving into specific issues, run these diagnostic commands to gather system information:

```bash
# Check server health
node dist/health-check.js

# Test MCP protocol compliance
npm run test:mcp

# Verify installation
npm run build && npm test

# Check system resources
free -h && df -h

# Check Node.js version
node --version

# Check process status
ps aux | grep node
```

## Installation and Setup Issues

### Issue: Server Won't Start

#### Symptoms
- `Cannot find module './dist/index.js'`
- `Error: ENOENT: no such file or directory`
- Server exits immediately after starting

#### Diagnosis
```bash
# Check if project is built
ls -la dist/

# Check Node.js version
node --version

# Check for missing dependencies
npm ls --depth=0
```

#### Solutions

**1. Project Not Built**
```bash
# Build the project
npm run build

# Verify build output
ls -la dist/
# Should show index.js, health-check.js, and other compiled files
```

**2. Missing Dependencies**
```bash
# Install dependencies
npm install

# For production deployment
npm ci --only=production
```

**3. Node.js Version Issues**
```bash
# Check version (must be 18.0.0+)
node --version

# Update Node.js if needed
# Using nvm:
nvm install 18
nvm use 18

# Using package manager:
# Ubuntu/Debian: apt update && apt install nodejs
# macOS: brew install node
```

**4. Permission Issues**
```bash
# Fix file permissions
chmod +x dist/index.js

# Fix directory permissions
chmod -R 755 dist/
```

### Issue: MCP Client Can't Connect

#### Symptoms
- "Server not responding" in MCP client
- Connection timeout errors
- Tools not appearing in client

#### Diagnosis
```bash
# Test server directly
node dist/index.js
# Should start without errors and wait for input

# Test MCP protocol manually
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
# Should return JSON response with tools list

# Check configuration paths
cat ~/.kiro/settings/mcp.json  # For Kiro
cat "~/Library/Application Support/Claude/mcp.json"  # For Claude Desktop (macOS)
```

#### Solutions

**1. Incorrect Configuration Paths**
```json
// Ensure absolute paths in MCP configuration
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/absolute/path/to/task-list-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**2. File Permission Issues**
```bash
# Make script executable
chmod +x /path/to/task-list-mcp/dist/index.js

# Check file ownership
ls -la /path/to/task-list-mcp/dist/index.js
```

**3. Environment Issues**
```bash
# Test with explicit environment
NODE_ENV=production node dist/index.js

# Check environment variables
env | grep NODE
```

**4. MCP Client Configuration Issues**
```bash
# Validate JSON configuration
cat ~/.kiro/settings/mcp.json | jq .
# Should parse without errors

# Restart MCP client after configuration changes
```

### Issue: Health Check Fails

#### Symptoms
- Health check returns "UNHEALTHY"
- Storage backend errors
- Memory or performance warnings

#### Diagnosis
```bash
# Run detailed health check
NODE_ENV=development node dist/health-check.js

# Check storage directory
ls -la data/
ls -la data/lists/

# Check memory usage
free -h
ps aux | grep node | head -5
```

#### Solutions

**1. Storage Issues**
```bash
# Create data directory
mkdir -p data/lists data/indexes data/backups

# Fix permissions
chmod -R 755 data/
chown -R $USER:$USER data/

# Test storage write
echo '{"test": true}' > data/test.json && rm data/test.json
```

**2. Memory Issues**
```bash
# Check available memory
free -h

# Restart server to clear memory
pkill -f "node.*index.js"
node dist/index.js

# Increase Node.js memory limit if needed
node --max-old-space-size=4096 dist/index.js
```

**3. Performance Issues**
```bash
# Check disk space
df -h

# Check I/O wait
iostat 1 5

# Optimize storage if needed
# For file storage: consider SSD
# For large datasets: consider PostgreSQL
```

## Runtime Issues

### Issue: Slow Response Times

#### Symptoms
- Operations taking > 5 seconds
- Timeout errors
- High CPU usage

#### Diagnosis
```bash
# Monitor performance
npm run test:performance

# Check system resources
top -p $(pgrep -f "node.*index.js")

# Profile memory usage
node --inspect dist/index.js
# Then connect Chrome DevTools for profiling
```

#### Solutions

**1. Large Dataset Optimization**
```bash
# Check data size
du -sh data/

# Optimize large lists
# Consider breaking into smaller lists
# Use pagination for large result sets
```

**2. Memory Optimization**
```javascript
// Use pagination in requests
{
  "name": "get_todo_list",
  "arguments": {
    "listId": "your-list-id",
    "pagination": {
      "limit": 50,
      "offset": 0
    }
  }
}
```

**3. Storage Backend Optimization**
```bash
# For file storage: use SSD
# For PostgreSQL: optimize queries and indexes
# For memory storage: increase available RAM
```

### Issue: Memory Leaks

#### Symptoms
- Gradually increasing memory usage
- Server becomes unresponsive over time
- Out of memory errors

#### Diagnosis
```bash
# Monitor memory over time
while true; do
  ps aux | grep "node.*index.js" | grep -v grep | awk '{print $6}'
  sleep 60
done

# Generate heap dump for analysis
kill -USR2 $(pgrep -f "node.*index.js")
# Heap dump saved to logs/ directory
```

#### Solutions

**1. Restart Server Periodically**
```bash
# Add to crontab for automatic restart
0 2 * * * systemctl restart task-list-mcp
```

**2. Optimize Code**
```javascript
// Clear large objects when done
todoList = null;

// Use streaming for large operations
// Implement proper cleanup in error handlers
```

**3. Increase Memory Limits**
```bash
# Start with more memory
node --max-old-space-size=4096 dist/index.js

# Monitor garbage collection
node --expose-gc --trace-gc dist/index.js
```

### Issue: Data Corruption or Loss

#### Symptoms
- "Data corruption detected" errors
- Missing todo lists or items
- Invalid JSON errors

#### Diagnosis
```bash
# Check data integrity
find data/lists -name "*.json" -exec jq . {} \; > /dev/null
# Reports any invalid JSON files

# Check backup status
ls -la data/backups/

# Verify file permissions
ls -la data/lists/
```

#### Solutions

**1. Restore from Backup**
```bash
# List available backups
ls -la data/backups/

# Restore from most recent backup
cp data/backups/latest/* data/lists/

# Verify restoration
node dist/health-check.js
```

**2. Repair Corrupted Files**
```bash
# Find corrupted files
for file in data/lists/*.json; do
  jq . "$file" > /dev/null 2>&1 || echo "Corrupted: $file"
done

# Remove corrupted files (backup first!)
mv corrupted-file.json corrupted-file.json.bak
```

**3. Prevent Future Corruption**
```bash
# Enable atomic writes (default in file storage)
# Use proper shutdown procedures
# Implement regular backup verification
```

## MCP Protocol Issues

### Issue: Tools Not Appearing in Client

#### Symptoms
- MCP client shows no tools
- "No tools available" message
- Tools list is empty

#### Diagnosis
```bash
# Test tools list directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Check server logs
NODE_ENV=development node dist/index.js 2>&1 | tee server.log
```

#### Solutions

**1. Protocol Version Mismatch**
```bash
# Check MCP SDK version
npm list @modelcontextprotocol/sdk

# Update if needed
npm update @modelcontextprotocol/sdk
npm run build
```

**2. Server Initialization Issues**
```bash
# Check for initialization errors
NODE_ENV=development node dist/index.js

# Look for error messages during startup
```

**3. Client Configuration Issues**
```json
// Ensure correct MCP configuration
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/correct/path/to/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Issue: Tool Calls Fail

#### Symptoms
- "Tool call failed" errors
- Invalid parameter errors
- Timeout errors

#### Diagnosis
```bash
# Test tool call manually
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "create_todo_list", "arguments": {"title": "Test"}}}' | node dist/index.js

# Check parameter validation
# Enable debug logging
DEBUG=* node dist/index.js
```

#### Solutions

**1. Parameter Validation Errors**
```javascript
// Ensure required parameters are provided
{
  "name": "create_todo_list",
  "arguments": {
    "title": "Required title",  // Must be 1-200 characters
    "description": "Optional description"  // Max 2000 characters
  }
}
```

**2. Data Type Issues**
```javascript
// Ensure correct data types
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "valid-uuid-string",
    "action": "add_item",
    "itemData": {
      "title": "Task title",
      "priority": 3  // Number, not string
    }
  }
}
```

**3. Storage Backend Issues**
```bash
# Check storage health
node -e "
const { FileStorageBackend } = require('./dist/storage/file-storage');
const storage = new FileStorageBackend('./data');
storage.initialize().then(() => console.log('Storage OK')).catch(console.error);
"
```

## Performance Issues

### Issue: High CPU Usage

#### Symptoms
- CPU usage consistently > 80%
- Server becomes unresponsive
- Slow response times

#### Diagnosis
```bash
# Monitor CPU usage
top -p $(pgrep -f "node.*index.js")

# Profile CPU usage
node --prof dist/index.js
# Generate profile with: node --prof-process isolate-*.log
```

#### Solutions

**1. Optimize Queries**
```javascript
// Use pagination for large datasets
{
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}

// Use filters to reduce data processing
{
  "filters": {
    "status": ["pending", "in_progress"]
  }
}
```

**2. Implement Caching**
```bash
# Enable Redis caching
export REDIS_HOST=localhost
export REDIS_PORT=6379
export CACHE_TTL=300
```

**3. Scale Horizontally**
```bash
# Run multiple instances behind load balancer
# Use process manager like PM2
npm install -g pm2
pm2 start dist/index.js --instances 4
```

### Issue: High Memory Usage

#### Symptoms
- Memory usage > 1GB
- Gradual memory increase
- Out of memory errors

#### Diagnosis
```bash
# Monitor memory usage
watch -n 5 'ps aux | grep "node.*index.js" | grep -v grep'

# Generate heap snapshot
node --inspect dist/index.js
# Connect Chrome DevTools and take heap snapshot
```

#### Solutions

**1. Optimize Data Structures**
```javascript
// Clear references when done
todoList = null;

// Use streaming for large operations
// Implement pagination
```

**2. Garbage Collection Tuning**
```bash
# Force garbage collection
node --expose-gc dist/index.js

# Optimize GC settings
node --max-old-space-size=2048 --optimize-for-size dist/index.js
```

**3. Memory Monitoring**
```javascript
// Add memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 60000);
```

## Storage Issues

### Issue: File Storage Problems

#### Symptoms
- "Failed to save todo list" errors
- Permission denied errors
- Disk space errors

#### Diagnosis
```bash
# Check disk space
df -h

# Check permissions
ls -la data/
ls -la data/lists/

# Check file system errors
dmesg | grep -i error
```

#### Solutions

**1. Disk Space Issues**
```bash
# Free up space
rm -rf data/backups/old/*
rm -rf logs/*.log

# Move to larger disk
mv data /new/larger/disk/data
ln -s /new/larger/disk/data data
```

**2. Permission Issues**
```bash
# Fix permissions
chmod -R 755 data/
chown -R $USER:$USER data/

# For production
chown -R mcp-user:mcp-user data/
```

**3. File System Issues**
```bash
# Check file system
fsck /dev/your-disk

# Remount if needed
umount /mount/point
mount /mount/point
```

### Issue: Database Connection Problems

#### Symptoms
- "Database connection failed" errors
- Connection timeout errors
- Too many connections errors

#### Diagnosis
```bash
# Test database connection
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"

# Check connection count
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Solutions

**1. Connection Configuration**
```bash
# Optimize connection pool
export POSTGRES_POOL_MIN=5
export POSTGRES_POOL_MAX=20
export POSTGRES_POOL_TIMEOUT=30000
```

**2. Database Tuning**
```sql
-- Increase max connections
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();

-- Optimize connection settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

**3. Connection Monitoring**
```sql
-- Monitor connections
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = 'mcp_tasks_prod' 
GROUP BY state;
```

## AI Analysis Issues

### Issue: Complexity Analysis Fails

#### Symptoms
- "Analysis failed" errors
- Low confidence scores
- No task suggestions generated

#### Diagnosis
```bash
# Test analysis directly
node -e "
const { analyzeTaskComplexity } = require('./dist/handlers/analyze-task-complexity');
analyzeTaskComplexity({
  params: {
    arguments: {
      taskDescription: 'Build a simple web application'
    }
  }
}).then(console.log).catch(console.error);
"
```

#### Solutions

**1. Input Validation**
```javascript
// Ensure proper input format
{
  "taskDescription": "Detailed task description with technical terms",
  "context": "project-context",
  "generateOptions": {
    "style": "technical",
    "maxTasks": 8
  }
}
```

**2. Pattern Matching Issues**
```javascript
// Use more descriptive task descriptions
// Include technical keywords
// Specify complexity indicators
```

**3. NLP Processing Issues**
```bash
# Check NLP dependencies
npm list

# Reinstall if needed
npm install
npm run build
```

## Monitoring and Debugging

### Enable Debug Logging

```bash
# Enable all debug output
DEBUG=* node dist/index.js

# Enable specific debug categories
DEBUG=mcp:* node dist/index.js
DEBUG=storage:* node dist/index.js
DEBUG=intelligence:* node dist/index.js
```

### Performance Profiling

```bash
# CPU profiling
node --prof dist/index.js
# After running, process the profile:
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect dist/index.js
# Connect Chrome DevTools to localhost:9229
```

### Log Analysis

```bash
# Monitor logs in real-time
tail -f logs/combined.log

# Search for errors
grep -i error logs/combined.log

# Analyze performance
grep "response_time" logs/combined.log | awk '{print $NF}' | sort -n
```

## Recovery Procedures

### Emergency Recovery

```bash
#!/bin/bash
# Emergency recovery script

echo "Starting emergency recovery..."

# Stop server
pkill -f "node.*index.js"

# Backup current state
cp -r data data.backup.$(date +%s)

# Restore from last known good backup
if [ -d "data/backups/latest" ]; then
  rm -rf data/lists/*
  cp data/backups/latest/* data/lists/
fi

# Verify data integrity
for file in data/lists/*.json; do
  jq . "$file" > /dev/null || rm "$file"
done

# Restart server
node dist/index.js &

# Wait and verify
sleep 5
node dist/health-check.js

echo "Recovery completed"
```

### Data Recovery

```bash
# Recover from corrupted data
find data/lists -name "*.json" -exec sh -c '
  if ! jq . "$1" > /dev/null 2>&1; then
    echo "Corrupted file: $1"
    # Try to recover from backup
    basename=$(basename "$1")
    if [ -f "data/backups/latest/$basename" ]; then
      cp "data/backups/latest/$basename" "$1"
      echo "Recovered: $1"
    else
      echo "No backup found for: $1"
    fi
  fi
' _ {} \;
```

## Prevention Strategies

### Regular Maintenance

```bash
# Weekly maintenance script
#!/bin/bash

# Health check
node dist/health-check.js || exit 1

# Data integrity check
find data/lists -name "*.json" -exec jq . {} \; > /dev/null

# Performance check
npm run test:performance

# Backup verification
ls -la data/backups/

# Log rotation
find logs -name "*.log" -mtime +7 -delete

# Memory cleanup
pkill -USR2 $(pgrep -f "node.*index.js")

echo "Maintenance completed"
```

### Monitoring Setup

```bash
# Set up monitoring alerts
# CPU usage > 80% for 5 minutes
# Memory usage > 1GB
# Error rate > 5%
# Response time > 1 second
# Disk usage > 90%
```

This troubleshooting guide covers the most common issues you may encounter with the MCP Task Manager. For additional help, check the [FAQ](../reference/faq.md) or enable debug logging to get more detailed error information.