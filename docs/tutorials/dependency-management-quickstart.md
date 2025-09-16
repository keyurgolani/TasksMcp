# Dependency Management Quick Start Guide

Get up and running with task dependencies in the MCP Task Manager in just a few minutes. This guide covers the essential concepts and provides step-by-step examples to help you start managing task relationships effectively.

## What Are Task Dependencies?

Task dependencies define relationships where one task must be completed before another can begin. Think of them as prerequisites or requirements that establish proper work order.

### Real-World Examples

- **Software Development**: "Deploy to production" depends on "Code review" and "Run tests"
- **Content Creation**: "Publish article" depends on "Write draft", "Edit content", and "Create images"
- **Event Planning**: "Send invitations" depends on "Book venue" and "Confirm speakers"
- **Home Renovation**: "Paint walls" depends on "Repair drywall" and "Prime surfaces"

## Core Concepts

### 1. Dependencies vs Dependents

- **Dependencies**: Tasks that must be completed first (prerequisites)
- **Dependents**: Tasks that wait for this task to complete (what depends on this)

```
Task A → Task B → Task C
```
- Task B depends on Task A
- Task C depends on Task B
- Task A has Task B as a dependent
- Task B has Task C as a dependent

### 2. Task Readiness

A task is "ready" when all its dependencies are completed:
- ✅ **Ready**: No incomplete dependencies, can start work
- 🔴 **Blocked**: Has incomplete dependencies, must wait
- ⏳ **In Progress**: Currently being worked on
- ✅ **Completed**: Finished, unblocks dependent tasks

### 3. Critical Path

The longest chain of dependent tasks that determines project completion time. Delays on the critical path delay the entire project.

## Essential Tools

### 1. set_task_dependencies
**Purpose**: Set which tasks this task depends on  
**When to use**: Setting up project structure, changing requirements

### 2. get_ready_tasks  
**Purpose**: Find tasks you can work on right now  
**When to use**: Daily planning, deciding what to do next

### 3. analyze_task_dependencies
**Purpose**: Understand project structure and identify issues  
**When to use**: Project health checks, troubleshooting bottlenecks

## Step-by-Step Tutorial

### Step 1: Create Your First Project with Dependencies

Let's create a simple website project to demonstrate dependency management.

#### 1.1 Create the Project List

```json
{
  "name": "create_list",
  "arguments": {
    "title": "Simple Website Project",
    "description": "Build a basic company website with contact form"
  }
}
```

#### 1.2 Add Tasks (No Dependencies Yet)

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "your-list-id-here",
    "title": "Design wireframes",
    "description": "Create basic layout and page structure",
    "priority": 4,
    "estimatedDuration": 120
  }
}
```

```json
{
  "name": "add_task", 
  "arguments": {
    "listId": "your-list-id-here",
    "title": "Write HTML structure",
    "description": "Build semantic HTML for all pages",
    "priority": 4,
    "estimatedDuration": 180
  }
}
```

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "your-list-id-here", 
    "title": "Add CSS styling",
    "description": "Style the website with CSS",
    "priority": 3,
    "estimatedDuration": 240
  }
}
```

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "your-list-id-here",
    "title": "Implement contact form",
    "description": "Add working contact form with validation",
    "priority": 3,
    "estimatedDuration": 150
  }
}
```

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "your-list-id-here",
    "title": "Test website",
    "description": "Test all functionality and fix bugs",
    "priority": 5,
    "estimatedDuration": 90
  }
}
```

#### 1.3 Set Up Dependencies

Now let's establish the logical order:

**HTML depends on wireframes:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "your-list-id-here",
    "taskId": "html-task-id",
    "dependencyIds": ["wireframes-task-id"]
  }
}
```

**CSS depends on HTML:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "your-list-id-here", 
    "taskId": "css-task-id",
    "dependencyIds": ["html-task-id"]
  }
}
```

**Contact form depends on HTML:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "your-list-id-here",
    "taskId": "contact-form-task-id", 
    "dependencyIds": ["html-task-id"]
  }
}
```

**Testing depends on CSS and contact form:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "your-list-id-here",
    "taskId": "testing-task-id",
    "dependencyIds": ["css-task-id", "contact-form-task-id"]
  }
}
```

### Step 2: Find Ready Tasks

Now let's see what we can work on:

```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "your-list-id-here",
    "limit": 5
  }
}
```

**Expected Result:**
```json
{
  "readyTasks": [
    {
      "id": "wireframes-task-id",
      "title": "Design wireframes",
      "status": "pending",
      "priority": 4
    }
  ],
  "nextActions": [
    "Start with high-priority tasks: \"Design wireframes\"",
    "1 task is ready to work on. Focus on one at a time for best results."
  ]
}
```

Only "Design wireframes" is ready because it has no dependencies!

### Step 3: Analyze Project Structure

Let's get an overview of our project:

```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "your-list-id-here"
  }
}
```

**Expected Result:**
```json
{
  "summary": {
    "totalTasks": 5,
    "readyTasks": 1,
    "blockedTasks": 4,
    "tasksWithDependencies": 4
  },
  "criticalPath": [
    "wireframes-task-id",
    "html-task-id", 
    "css-task-id",
    "testing-task-id"
  ],
  "recommendations": [
    "Focus on the critical path: Start with \"Design wireframes\" as it affects 3 other tasks.",
    "Project is in early stages. Focus on completing foundational tasks to unlock more work."
  ]
}
```

### Step 4: Complete Tasks and See Progress

Let's simulate completing the wireframes:

```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "your-list-id-here",
    "taskId": "wireframes-task-id"
  }
}
```

Now check ready tasks again:

```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "your-list-id-here"
  }
}
```

**Expected Result:**
```json
{
  "readyTasks": [
    {
      "id": "html-task-id",
      "title": "Write HTML structure",
      "status": "pending",
      "priority": 4
    }
  ],
  "nextActions": [
    "Begin with: \"Write HTML structure\"",
    "1 task is ready to work on."
  ]
}
```

Great! Completing wireframes unlocked the HTML task.

## Common Patterns

### 1. Sequential Dependencies (Chain)
Tasks must be done in order:
```
A → B → C → D
```
Example: Design → Code → Test → Deploy

### 2. Parallel Dependencies (Fan-out)
One task enables multiple others:
```
    A
   ↙ ↓ ↘
  B  C  D
```
Example: Setup → (Frontend, Backend, Database)

### 3. Convergent Dependencies (Fan-in)
Multiple tasks required for one:
```
A ↘
B → D
C ↗
```
Example: (Code, Tests, Docs) → Deploy

### 4. Complex Networks
Real projects often combine patterns:
```
A → B → D → F
A → C → E → F
```

## Best Practices

### 1. Start Simple
- Begin with obvious dependencies (what clearly must come first)
- Add complexity gradually as you understand the workflow
- Don't over-engineer - not every relationship needs a dependency

### 2. Keep Dependencies Meaningful
- Only create dependencies for real prerequisites
- Avoid dependencies for convenience or preference
- Ask: "Can this task literally not start until the other is done?"

### 3. Break Down Large Tasks
- Tasks with many dependencies are often too large
- Split complex tasks into smaller, more manageable pieces
- Aim for tasks that can be completed in 1-4 hours

### 4. Regular Health Checks
- Use `analyze_task_dependencies` weekly for project overview
- Check for bottlenecks (tasks blocking many others)
- Look for tasks that have been blocked for too long

### 5. Use Ready Tasks for Planning
- Start each work session with `get_ready_tasks`
- Focus on high-priority ready tasks first
- Don't start blocked tasks - complete dependencies instead

## Troubleshooting Common Issues

### "No tasks are ready!"

**Cause**: All tasks are blocked by dependencies or in progress

**Solutions**:
1. Check `analyze_task_dependencies` for bottlenecks
2. Look for in-progress tasks that can be completed
3. Review if some dependencies are no longer needed
4. Consider breaking down large blocking tasks

### "Circular dependency detected"

**Cause**: Task A depends on B, B depends on C, C depends on A

**Solutions**:
1. Review the dependency chain shown in the error
2. Remove one dependency to break the loop
3. Consider if tasks should be combined or reordered
4. Use task descriptions to clarify the actual workflow

### "Too many dependencies per task"

**Cause**: Task has more than 10 dependencies (system limit)

**Solutions**:
1. Break the large task into smaller pieces
2. Group related dependencies into intermediate tasks
3. Review if all dependencies are truly necessary
4. Consider creating milestone tasks to reduce complexity

### "Project feels overwhelming"

**Cause**: Too many tasks, complex dependencies, unclear priorities

**Solutions**:
1. Use `analyze_task_dependencies` to see the big picture
2. Focus only on ready tasks - ignore blocked ones for now
3. Complete tasks on the critical path first
4. Consider archiving non-essential tasks

## Next Steps

### Immediate Actions
1. **Try the tutorial** - Follow the step-by-step example above
2. **Start with one project** - Don't try to convert everything at once
3. **Focus on ready tasks** - Use `get_ready_tasks` for daily planning

### Advanced Features
1. **Enhanced filtering** - Use dependency filters in `filter_tasks`
2. **Bulk operations** - Set up multiple dependencies efficiently
3. **Integration patterns** - Combine with other MCP tools

### Learning Resources
- [Complete Dependency Management Examples](../examples/06-dependency-management-examples.md)
- [API Reference](../api/dependency-management.md)
- [Enhanced Tool Features](../api/enhanced-tools.md)

## Quick Reference

### Essential Commands

```bash
# Daily workflow
get_ready_tasks → See what you can work on
complete_task → Mark task done, unblocks dependents
analyze_task_dependencies → Weekly project health check

# Setup workflow  
add_task → Create tasks first
set_task_dependencies → Establish relationships
get_ready_tasks → Verify setup worked

# Troubleshooting
analyze_task_dependencies → Identify issues
filter_tasks isBlocked=true → Find blocked tasks
set_task_dependencies dependencyIds=[] → Remove all dependencies
```

### Key Concepts

- **Ready** = No incomplete dependencies, can start now
- **Blocked** = Waiting for dependencies to complete
- **Critical Path** = Longest chain, determines project timeline
- **Bottleneck** = Task blocking multiple others

---

**Ready to start?** Try the tutorial above with a real project, or explore the [complete examples](../examples/06-dependency-management-examples.md) for more advanced scenarios.

The dependency management system transforms chaotic task lists into organized, actionable workflows. Start simple, build gradually, and let the tools guide your daily work planning.