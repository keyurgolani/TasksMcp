# MCP Task Manager Examples

> **Note**: The comprehensive examples have been moved to the [docs/examples/](../docs/examples/) directory for better organization. This directory now contains a simplified overview.

For complete examples and documentation, see:
- **[docs/examples/basic.md](../docs/examples/basic.md)** - Basic usage examples
- **[docs/examples/advanced.md](../docs/examples/advanced.md)** - Advanced workflows and multi-agent patterns  
- **[docs/examples/configuration.md](../docs/examples/configuration.md)** - Configuration examples for different environments

## Quick Reference

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

## Example Data

All examples use realistic project data:

### Development Project Alpha
- **Type**: Web application development
- **Tasks**: Environment setup, database design, API implementation, frontend development, testing
- **Dependencies**: Sequential and parallel development patterns
- **Tags**: setup, database, backend, frontend, testing, etc.

### Mobile App Development
- **Type**: Cross-platform mobile application
- **Framework**: React Native
- **Focus**: Mobile-specific development workflow

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

### Sprint Planning
1. **Sprint preparation**: Filter tasks by priority and readiness
2. **Capacity planning**: Use time estimates for sprint sizing
3. **Dependency management**: Ensure tasks can be completed in order
4. **Progress tracking**: Monitor completion rates and blockers

## Integration Examples

### AI Agent Integration
The examples show how different AI agents can use the task manager:
- **Project managers**: Focus on planning and dependency analysis
- **Developers**: Focus on ready tasks and completion tracking
- **Team leads**: Focus on progress monitoring and bottleneck identification

### Multi-Agent Coordination
Examples demonstrate how multiple agents can work together:
- Shared task lists for team coordination
- Role-based auto-approval configurations
- Collaborative dependency management

## Best Practices Summary

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

### Configuration
- Use appropriate auto-approval settings
- Configure logging for your environment
- Set up monitoring for production use
- Use environment-specific configurations

## Testing the Examples

All examples in this directory are based on actual testing of the MCP Task Manager. You can reproduce these examples by:

1. Setting up the MCP server as shown in the configuration examples
2. Running the tool calls exactly as shown
3. Observing the responses and adapting to your use case

The examples include both successful operations and error scenarios to help you understand the full range of system behavior.

## Contributing Examples

When adding new examples:
1. Test all tool calls to ensure they work
2. Include both request and response data
3. Provide context and explanation
4. Follow the established format and style
5. Update this README with new content

## Support

For questions about these examples or the MCP Task Manager:
1. Review the relevant example file
2. Check the main documentation
3. Test the examples in your environment
4. Refer to the troubleshooting guides