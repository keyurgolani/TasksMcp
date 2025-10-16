# Agent Integration Examples

## Overview

This document provides practical examples of integrating AI agents with the Task MCP Unified system. These examples demonstrate various agent roles, configuration patterns, and workflow automation scenarios.

## Single Agent Examples

### Personal Productivity Agent

A simple agent setup for individual task management:

```json
{
  "mcpServers": {
    "personal-tasks": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/Documents/tasks"
      },
      "autoApprove": [
        "create_list",
        "get_list",
        "add_task",
        "update_task",
        "complete_task",
        "search_tool",
        "show_tasks"
      ]
    }
  }
}
```

**Usage Pattern:**

```
User: "Create a new project for my website redesign"
Agent: Uses create_list to create "Website Redesign" project

User: "Add tasks for wireframing and design"
Agent: Uses add_task to create structured tasks with priorities and exit criteria

User: "Show me what I can work on today"
Agent: Uses get_ready_tasks to find actionable items
```

### Development Assistant Agent

Specialized for software development workflows:

```json
{
  "mcpServers": {
    "dev-assistant": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./project-tasks"
      },
      "autoApprove": [
        "get_ready_tasks",
        "analyze_task_dependencies",
        "set_task_dependencies",
        "add_task_tags",
        "update_task",
        "search_tool"
      ]
    }
  }
}
```

**Agent Prompt Template Example:**

```
You are a development assistant working on {{list.title}}.

Current task: {{task.title}}
Priority: {{task.priority}}/5
Tags: {{task.tags}}

Focus on:
- Code quality and testing
- Documentation updates
- Dependency management
- Performance considerations

Always update task progress and add relevant tags.
```

## Multi-Agent Team Examples

### Agile Development Team

Multiple agents working on the same project with different roles:

#### Project Manager Agent

```json
{
  "mcpServers": {
    "project-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/project-data",
        "MCP_LOG_LEVEL": "info"
      },
      "autoApprove": [
        "create_list",
        "list_all_lists",
        "analyze_task_dependencies",
        "get_ready_tasks",
        "set_task_priority",
        "update_list_metadata"
      ]
    }
  }
}
```

#### Frontend Developer Agent

```json
{
  "mcpServers": {
    "frontend-dev": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/project-data",
        "MCP_LOG_LEVEL": "debug"
      },
      "autoApprove": [
        "get_ready_tasks",
        "complete_task",
        "update_task",
        "add_task_tags",
        "search_tool"
      ]
    }
  }
}
```

#### Backend Developer Agent

```json
{
  "mcpServers": {
    "backend-dev": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/project-data",
        "MCP_LOG_LEVEL": "debug"
      },
      "autoApprove": [
        "get_ready_tasks",
        "complete_task",
        "update_task",
        "set_task_dependencies",
        "analyze_task_dependencies"
      ]
    }
  }
}
```

#### QA Tester Agent

```json
{
  "mcpServers": {
    "qa-tester": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/project-data",
        "MCP_LOG_LEVEL": "info"
      },
      "autoApprove": [
        "search_tool",
        "get_ready_tasks",
        "add_task",
        "update_task",
        "set_task_exit_criteria",
        "update_exit_criteria"
      ]
    }
  }
}
```

### Workflow Coordination Example

**Morning Standup Automation:**

```javascript
// Project Manager Agent workflow
async function morningStandup() {
  // Get project overview
  const projects = await mcpCall('list_all_lists', {});

  for (const project of projects) {
    // Analyze dependencies and blockers
    const analysis = await mcpCall('analyze_task_dependencies', {
      listId: project.id,
      format: 'analysis',
    });

    // Get ready tasks for assignment
    const readyTasks = await mcpCall('get_ready_tasks', {
      listId: project.id,
      limit: 10,
    });

    // Generate daily report
    console.log(`Project: ${project.title}`);
    console.log(`Ready tasks: ${readyTasks.length}`);
    console.log(`Blockers: ${analysis.blockedTasks.length}`);
  }
}
```

## Specialized Agent Roles

### Code Review Agent

Focuses on quality assurance and code review tasks:

```json
{
  "mcpServers": {
    "code-reviewer": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/review-tasks"
      },
      "autoApprove": [
        "search_tool",
        "add_task",
        "update_task",
        "complete_task",
        "add_task_tags",
        "set_task_exit_criteria"
      ]
    }
  }
}
```

**Agent Prompt Template:**

```
You are a code review specialist for {{list.title}}.

Review task: {{task.title}}
Priority: {{task.priority}}/5

Focus areas:
- Code quality and standards
- Security vulnerabilities
- Performance implications
- Test coverage
- Documentation completeness

Always set comprehensive exit criteria for review tasks.
```

### Documentation Agent

Specialized for documentation and knowledge management:

```json
{
  "mcpServers": {
    "docs-agent": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/docs-tasks"
      },
      "autoApprove": [
        "search_tool",
        "add_task",
        "update_task",
        "complete_task",
        "get_ready_tasks"
      ]
    }
  }
}
```

### DevOps Agent

Handles infrastructure and deployment tasks:

```json
{
  "mcpServers": {
    "devops-agent": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/infra-tasks"
      },
      "autoApprove": [
        "get_ready_tasks",
        "analyze_task_dependencies",
        "set_task_dependencies",
        "update_task",
        "complete_task"
      ]
    }
  }
}
```

## Agent Workflow Patterns

### Task Creation Pattern

```javascript
// Agent creates comprehensive tasks with proper structure
async function createDevelopmentTask(title, description, context) {
  const task = await mcpCall('add_task', {
    listId: context.projectId,
    title: title,
    description: `
ACTION PLAN:
1. Research existing solutions and patterns
2. Design implementation approach
3. Write code with comprehensive tests
4. Update documentation
5. Code review and refinement

CONTEXT:
${context.background}

CONSIDERATIONS:
- Performance requirements
- Security implications
- Maintainability
- Integration points
    `,
    priority: context.priority || 3,
    tags: context.tags || ['development'],
    estimatedDuration: context.estimatedDuration || 120,
    exitCriteria: [
      'Implementation completed and tested',
      'Code review passed',
      'Documentation updated',
      'Integration tests passing',
    ],
  });

  return task;
}
```

### Progress Tracking Pattern

```javascript
// Agent updates task progress systematically
async function updateTaskProgress(taskId, listId, progress) {
  // Update task description with progress
  await mcpCall('update_task', {
    listId: listId,
    taskId: taskId,
    description: `
PROGRESS UPDATE:
✅ COMPLETED: ${progress.completed.join(', ')}
🔄 IN PROGRESS: ${progress.inProgress}
⏳ NEXT: ${progress.next.join(', ')}
🚧 BLOCKERS: ${progress.blockers.join(', ') || 'None'}

STATUS: ${progress.percentage}% complete
TIME: ${progress.timeSpent}/${progress.timeEstimated} minutes
    `,
  });

  // Update exit criteria status
  for (const criteria of progress.exitCriteria) {
    await mcpCall('update_exit_criteria', {
      listId: listId,
      taskId: taskId,
      criteriaId: criteria.id,
      isMet: criteria.isMet,
      notes: criteria.notes,
    });
  }
}
```

### Dependency Management Pattern

```javascript
// Agent manages task dependencies intelligently
async function setupTaskDependencies(projectId) {
  // Get all tasks in project
  const project = await mcpCall('get_list', {
    listId: projectId,
  });

  // Analyze and set up logical dependencies
  const setupTasks = project.tasks.filter(t => t.tags.includes('setup'));
  const developmentTasks = project.tasks.filter(t =>
    t.tags.includes('development')
  );
  const testingTasks = project.tasks.filter(t => t.tags.includes('testing'));

  // Development tasks depend on setup
  for (const devTask of developmentTasks) {
    await mcpCall('set_task_dependencies', {
      listId: projectId,
      taskId: devTask.id,
      dependencyIds: setupTasks.map(t => t.id),
    });
  }

  // Testing tasks depend on development
  for (const testTask of testingTasks) {
    await mcpCall('set_task_dependencies', {
      listId: projectId,
      taskId: testTask.id,
      dependencyIds: developmentTasks.map(t => t.id),
    });
  }
}
```

## Agent Communication Patterns

### Status Broadcasting

```javascript
// Agent broadcasts status to team
async function broadcastStatus(agentRole, projectId) {
  const readyTasks = await mcpCall('get_ready_tasks', {
    listId: projectId,
    limit: 5,
  });

  const myTasks = readyTasks.filter(task =>
    task.tags.includes(agentRole.toLowerCase())
  );

  console.log(`[${agentRole}] Ready to work on ${myTasks.length} tasks:`);
  myTasks.forEach(task => {
    console.log(`- ${task.title} (Priority: ${task.priority})`);
  });
}
```

### Handoff Pattern

```javascript
// Agent hands off completed work to next agent
async function handoffTask(taskId, listId, nextAgentRole) {
  // Complete current task
  await mcpCall('complete_task', {
    listId: listId,
    taskId: taskId,
  });

  // Add handoff tag for next agent
  await mcpCall('add_task_tags', {
    listId: listId,
    taskId: taskId,
    tags: [`handoff-to-${nextAgentRole}`, 'ready-for-review'],
  });

  // Update task with handoff notes
  await mcpCall('update_task', {
    listId: listId,
    taskId: taskId,
    description: `
HANDOFF TO ${nextAgentRole.toUpperCase()}:

COMPLETED WORK:
- All exit criteria met
- Code implemented and tested
- Documentation updated

NEXT STEPS FOR ${nextAgentRole}:
- Review implementation
- Validate requirements
- Deploy to staging environment

NOTES:
- Pay attention to performance considerations
- Database migrations included
- API documentation updated
    `,
  });
}
```

## Agent Configuration Best Practices

### Security Configuration

```json
{
  "mcpServers": {
    "secure-agent": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "DATA_DIRECTORY": "/secure/task-data"
      },
      "autoApprove": ["get_list", "search_tool", "show_tasks"],
      "disabledTools": ["delete_list", "remove_task"]
    }
  }
}
```

### Development Configuration

```json
{
  "mcpServers": {
    "dev-agent": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./dev-tasks"
      },
      "autoApprove": [
        "create_list",
        "add_task",
        "update_task",
        "complete_task",
        "search_tool",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ]
    }
  }
}
```

### Performance Configuration

```json
{
  "mcpServers": {
    "high-perf-agent": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "error",
        "DATA_DIRECTORY": "/fast-ssd/tasks"
      },
      "autoApprove": ["get_ready_tasks", "search_tool", "complete_task"]
    }
  }
}
```

## Troubleshooting Agent Integration

### Common Issues

**Agent Can't Access Tasks:**

- Check data directory permissions
- Verify MCP server configuration
- Ensure proper environment variables

**Performance Issues:**

- Use appropriate search limits
- Implement result pagination
- Monitor memory usage

**Coordination Problems:**

- Ensure shared data directories
- Implement proper handoff patterns
- Use consistent tagging strategies

### Debug Configuration

```json
{
  "mcpServers": {
    "debug-agent": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "/tmp/debug-tasks"
      },
      "autoApprove": []
    }
  }
}
```

## Advanced Integration Patterns

### Event-Driven Workflows

```javascript
// Agent responds to task completion events
async function onTaskCompleted(taskId, listId) {
  // Check if this unblocks other tasks
  const analysis = await mcpCall('analyze_task_dependencies', {
    listId: listId,
    format: 'analysis',
  });

  // Notify team of newly available tasks
  const newlyReady = analysis.readyTasks.filter(task =>
    task.dependencies.includes(taskId)
  );

  if (newlyReady.length > 0) {
    console.log(`Task completion unblocked ${newlyReady.length} tasks`);
    // Trigger notifications or assignments
  }
}
```

### Automated Quality Gates

```javascript
// Agent enforces quality standards
async function enforceQualityGates(taskId, listId) {
  const task = await mcpCall('get_list', { listId });
  const targetTask = task.tasks.find(t => t.id === taskId);

  // Check if all exit criteria are met
  const unmetCriteria = targetTask.exitCriteria.filter(c => !c.isMet);

  if (unmetCriteria.length > 0) {
    throw new Error(
      `Cannot complete task: ${unmetCriteria.length} exit criteria not met`
    );
  }

  // Additional quality checks
  if (!targetTask.tags.includes('reviewed')) {
    await mcpCall('add_task_tags', {
      listId: listId,
      taskId: taskId,
      tags: ['needs-review'],
    });
    throw new Error('Task requires review before completion');
  }
}
```

These examples provide a comprehensive foundation for integrating AI agents with the Task MCP Unified system across various roles and scenarios.
