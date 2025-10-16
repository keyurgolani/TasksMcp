# Tool Performance Guide

## Overview

This guide provides performance benchmarks, optimization strategies, and best practices for using the Task MCP Unified system tools efficiently.

## Performance Benchmarks

### Basic CRUD Operations

| Operation       | Average Response Time | Throughput  |
| --------------- | --------------------- | ----------- |
| `create_list`   | ~5ms                  | 200 ops/sec |
| `get_list`      | ~2ms                  | 500 ops/sec |
| `add_task`      | ~3ms                  | 333 ops/sec |
| `update_task`   | ~3ms                  | 333 ops/sec |
| `complete_task` | ~4ms                  | 250 ops/sec |
| `remove_task`   | ~2ms                  | 500 ops/sec |

### Search and Query Operations

| Operation               | Average Response Time | Throughput  | Notes               |
| ----------------------- | --------------------- | ----------- | ------------------- |
| `search_tool` (simple)  | ~10ms                 | 100 ops/sec | Text search only    |
| `search_tool` (complex) | ~25ms                 | 40 ops/sec  | Multiple filters    |
| `show_tasks`            | ~8ms                  | 125 ops/sec | Formatted output    |
| `get_ready_tasks`       | ~15ms                 | 67 ops/sec  | Dependency analysis |

### Advanced Operations

| Operation                   | Average Response Time | Throughput  | Notes             |
| --------------------------- | --------------------- | ----------- | ----------------- |
| `analyze_task_dependencies` | ~50ms                 | 20 ops/sec  | Full analysis     |
| `set_task_dependencies`     | ~8ms                  | 125 ops/sec | Simple update     |
| `update_exit_criteria`      | ~5ms                  | 200 ops/sec | Single criteria   |
| `set_task_exit_criteria`    | ~10ms                 | 100 ops/sec | Multiple criteria |

## Performance Targets

### Response Time Goals

- **Basic CRUD operations**: < 10ms
- **Complex queries with filtering**: < 50ms
- **Search operations**: < 100ms
- **Dependency analysis**: < 100ms

### Scalability Limits

- **Maximum items per list**: 1,000 tasks
- **Maximum lists per installation**: Unlimited (storage-limited)
- **Maximum concurrent operations**: 100+
- **Search result limit**: 1,000 per query

## Optimization Strategies

### Tool Selection

#### Use Efficient Tools

```json
// ✅ Good: Use unified search
{
  "tool": "search_tool",
  "parameters": {
    "query": "urgent",
    "priority": [4, 5],
    "limit": 20
  }
}

// ❌ Avoid: Multiple separate calls
// Don't chain multiple search operations
```

#### Batch Related Operations

```json
// ✅ Good: Set all dependencies at once
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "project-id",
    "taskId": "task-id",
    "dependencyIds": ["dep1", "dep2", "dep3"]
  }
}

// ❌ Avoid: Individual dependency calls
// Don't add dependencies one by one
```

### Parameter Optimization

#### Use Appropriate Limits

```json
// ✅ Good: Reasonable limits
{
  "tool": "search_tool",
  "parameters": {
    "listId": "project-id",
    "limit": 50
  }
}

// ❌ Avoid: Excessive limits
{
  "tool": "search_tool",
  "parameters": {
    "limit": 1000  // Too large for most use cases
  }
}
```

#### Filter Early

```json
// ✅ Good: Specific filtering
{
  "tool": "search_tool",
  "parameters": {
    "listId": "specific-list",
    "status": ["pending", "in_progress"],
    "priority": [4, 5]
  }
}

// ❌ Avoid: Broad queries
{
  "tool": "search_tool",
  "parameters": {
    // No filters - returns everything
  }
}
```

### Data Organization

#### Optimize List Structure

- **Keep lists focused**: 100-500 tasks per list optimal
- **Use project tags**: Group related lists efficiently
- **Regular cleanup**: Remove completed tasks periodically

#### Efficient Dependency Management

- **Minimize depth**: Keep dependency chains shallow (< 5 levels)
- **Avoid cycles**: Use `analyze_task_dependencies` to detect issues
- **Batch updates**: Set all dependencies at once

## Performance Monitoring

### Built-in Metrics

The system provides performance information in responses:

```json
{
  "success": true,
  "data": {
    /* results */
  },
  "metadata": {
    "executionTime": "15ms",
    "resultCount": 25,
    "totalAvailable": 150
  }
}
```

### Key Performance Indicators

#### Response Time Monitoring

- Track average response times per tool
- Monitor 95th percentile response times
- Alert on response times > 100ms

#### Throughput Monitoring

- Operations per second per tool
- Concurrent operation handling
- Queue depth and processing time

#### Resource Usage

- Memory usage per operation
- Storage growth rate
- CPU utilization patterns

## Troubleshooting Performance Issues

### Common Performance Problems

#### Slow Search Operations

**Symptoms:**

- `search_tool` taking > 100ms
- High CPU usage during searches
- Memory usage spikes

**Solutions:**

```json
// Use more specific filters
{
  "tool": "search_tool",
  "parameters": {
    "listId": "specific-list", // Limit scope
    "status": ["pending"], // Filter status
    "limit": 50 // Reasonable limit
  }
}
```

#### Slow Dependency Analysis

**Symptoms:**

- `analyze_task_dependencies` taking > 200ms
- Complex dependency graphs
- Circular dependency warnings

**Solutions:**

- Simplify dependency structures
- Break large lists into smaller ones
- Use `get_ready_tasks` for daily workflow

#### Memory Usage Growth

**Symptoms:**

- Increasing memory usage over time
- Slow performance with large lists
- System resource warnings

**Solutions:**

- Regular cleanup of completed tasks
- Archive old projects
- Monitor list sizes

### Performance Debugging

#### Enable Performance Logging

```bash
# Set debug logging level
export MCP_LOG_LEVEL=debug
export NODE_ENV=development
```

#### Monitor Resource Usage

```bash
# Check memory usage
ps aux | grep task-list-mcp

# Monitor file system usage
du -sh $DATA_DIRECTORY

# Check concurrent operations
lsof -p $(pgrep task-list-mcp)
```

#### Analyze Slow Operations

```json
// Add timing to requests
{
  "tool": "search_tool",
  "parameters": {
    "query": "performance test",
    "includeMetadata": true // Get timing info
  }
}
```

## Best Practices

### Development Environment

- Use smaller datasets for development
- Enable debug logging for performance analysis
- Test with realistic data volumes

### Production Environment

- Monitor response times continuously
- Set up alerting for performance degradation
- Regular performance testing with load

### Multi-Agent Environments

- Coordinate operations to avoid conflicts
- Use `get_ready_tasks` for work distribution
- Monitor concurrent operation limits

## Performance Testing

### Load Testing

```bash
# Simple load test
for i in {1..100}; do
  echo '{"tool": "get_list", "parameters": {"listId": "test-id"}}' | \
  node dist/app/cli.js &
done
wait
```

### Benchmark Testing

```bash
# Measure operation timing
time node -e "
const start = Date.now();
// Perform operation
console.log(\`Operation took: \${Date.now() - start}ms\`);
"
```

### Stress Testing

- Test with maximum list sizes (1,000 tasks)
- Test concurrent operations (100+ simultaneous)
- Test complex dependency graphs
- Test large search result sets

## Optimization Checklist

### Before Deployment

- [ ] Test with realistic data volumes
- [ ] Verify response time targets
- [ ] Test concurrent operation limits
- [ ] Validate memory usage patterns

### Regular Maintenance

- [ ] Monitor performance metrics
- [ ] Clean up completed tasks
- [ ] Optimize dependency structures
- [ ] Update performance baselines

### When Issues Arise

- [ ] Enable debug logging
- [ ] Analyze slow operations
- [ ] Check resource usage
- [ ] Review data organization
- [ ] Consider architectural changes

This performance guide helps ensure optimal operation of the Task MCP Unified system across all deployment scenarios.
