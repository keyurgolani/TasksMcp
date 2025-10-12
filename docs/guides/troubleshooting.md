# Troubleshooting Guide

This comprehensive guide helps diagnose and resolve common issues with the MCP Task Manager.

## 🚨 Quick Diagnostics

### Health Check Commands

```bash
# Basic health check
npx task-list-mcp@latest --version

# Comprehensive health check
npx task-list-mcp@latest --health

# Test with debug logging
export MCP_LOG_LEVEL=debug
npx task-list-mcp@latest --version
```

### Expected Outputs

**Version Check:**

```
MCP Task Manager v2.3.0
Node.js v18.17.0
Platform: darwin arm64
```

**Health Check:**

```
✅ MCP Task Manager Health Check
✅ Server: Running
✅ Storage: Initialized
✅ Tools: 20 available
✅ Memory: 145MB used
✅ Performance: All systems normal
```

## 🔧 Installation Issues

### Server Won't Start

#### Symptoms

- Command not found errors
- Server fails to initialize
- No response from MCP client

#### Diagnosis

```bash
# Check Node.js version (must be 18.0.0+)
node --version

# Check npm version
npm --version

# Test npx accessibility
which npx

# Clear npm cache
npm cache clean --force
```

#### Solutions

**Node.js Version Issues:**

```bash
# Install Node.js 18+ using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**npm Permission Issues:**

```bash
# Fix npm permissions (macOS/Linux)
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Or use sudo (not recommended)
sudo npm install -g task-list-mcp
```

**Cache Issues:**

```bash
# Clear all caches
npm cache clean --force
rm -rf ~/.npm
npm install -g npm@latest
```

### MCP Client Connection Issues

#### Symptoms

- Server not found in MCP client
- Connection refused errors
- Tools not appearing

#### Diagnosis

```bash
# Test server manually
npx task-list-mcp@latest --version

# Test MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx task-list-mcp@latest

# Check configuration syntax
cat ~/.config/claude/mcp.json | jq .
```

#### Solutions

**Configuration File Issues:**

```bash
# Validate JSON syntax
jq . ~/.config/claude/mcp.json

# Fix common JSON errors
# - Missing commas
# - Trailing commas
# - Unescaped quotes
# - Wrong file path
```

**Path Issues:**

```bash
# Verify npx is in PATH
echo $PATH | grep npm

# Test command directly
/usr/local/bin/npx task-list-mcp@latest --version
```

**Client Restart Required:**

- Restart Claude Desktop after configuration changes
- Reload Kiro IDE workspace
- Check client logs for connection errors

## 📁 Data Directory Issues

### Permission Errors

#### Symptoms

- "Permission denied" errors
- Cannot create/write files
- Storage initialization fails

#### Diagnosis

```bash
# Check directory permissions
ls -la $DATA_DIRECTORY

# Test write permissions
touch $DATA_DIRECTORY/test.txt && rm $DATA_DIRECTORY/test.txt

# Check disk space
df -h $DATA_DIRECTORY
```

#### Solutions

**Create Directory:**

```bash
# Create with proper permissions
mkdir -p ~/.local/share/task-manager
chmod 755 ~/.local/share/task-manager
```

**Fix Permissions:**

```bash
# Fix ownership
chown -R $USER:$USER $DATA_DIRECTORY

# Fix permissions
chmod -R 755 $DATA_DIRECTORY
```

**Disk Space Issues:**

```bash
# Check available space
df -h $DATA_DIRECTORY

# Clean up old backups
rm -rf $DATA_DIRECTORY/backups/old-*

# Move to larger disk
mv $DATA_DIRECTORY /path/to/larger/disk/
export DATA_DIRECTORY=/path/to/larger/disk/data
```

### Storage Backend Issues

#### File Storage Problems

**Symptoms:**

- Data not persisting
- Corruption errors
- Slow performance

**Solutions:**

```bash
# Test file operations
echo '{"test": true}' > $DATA_DIRECTORY/test.json
cat $DATA_DIRECTORY/test.json
rm $DATA_DIRECTORY/test.json

# Check for corruption
npm run validate  # For development installation

# Reset storage (⚠️ Data loss)
rm -rf $DATA_DIRECTORY/*
```

#### Memory Storage Issues

**Symptoms:**

- Data lost on restart
- Memory leaks
- Performance degradation

**Solutions:**

```bash
# Switch to file storage
export STORAGE_TYPE=file
export DATA_DIRECTORY=./data

# Monitor memory usage
top -p $(pgrep -f task-list-mcp)
```

## 🔍 Validation Issues

### Parameter Validation Errors

#### Priority Field Issues

**❌ Problem:**

```json
{
  "priority": "high" // String instead of number
}
```

**✅ Solution:**

```json
{
  "priority": 5 // Use numbers 1-5
}
```

**🔄 Auto-Conversion:**

```json
{
  "priority": "5" // Automatically converted to 5
}
```

#### UUID Format Issues

**❌ Problem:**

```json
{
  "listId": "abc-123" // Invalid UUID format
}
```

**✅ Solution:**

```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000" // Valid UUID
}
```

**Finding Valid UUIDs:**

```json
{
  "tool": "list_all_lists",
  "parameters": {}
}
```

#### Array Format Issues

**❌ Problem:**

```json
{
  "tags": "urgent,important" // String instead of array
}
```

**✅ Solution:**

```json
{
  "tags": ["urgent", "important"] // Proper array
}
```

**🔄 Auto-Conversion:**

```json
{
  "tags": "[\"urgent\", \"important\"]" // JSON string converted to array
}
```

### Business Logic Errors

#### Circular Dependencies

**❌ Problem:**

```
Task A depends on Task B
Task B depends on Task A
```

**✅ Solution:**

```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "project-uuid",
    "format": "both"
  }
}
```

Use the dependency analysis to identify and remove circular references.

#### Exit Criteria Not Met

**❌ Problem:**

```
Cannot complete task: 2 exit criteria not yet met
```

**✅ Solution:**

```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "criteriaId": "criteria-uuid",
    "isMet": true
  }
}
```

#### Resource Not Found

**❌ Problem:**

```
List not found: 123e4567-e89b-12d3-a456-426614174000
```

**✅ Solution:**

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "limit": 50
  }
}
```

Find the correct list ID from the available lists.

## 🚀 Performance Issues

### Slow Response Times

#### Symptoms

- Operations taking >1 second
- Timeouts on large datasets
- Memory usage growing

#### Diagnosis

```bash
# Enable performance monitoring
export PERFORMANCE_MONITORING=true

# Check memory usage
ps aux | grep task-list-mcp

# Monitor response times
time npx task-list-mcp@latest --health
```

#### Solutions

**Reduce Data Volume:**

```json
{
  "tool": "search_tool",
  "parameters": {
    "limit": 10 // Reduce result size
  }
}
```

**Use Pagination:**

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "limit": 20,
    "offset": 0
  }
}
```

**Optimize Queries:**

```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "specific-list", // Limit scope
    "status": ["pending"], // Filter early
    "limit": 50
  }
}
```

### Memory Issues

#### High Memory Usage

**Diagnosis:**

```bash
# Monitor memory
top -p $(pgrep -f task-list-mcp)

# Check for memory leaks
export NODE_OPTIONS="--max-old-space-size=512"
```

**Solutions:**

```bash
# Restart server periodically
pkill -f task-list-mcp
npx task-list-mcp@latest

# Use memory storage for testing
export STORAGE_TYPE=memory

# Reduce cache size
export CACHE_MAX_SIZE=100
```

## 🔐 Security Issues

### Access Control Problems

#### Symptoms

- Unauthorized access to data
- Rate limiting not working
- Security warnings in logs

#### Solutions

**Enable Security Features:**

```bash
export SECURITY_ENABLED=true
export RATE_LIMIT_ENABLED=true
export STRICT_VALIDATION=true
```

**Secure Data Directory:**

```bash
# Restrict permissions
chmod 700 $DATA_DIRECTORY
chown $USER:$USER $DATA_DIRECTORY

# Move to secure location
sudo mkdir -p /var/lib/task-manager
sudo chown $USER:$USER /var/lib/task-manager
export DATA_DIRECTORY=/var/lib/task-manager
```

## 🔄 Recovery Procedures

### Data Recovery

#### Backup Restoration

```bash
# List available backups
ls -la $DATA_DIRECTORY/backups/

# Restore from backup
cp -r $DATA_DIRECTORY/backups/2024-01-15/* $DATA_DIRECTORY/

# Verify restoration
npm run health
```

#### Manual Data Repair

```bash
# Validate data integrity
npm run validate

# Repair corrupted files
npm run repair  # If available

# Reset to clean state (⚠️ Data loss)
rm -rf $DATA_DIRECTORY/*
npm run init
```

### Configuration Recovery

#### Reset to Defaults

```bash
# Clear environment variables
unset NODE_ENV MCP_LOG_LEVEL DATA_DIRECTORY STORAGE_TYPE

# Use default configuration
npx task-list-mcp@latest --version
```

#### Backup Configuration

```bash
# Backup current config
cp ~/.config/claude/mcp.json ~/.config/claude/mcp.json.backup

# Restore from backup
cp ~/.config/claude/mcp.json.backup ~/.config/claude/mcp.json
```

## 🧪 Testing and Validation

### Integration Testing

```bash
# Test basic operations
echo '{"tool": "create_list", "parameters": {"title": "Test"}}' | npx task-list-mcp@latest

# Test all tools
npm run test:integration  # For development installation
```

### Load Testing

```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  echo '{"tool": "list_all_lists", "parameters": {}}' | npx task-list-mcp@latest &
done
wait
```

### Stress Testing

```bash
# Create large dataset
for i in {1..100}; do
  echo "{\"tool\": \"create_list\", \"parameters\": {\"title\": \"Test $i\"}}" | npx task-list-mcp@latest
done

# Test performance
time echo '{"tool": "list_all_lists", "parameters": {}}' | npx task-list-mcp@latest
```

## 📞 Getting Help

### Diagnostic Information

When reporting issues, include:

```bash
# System information
npx task-list-mcp@latest --version
node --version
npm --version
uname -a

# Configuration
echo "NODE_ENV: $NODE_ENV"
echo "STORAGE_TYPE: $STORAGE_TYPE"
echo "DATA_DIRECTORY: $DATA_DIRECTORY"

# Health check
npx task-list-mcp@latest --health

# Error logs (if available)
tail -n 50 $DATA_DIRECTORY/logs/error.log
```

### Support Resources

- **[FAQ](../reference/faq.md)** - Frequently asked questions
- **[Configuration Guide](configuration.md)** - Detailed configuration options
- **[API Reference](../api/tools.md)** - Complete tool documentation
- **GitHub Issues** - Bug reports and feature requests
- **Community Discussions** - Q&A and shared solutions

### Emergency Procedures

#### Complete Reset (⚠️ Data Loss)

```bash
# Stop server
pkill -f task-list-mcp

# Clear all data
rm -rf $DATA_DIRECTORY

# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g task-list-mcp
npm install -g task-list-mcp

# Test installation
npx task-list-mcp@latest --version
```

#### Safe Mode

```bash
# Start with minimal configuration
NODE_ENV=development \
STORAGE_TYPE=memory \
MCP_LOG_LEVEL=debug \
npx task-list-mcp@latest --version
```

---

This troubleshooting guide covers the most common issues. For additional help, see the [FAQ](../reference/faq.md) or contact support through GitHub Issues.
