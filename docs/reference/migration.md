# Migration Guide

This guide helps you migrate between versions of the MCP Task Manager and upgrade your configurations.

## 🚀 Version Migration

### Current Version: 2.3.0

The MCP Task Manager follows semantic versioning (semver). This guide covers migration between major versions and significant feature updates.

### Migration Overview

| From Version | To Version | Migration Required | Breaking Changes                 |
| ------------ | ---------- | ------------------ | -------------------------------- |
| 1.x → 2.x    | 2.3.0      | Yes                | Tool consolidation, new features |
| 2.0 → 2.1    | 2.1.x      | No                 | Backward compatible              |
| 2.1 → 2.2    | 2.2.x      | No                 | Agent-friendly features added    |
| 2.2 → 2.3    | 2.3.x      | No                 | Additional tools, improvements   |

## 📋 Version 2.x Migration

### Major Changes in Version 2.x

#### Tool Consolidation

- **`search_tasks`** and **`filter_tasks`** → **`search_tool`** (unified interface)
- Enhanced search capabilities with advanced filtering
- Backward compatibility maintained for existing tools

#### New Features Added

- **Exit Criteria Management** (2 new tools)
- **Dependency Management** (3 new tools)
- **Bulk Operations** (1 new tool)
- **DAG Visualization** (ASCII, DOT, Mermaid formats)
- **Agent-Friendly Parameter Preprocessing**

#### Configuration Changes

- New environment variables for advanced features
- Enhanced MCP client configuration options
- Improved error handling and validation

### Migration Steps

#### Step 1: Backup Your Data

```bash
# Backup current data directory
cp -r $DATA_DIRECTORY $DATA_DIRECTORY.backup.$(date +%Y%m%d)

# Backup configuration files
cp ~/.config/claude/mcp.json ~/.config/claude/mcp.json.backup
cp .kiro/settings/mcp.json .kiro/settings/mcp.json.backup
```

#### Step 2: Update Installation

**For npx users (recommended):**

```bash
# npx automatically uses the latest version
npx task-list-mcp@latest --version
```

**For global installation:**

```bash
# Update to latest version
npm update -g task-list-mcp

# Verify update
task-list-mcp --version
```

**For development installation:**

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Rebuild
npm run build

# Verify update
npm run health
```

#### Step 3: Update Configuration

**Enhanced MCP Client Configuration:**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.task-manager-data"
      },
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
        "search_tool",
        "show_tasks",

        "set_task_exit_criteria",
        "update_exit_criteria",
        "set_task_dependencies",
        "get_ready_tasks",
analyze_task_dependencies
      ]
    }
  }
}
```

#### Step 4: Test Migration

```bash
# Test basic functionality
npx task-list-mcp@latest --health

# Test with your MCP client
# Create a test list and verify all features work
```

#### Step 5: Update Usage Patterns

**Migrate from legacy search tools:**

```json
// Old pattern (still works)
{
  "tool": "search_tasks",
  "parameters": {"query": "urgent"}
}

// New recommended pattern
{
  "tool": "search_tool",
  "parameters": {
    "query": "urgent",
    "priority": [4, 5],
    "sortBy": "priority"
  }
}
```

## 🔧 Configuration Migration

### Environment Variables

#### New Environment Variables in 2.x

```bash
# Performance monitoring
PERFORMANCE_MONITORING=false

# Enhanced backup settings
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30

# Advanced features
MAX_EXIT_CRITERIA_PER_TASK=20
MAX_DEPENDENCIES_PER_TASK=10
```

#### Updated Environment Variables

```bash
# Enhanced logging levels
MCP_LOG_LEVEL=info  # Now supports: error, warn, info, debug

# Improved storage configuration
STORAGE_TYPE=file   # Enhanced file storage with atomic operations
```

### MCP Client Configuration

#### Claude Desktop Migration

**Old Configuration (1.x):**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

**New Configuration (2.x):**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.claude/task-manager-data"
      }
    }
  }
}
```

#### Kiro IDE Migration

**Enhanced Configuration:**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/tmp/task-list-mcp-data"
      },
      "disabled": false,
      "autoApprove": [
        "search_tool",
        "set_task_exit_criteria",
        "update_exit_criteria",
        "set_task_dependencies",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ]
    }
  }
}
```

## 📊 Data Migration

### Automatic Data Migration

The MCP Task Manager includes automatic data migration:

- **Data format updates** are handled automatically
- **Schema changes** are migrated on first startup
- **Backup creation** before migration
- **Rollback support** if migration fails

### Manual Data Migration

If automatic migration fails:

#### Step 1: Export Data

```bash
# Export all lists to JSON
mkdir -p ./migration-export
for file in $DATA_DIRECTORY/lists/*.json; do
  cp "$file" ./migration-export/
done
```

#### Step 2: Clean Installation

```bash
# Move old data
mv $DATA_DIRECTORY $DATA_DIRECTORY.old

# Create new data directory
mkdir -p $DATA_DIRECTORY

# Start server to initialize
npx task-list-mcp@latest --health
```

#### Step 3: Import Data

```bash
# Copy exported data
cp ./migration-export/*.json $DATA_DIRECTORY/lists/

# Verify data integrity
npx task-list-mcp@latest --health
```

### Data Format Changes

#### Version 2.x Data Enhancements

**New Task Properties:**

```json
{
  "exitCriteria": [
    {
      "id": "uuid",
      "description": "string",
      "isMet": false,
      "order": 1
    }
  ],
  "dependencies": ["task-uuid-1", "task-uuid-2"],
  "isReady": true,
  "blockedBy": []
}
```

**Enhanced List Properties:**

```json
{
  "metadata": {
    "version": "2.3.0",
    "migrated": "2024-01-15T10:00:00Z"
  }
}
```

## 🛠️ Feature Migration

### New Features in 2.x

#### Exit Criteria System

**Migration Pattern:**

```json
// Old: Basic task completion
{
  "tool": "complete_task",
  "parameters": {
    "listId": "uuid",
    "taskId": "uuid"
  }
}

// New: Quality-controlled completion
{
  "tool": "set_task_exit_criteria",
  "parameters": {
    "listId": "uuid",
    "taskId": "uuid",
    "exitCriteria": [
      "Code review completed",
      "Tests passing",
      "Documentation updated"
    ]
  }
}
```

#### Dependency Management

**Migration Pattern:**

```json
// Old: Manual dependency tracking
// (No built-in support)

// New: Automated dependency management
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "uuid",
    "taskId": "uuid",
    "dependencyIds": ["dep1-uuid", "dep2-uuid"]
  }
}
```

#### Bulk Operations

**Migration Pattern:**

```json
// Old: Multiple individual calls
[
  { "tool": "add_task", "parameters": { "title": "Task 1" } },
  { "tool": "add_task", "parameters": { "title": "Task 2" } },
  { "tool": "add_task", "parameters": { "title": "Task 3" } }
]

// Use individual add_task calls instead of bulk operations
```

## 🚨 Troubleshooting Migration

### Common Migration Issues

#### Data Migration Failures

**Symptoms:**

- Server won't start after update
- Data appears corrupted
- Missing tasks or lists

**Solutions:**

```bash
# Restore from backup
rm -rf $DATA_DIRECTORY
cp -r $DATA_DIRECTORY.backup $DATA_DIRECTORY

# Try manual migration
npx task-list-mcp@latest --migrate --force
```

#### Configuration Issues

**Symptoms:**

- MCP client can't connect
- Tools not appearing
- Permission errors

**Solutions:**

```bash
# Validate configuration
cat ~/.config/claude/mcp.json | jq .

# Reset to default configuration
cp examples/mcp-config.json ~/.config/claude/mcp.json

# Restart MCP client
```

#### Version Conflicts

**Symptoms:**

- Old version still running
- Mixed version behavior
- Unexpected errors

**Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Force reinstall
npm uninstall -g task-list-mcp
npm install -g task-list-mcp@latest

# Verify version
npx task-list-mcp@latest --version
```

### Migration Validation

#### Post-Migration Checklist

- [ ] **Server starts** without errors
- [ ] **All tools available** in MCP client
- [ ] **Data integrity** - all lists and tasks present
- [ ] **New features work** - exit criteria, dependencies, bulk operations
- [ ] **Performance normal** - response times acceptable
- [ ] **Backups created** - automatic backup system working

#### Validation Commands

```bash
# Health check
npx task-list-mcp@latest --health

# Data integrity check
npx task-list-mcp@latest --validate

# Performance test
time echo '{"tool": "list_all_lists"}' | npx task-list-mcp@latest
```

## 🔄 Rollback Procedures

### When to Rollback

- Migration fails repeatedly
- Critical functionality broken
- Performance significantly degraded
- Data corruption detected

### Rollback Steps

#### Step 1: Stop Current Version

```bash
# Stop any running instances
pkill -f task-list-mcp
```

#### Step 2: Restore Previous Version

**For npx users:**

```bash
# Install specific version
npm install -g task-list-mcp@1.9.0
```

**For development:**

```bash
# Checkout previous version
git checkout v1.9.0
npm install
npm run build
```

#### Step 3: Restore Data

```bash
# Restore data backup
rm -rf $DATA_DIRECTORY
cp -r $DATA_DIRECTORY.backup $DATA_DIRECTORY
```

#### Step 4: Restore Configuration

```bash
# Restore configuration backup
cp ~/.config/claude/mcp.json.backup ~/.config/claude/mcp.json
```

#### Step 5: Verify Rollback

```bash
# Test functionality
task-list-mcp --version
task-list-mcp --health
```

## 📞 Migration Support

### Getting Help

If you encounter issues during migration:

1. **Check the [Troubleshooting Guide](../guides/troubleshooting.md)**
2. **Review the [FAQ](faq.md)** for common questions
3. **Create a GitHub issue** with migration details
4. **Join community discussions** for peer support

### Migration Assistance

When requesting help, include:

- **Current version**: `npx task-list-mcp@latest --version`
- **Target version**: Version you're migrating to
- **Error messages**: Complete error logs
- **Configuration**: Your MCP client configuration
- **Data size**: Number of lists and tasks
- **Environment**: OS, Node.js version, MCP client

### Best Practices

1. **Always backup** before migration
2. **Test in development** before production migration
3. **Read release notes** for breaking changes
4. **Plan downtime** for major migrations
5. **Validate thoroughly** after migration

---

This migration guide covers all aspects of upgrading the MCP Task Manager. For additional help, see the [Troubleshooting Guide](../guides/troubleshooting.md) or contact support.
