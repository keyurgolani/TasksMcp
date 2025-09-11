# Getting Started Tutorial

Welcome to the MCP Task Manager! This step-by-step tutorial will guide you through installation, configuration, and your first tasks. By the end, you'll have a fully functional task management system integrated with your AI agent.

## What You'll Learn

- How to install and configure the MCP Task Manager
- How to integrate with Claude Desktop or Kiro IDE
- How to create and manage todo lists
- How to use AI-powered task complexity analysis
- Best practices for task organization and workflow

## Prerequisites

Before we begin, make sure you have:

- **Node.js 18.0.0+** installed ([Download here](https://nodejs.org/))
- **Git** for cloning the repository
- **An MCP client** (Claude Desktop or Kiro IDE)
- **Basic command line knowledge**

Let's verify your setup:

```bash
# Check Node.js version
node --version
# Should show v18.0.0 or higher

# Check npm
npm --version
# Should show a version number

# Check Git
git --version
# Should show Git version
```

## Step 1: Installation

### 1.1 Clone and Install

```bash
# Clone the repository
git clone https://github.com/keyurgolani/task-list-mcp.git
cd task-list-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### 1.2 Verify Installation

```bash
# Run the test suite
npm run test:mcp
```

You should see output like this:

```
🧪 MCP Task Manager Server Test
================================

1. Running health check...
   ✅ Health check passed

2. Testing MCP protocol...
   ✅ Tools list request successful
   📋 Found 7 tools: create_todo_list, get_todo_list, update_todo_list, list_todo_lists, delete_todo_list, analyze_task_complexity, search_todo_lists
   ✅ Create todo list request successful
   📝 Created list: Test List (ID: ...)

🎉 All MCP protocol tests passed!
```

If you see this, your installation is successful! 🎉

## Step 2: Choose Your MCP Client

### Option A: Claude Desktop (Recommended for AI Conversations)

Claude Desktop provides the most natural conversational interface for task management.

#### 2.1 Locate Configuration File

- **macOS**: `~/Library/Application Support/Claude/mcp.json`
- **Windows**: `%APPDATA%/Claude/mcp.json`

#### 2.2 Add Configuration

Create or edit the file with this configuration:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/REPLACE/WITH/YOUR/PATH/task-list-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "STORAGE_TYPE": "file",
        "DATA_DIRECTORY": "./claude-tasks"
      }
    }
  }
}
```

**Important**: Replace `/REPLACE/WITH/YOUR/PATH/task-list-mcp` with your actual path:

```bash
# Get your current path
pwd
# Copy this path and use it in the configuration
```

#### 2.3 Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

### Option B: Kiro IDE (Recommended for Development)

Kiro IDE provides excellent integration for development workflows.

#### 2.1 Create Workspace Configuration

In your workspace, create `.kiro/settings/mcp.json`:

```bash
# Create the directory
mkdir -p .kiro/settings

# Create the configuration file
cat > .kiro/settings/mcp.json << 'EOF'
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/REPLACE/WITH/YOUR/PATH/task-list-mcp",
      "env": {
        "NODE_ENV": "development",
        "STORAGE_TYPE": "file",
        "DATA_DIRECTORY": "./.kiro/task-data"
      },
      "disabled": false,
      "autoApprove": [
        "create_todo_list",
        "get_todo_list",
        "update_todo_list",
        "list_todo_lists",
        "delete_todo_list",
        "analyze_task_complexity",
        "search_todo_lists"
      ]
    }
  }
}
EOF
```

#### 2.2 Restart Kiro IDE

Restart Kiro or reload the MCP server configuration.

## Step 3: Your First Todo List

Now let's create your first todo list! We'll walk through this with both Claude Desktop and Kiro IDE.

### With Claude Desktop

Open Claude Desktop and start a new conversation:

```
Hi! I'd like to create a todo list for learning the MCP Task Manager. Can you help me set up a list with some basic learning tasks?
```

Claude should respond by creating a todo list. Here's what happens behind the scenes:

1. Claude analyzes your request
2. Uses the `create_todo_list` tool
3. Creates a structured list with appropriate tasks
4. Returns the list details with ID and progress tracking

### With Kiro IDE

In Kiro, you can use the MCP tools directly:

```javascript
// Create your first todo list
const result = await mcp_task_manager_create_todo_list({
  title: "Learning MCP Task Manager",
  description: "Tasks to master the MCP Task Manager system",
  context: "learning",
  tasks: [
    {
      title: "Complete the getting started tutorial",
      description: "Follow the step-by-step tutorial",
      priority: 5,
      estimatedDuration: 60,
      tags: ["tutorial", "learning"]
    },
    {
      title: "Create a project todo list",
      description: "Set up a real project with tasks",
      priority: 4,
      estimatedDuration: 30,
      tags: ["practice", "project"]
    },
    {
      title: "Try task complexity analysis",
      description: "Use AI to analyze and break down complex tasks",
      priority: 4,
      estimatedDuration: 45,
      tags: ["ai", "analysis"]
    },
    {
      title: "Explore advanced features",
      description: "Learn about dependencies, filtering, and search",
      priority: 3,
      estimatedDuration: 90,
      tags: ["advanced", "features"]
    }
  ]
});

console.log('Created todo list:', result);
```

## Step 4: Understanding Your Todo List

Let's examine what was created. Your todo list includes:

### Basic Information
- **ID**: Unique identifier for the list
- **Title**: "Learning MCP Task Manager"
- **Description**: Brief description of the list purpose
- **Context**: "learning" (helps organize related lists)

### Tasks
Each task has:
- **Title**: What needs to be done
- **Description**: Additional details
- **Status**: Current state (pending, in_progress, completed, blocked, cancelled)
- **Priority**: 1-5 scale (5 = highest priority)
- **Created/Updated timestamps**: When the task was created and last modified
- **Tags**: Labels for organization and filtering
- **Estimated Duration**: Time estimate in minutes

### Analytics
- **Total Items**: Number of tasks in the list
- **Completed Items**: Number of finished tasks
- **Progress**: Completion percentage (0-100%)
- **Real-time metrics**: Velocity, completion rates, etc.

## Step 5: Managing Tasks

Now let's learn how to manage your tasks effectively.

### 5.1 Viewing Your Todo List

**With Claude Desktop:**
```
Show me my learning todo list with current progress
```

**With Kiro IDE:**
```javascript
// Get the todo list (replace with your actual list ID)
const listId = "your-list-id-here";
const todoList = await mcp_task_manager_get_todo_list({
  listId: listId,
  includeCompleted: true
});

console.log(`Progress: ${todoList.progress}% (${todoList.completedItems}/${todoList.totalItems})`);
console.log('Tasks:');
todoList.items.forEach((item, index) => {
  const status = item.status === 'completed' ? '✅' : '⏳';
  console.log(`${index + 1}. ${status} ${item.title} (Priority: ${item.priority})`);
});
```

### 5.2 Updating Task Status

Let's mark the first task as completed:

**With Claude Desktop:**
```
I've finished the getting started tutorial. Please mark that task as completed.
```

**With Kiro IDE:**
```javascript
// Update task status to completed
const updatedList = await mcp_task_manager_update_todo_list({
  listId: "your-list-id",
  action: "update_status",
  itemId: "your-task-id",
  itemData: {
    status: "completed"
  }
});

console.log(`Updated! Progress is now ${updatedList.progress}%`);
```

### 5.3 Adding New Tasks

**With Claude Desktop:**
```
Add a new task to my learning list: "Set up automated backups" with high priority
```

**With Kiro IDE:**
```javascript
// Add a new task
const updatedList = await mcp_task_manager_update_todo_list({
  listId: "your-list-id",
  action: "add_item",
  itemData: {
    title: "Set up automated backups",
    description: "Configure automatic backup system for task data",
    priority: 4,
    estimatedDuration: 45,
    tags: ["setup", "backup", "maintenance"]
  }
});

console.log(`Added new task! List now has ${updatedList.totalItems} tasks`);
```

## Step 6: AI-Powered Task Analysis

One of the most powerful features is AI-powered task complexity analysis. Let's try it!

### 6.1 Analyze a Complex Task

**With Claude Desktop:**
```
I need to build a web application with user authentication, a dashboard, and real-time notifications. Can you analyze the complexity and create a project plan?
```

**With Kiro IDE:**
```javascript
// Analyze task complexity
const analysis = await mcp_task_manager_analyze_task_complexity({
  taskDescription: "Build a web application with user authentication, dashboard, and real-time notifications using React, Node.js, and WebSocket",
  context: "web-development",
  autoCreate: true,
  generateOptions: {
    style: "technical",
    maxTasks: 10,
    includeTests: true,
    includeDependencies: true
  }
});

console.log(`Complexity Score: ${analysis.analysis.complexity.overall}/10`);
console.log(`Confidence: ${(analysis.analysis.confidence * 100).toFixed(1)}%`);
console.log(`Estimated Duration: ${Math.round(analysis.analysis.estimatedDuration / 60)} hours`);

if (analysis.autoCreated) {
  console.log(`Created project plan: ${analysis.createdList.title}`);
  console.log(`Generated ${analysis.createdList.totalItems} tasks`);
}
```

### 6.2 Understanding the Analysis

The AI analyzes multiple factors:

- **Technical Complexity** (9/10): Multiple technologies, authentication, real-time features
- **Scope** (8/10): Large application with multiple components
- **Dependencies** (7/10): Sequential development phases
- **Risk** (6/10): Integration challenges and potential issues

Based on this analysis, it automatically creates a structured project plan with:
- Architecture and planning tasks
- Development phases
- Testing and validation steps
- Deployment and monitoring tasks

## Step 7: Advanced Features

### 7.1 Task Dependencies

You can create tasks that depend on other tasks:

```javascript
// Create a task that depends on another task
await mcp_task_manager_update_todo_list({
  listId: "your-list-id",
  action: "add_item",
  itemData: {
    title: "Deploy to production",
    description: "Deploy the application to production environment",
    priority: 3,
    dependencies: ["testing-task-id", "security-review-task-id"],
    tags: ["deployment", "production"]
  }
});
```

### 7.2 Filtering and Search

Find specific tasks across all your lists:

```javascript
// Search for tasks related to testing
const searchResults = await mcp_task_manager_search_todo_lists({
  query: "testing",
  filters: {
    status: ["pending", "in_progress"],
    priority: [4, 5]
  },
  sorting: {
    field: "priority",
    direction: "desc"
  }
});

console.log(`Found ${searchResults.totalCount} testing tasks`);
```

### 7.3 List Management

Organize your work with multiple lists:

```javascript
// List all your todo lists
const allLists = await mcp_task_manager_list_todo_lists({
  context: "learning",
  status: "active"
});

console.log(`You have ${allLists.length} active learning lists`);
allLists.forEach(list => {
  console.log(`- ${list.title}: ${list.progress}% complete`);
});
```

## Step 8: Best Practices

### 8.1 Organizing with Contexts

Use contexts to group related projects:

- `learning` - Educational and tutorial projects
- `work` - Professional projects
- `personal` - Personal tasks and goals
- `project-name` - Specific project contexts

### 8.2 Effective Task Writing

**Good task titles:**
- ✅ "Implement user authentication with JWT"
- ✅ "Write unit tests for user service"
- ✅ "Deploy application to staging environment"

**Poor task titles:**
- ❌ "Fix stuff"
- ❌ "Work on project"
- ❌ "Do things"

### 8.3 Priority Guidelines

- **Priority 5 (Critical)**: Blockers, urgent deadlines, critical bugs
- **Priority 4 (High)**: Important features, scheduled deliverables
- **Priority 3 (Medium)**: Regular development tasks, improvements
- **Priority 2 (Low)**: Nice-to-have features, optimizations
- **Priority 1 (Minimal)**: Documentation, cleanup, future ideas

### 8.4 Using Tags Effectively

Organize tasks with meaningful tags:

- **Type tags**: `bug`, `feature`, `documentation`, `testing`
- **Technology tags**: `react`, `nodejs`, `database`, `api`
- **Status tags**: `urgent`, `blocked`, `review-needed`
- **Area tags**: `frontend`, `backend`, `devops`, `design`

## Step 9: Monitoring Progress

### 9.1 Regular Reviews

Check your progress regularly:

**With Claude Desktop:**
```
Show me a summary of all my active projects and their progress
```

**With Kiro IDE:**
```javascript
// Get progress summary
const allLists = await mcp_task_manager_list_todo_lists({
  status: "active"
});

console.log("📊 Progress Summary:");
console.log("==================");

let totalTasks = 0;
let completedTasks = 0;

allLists.forEach(list => {
  totalTasks += list.totalItems;
  completedTasks += list.completedItems;
  
  console.log(`${list.title}: ${list.progress}% (${list.completedItems}/${list.totalItems})`);
});

const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
console.log(`\nOverall Progress: ${overallProgress}% (${completedTasks}/${totalTasks} tasks)`);
```

### 9.2 Identifying Bottlenecks

Look for:
- Tasks stuck in "in_progress" status for too long
- High-priority tasks that haven't been started
- Tasks with unmet dependencies
- Lists with low completion rates

## Step 10: Next Steps

Congratulations! You've completed the getting started tutorial. Here's what to explore next:

### 10.1 Advanced Tutorials
- [Building Your First Integration](./first-integration.md)
- [Performance Monitoring](./monitoring.md)
- [Advanced Workflows](../examples/advanced-workflows.md)

### 10.2 Documentation
- [API Reference](../api/README.md)
- [MCP Tools Documentation](../api/mcp-tools.md)
- [Troubleshooting Guide](../examples/troubleshooting.md)

### 10.3 Real-World Usage
- Set up task management for your current projects
- Integrate with your development workflow
- Create custom automation scripts
- Explore team collaboration features

## Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check Node.js version
node --version

# Rebuild the project
npm run build

# Check for errors
node dist/index.js
```

**MCP client can't connect:**
- Verify absolute paths in configuration
- Check file permissions: `chmod +x dist/index.js`
- Restart your MCP client after configuration changes

**Tasks not saving:**
- Check data directory permissions
- Verify disk space: `df -h`
- Run health check: `node dist/health-check.js`

### Getting Help

If you encounter issues:

1. Check the [FAQ](../reference/faq.md)
2. Review the [Troubleshooting Guide](../examples/troubleshooting.md)
3. Run the health check: `node dist/health-check.js`
4. Enable debug logging: `NODE_ENV=development node dist/index.js`

## Summary

You've successfully:

- ✅ Installed and configured the MCP Task Manager
- ✅ Created your first todo list
- ✅ Learned to manage tasks and track progress
- ✅ Explored AI-powered task analysis
- ✅ Discovered advanced features like dependencies and search
- ✅ Learned best practices for task organization

The MCP Task Manager is now ready to help you organize and track your projects with intelligent AI assistance. Start applying these concepts to your real projects and explore the advanced features as your needs grow.

Happy task managing! 🚀