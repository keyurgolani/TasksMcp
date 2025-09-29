# MCP Task Manager Examples

This directory contains practical examples demonstrating all features of the MCP Task Manager. Each example is based on real usage and testing of the system.

## Example Categories

### [Basic Usage](basic.md)
Simple task and list management operations for getting started.

**Key Topics:**
- Creating and managing todo lists
- Adding and updating tasks
- Basic search and filtering
- Task completion workflows

**Tools Covered:**
- `create_list`, `get_list`, `list_all_lists`, `delete_list`
- `add_task`, `update_task`, `complete_task`, `remove_task`
- `search_tasks`, `filter_tasks`, `show_tasks`

### [Advanced Workflows](advanced.md) ⭐ **Enhanced with Methodology**
Complex project management and multi-agent orchestration patterns following best practices.

**Key Topics:**
- Investigation-first approach for complex projects
- Methodology-driven task breakdown and analysis
- Advanced dependency management with quality tracking
- Multi-agent coordination with comprehensive progress monitoring
- Enterprise-level project execution examples

**Methodology Demonstrations:**
- Complete e-commerce platform planning example
- Investigation and research phases for complex tasks
- Quality completion with detailed exit criteria
- Comprehensive reflection and learning documentation

### [Basic Usage](basic.md) ⭐ **Now with Best Practices Integration**
Simple task and list management operations demonstrating the [Agent Best Practices](../guides/agent-best-practices.md) methodology.

**Key Topics:**
- Plan and Reflect methodology in daily workflows
- Investigation-driven task creation with detailed action plans
- Research-based execution with continuous progress updates
- Quality completion through comprehensive exit criteria tracking

**Methodology Examples:** Complete workflows showing investigation, planning, execution, and reflection phases.

### [Configuration Examples](configuration.md)
Setup and configuration examples for different environments and MCP clients.

**Key Topics:**
- MCP client configuration (Claude Desktop, Kiro IDE)
- Environment variable configuration
- Production deployment patterns
- Multi-agent setup examples

## Quick Start Examples

### Basic Workflow
```json
// 1. Create a project list
{
  "tool": "create_list",
  "parameters": {
    "title": "My Project",
    "description": "A sample project for demonstration",
    "projectTag": "demo"
  }
}

// 2. Add a task
{
  "tool": "add_task",
  "parameters": {
    "listId": "your-list-id",
    "title": "Complete project setup",
    "description": "Set up development environment and tools",
    "priority": 5,
    "tags": ["setup", "urgent"]
  }
}

// 3. View tasks
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "your-list-id",
    "format": "detailed"
  }
}

// 4. Complete the task
{
  "tool": "complete_task",
  "parameters": {
    "listId": "your-list-id",
    "taskId": "your-task-id"
  }
}
```

### Dependency Workflow
```json
// 1. Add tasks with dependencies
{
  "tool": "add_task",
  "parameters": {
    "listId": "your-list-id",
    "title": "Design phase",
    "dependencies": ["setup-task-id"]
  }
}

// 2. Find ready tasks
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "your-list-id"
  }
}

// 3. Analyze dependencies
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "your-list-id",
    "format": "both",
    "dagStyle": "ascii"
  }
}
```

## Usage Patterns

### Daily Development Workflow
1. **Morning standup**: Use `get_ready_tasks` to see what's available
2. **Work planning**: Use `filter_tasks` to focus on priority items
3. **Progress tracking**: Use `show_tasks` with summary format
4. **Task completion**: Use `complete_task` to mark work done

### Project Management
1. **Project setup**: Create lists with project tags
2. **Task planning**: Add tasks with dependencies and estimates
3. **Progress monitoring**: Use dependency analysis for bottlenecks
4. **Team coordination**: Use ready tasks for work assignment

### Multi-Agent Coordination
1. **Task distribution**: Use `get_ready_tasks` for parallel assignment
2. **Progress monitoring**: Track completion across agents
3. **Dependency resolution**: Ensure proper task sequencing
4. **Bottleneck identification**: Use dependency analysis

## Best Practices

### Task Management
- Use descriptive titles and detailed descriptions
- Set realistic time estimates
- Use consistent tagging for organization
- Define dependencies early in planning

### List Organization
- Use project tags for categorization
- Create focused lists for specific projects
- Archive completed projects for history
- Use descriptive names and descriptions

### Workflow Optimization
- Start with ready tasks
- Focus on critical path items
- Use parallel development when possible
- Monitor and resolve bottlenecks quickly

## Testing the Examples

All examples in this directory are based on actual testing of the MCP Task Manager. You can reproduce these examples by:

1. Setting up the MCP server as shown in the configuration examples
2. Running the tool calls exactly as shown
3. Observing the responses and adapting to your use case

The examples include both successful operations and error scenarios to help you understand the full range of system behavior.