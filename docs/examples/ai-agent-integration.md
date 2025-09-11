# AI Agent Integration Examples

This guide provides comprehensive examples of integrating the MCP Task Manager with various AI agents and platforms.

## Claude Desktop Integration

### Basic Setup

1. **Configure Claude Desktop**:

```json
// ~/Library/Application Support/Claude/mcp.json (macOS)
// %APPDATA%/Claude/mcp.json (Windows)
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/absolute/path/to/task-list-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "STORAGE_TYPE": "file",
        "DATA_DIRECTORY": "./claude-tasks"
      }
    }
  }
}
```

2. **Restart Claude Desktop**

3. **Test Integration**:

```
User: Create a todo list for my website redesign project

Claude: I'll create a todo list for your website redesign project with some essential tasks.

[Uses create_todo_list tool]

I've created a comprehensive todo list for your website redesign project! Here's what I've set up:

**Website Redesign Project** (ID: abc-123-def)
- 📋 Total: 6 tasks
- ⏳ Progress: 0% (0/6 completed)
- 🎯 Context: web-development

**Tasks Created:**
1. **Conduct user research and analysis** (Priority: High)
   - Survey current users and analyze usage patterns
   - Tags: research, ux, analysis
   - Estimated: 4 hours

2. **Create wireframes and mockups** (Priority: High)
   - Design new layout and user interface mockups
   - Tags: design, wireframes, ui
   - Estimated: 3 hours

[... additional tasks ...]

Would you like me to add more specific tasks or modify any of these?
```

### Advanced Usage Patterns

#### Project Management Workflow

```
User: I'm starting a new React application. Can you analyze the complexity and create a project plan?

Claude: I'll analyze the complexity of building a React application and create a comprehensive project plan for you.

[Uses analyze_task_complexity tool first]

Based on my analysis, building a React application is moderately complex (complexity score: 6/10) with high confidence (85%). Here's what I found:

**Complexity Analysis:**
- Technical complexity: 7/10 (React ecosystem, state management, build tools)
- Scope: 6/10 (Multiple components and features)
- Dependencies: 5/10 (Package management and integration)

[Uses create_todo_list with auto-generated tasks]

I've created a structured project plan with 8 tasks based on the complexity analysis:

**React Application Development** (ID: react-app-456)
- 📋 Total: 8 tasks
- ⏱️ Estimated time: 16 hours
- 🎯 Context: react-development

**Development Phases:**
1. **Project Setup and Configuration** (Priority: Critical)
2. **Component Architecture Design** (Priority: High)
3. **Core Component Implementation** (Priority: High)
4. **State Management Setup** (Priority: Medium)
5. **API Integration** (Priority: Medium)
6. **Testing Implementation** (Priority: Medium)
7. **Performance Optimization** (Priority: Low)
8. **Documentation and Deployment** (Priority: Low)

Each task includes detailed descriptions, estimated durations, and proper dependencies. Would you like me to elaborate on any specific task or adjust the plan?
```

#### Task Status Management

```
User: I finished setting up the React project. Update the status and show me what's next.

Claude: Great progress! Let me update the project status and show you what's next.

[Uses update_todo_list to mark task as completed]
[Uses get_todo_list to retrieve updated status]

**Project Status Updated!** ✅

**React Application Development**
- 📋 Progress: 12.5% (1/8 completed)
- ⏱️ Remaining time: ~14 hours
- 🎯 Recently completed: Project Setup and Configuration

**Next Priority Tasks:**
1. **Component Architecture Design** (Priority: High)
   - Status: Ready to start (no dependencies)
   - Estimated: 2 hours
   - Description: Plan component hierarchy and data flow

2. **Core Component Implementation** (Priority: High)
   - Status: Blocked (depends on architecture design)
   - Estimated: 4 hours

**Recommendation:** Start with the Component Architecture Design task since it's not blocked by dependencies and will unblock the core implementation work.

Would you like me to provide specific guidance on component architecture design, or shall we move on to another task?
```

## Kiro IDE Integration

### Workspace Configuration

1. **Create Workspace MCP Config**:

```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/task-list-mcp",
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
        "analyze_task_complexity",
        "search_todo_lists"
      ]
    }
  }
}
```

2. **Workspace-Specific Task Management**:

Each workspace gets its own isolated task data in `.kiro/task-data/`, ensuring project separation.

### Development Workflow Integration

#### Code Review Workflow

```javascript
// Example: Kiro agent creating code review tasks
async function createCodeReviewTasks(pullRequestInfo) {
  const complexity = await mcp_task_manager_analyze_task_complexity({
    taskDescription: `Code review for PR #${pullRequestInfo.number}: ${pullRequestInfo.title}. 
                     Changes: ${pullRequestInfo.changedFiles} files, 
                     +${pullRequestInfo.additions}/-${pullRequestInfo.deletions} lines`,
    context: `code-review-${pullRequestInfo.repo}`,
    generateOptions: {
      style: 'technical',
      maxTasks: 6,
      includeTests: true
    }
  });

  if (complexity.analysis.isComplex) {
    const reviewList = await mcp_task_manager_create_todo_list({
      title: `Code Review: PR #${pullRequestInfo.number}`,
      description: `Review tasks for ${pullRequestInfo.title}`,
      context: `code-review-${pullRequestInfo.repo}`,
      tasks: complexity.analysis.suggestedTasks.map(task => ({
        title: task,
        priority: 4,
        tags: ['code-review', 'pr', pullRequestInfo.number.toString()]
      }))
    });

    return reviewList;
  }

  // Simple review for non-complex changes
  return await mcp_task_manager_create_todo_list({
    title: `Code Review: PR #${pullRequestInfo.number}`,
    context: `code-review-${pullRequestInfo.repo}`,
    tasks: [
      {
        title: 'Review code changes',
        priority: 3,
        tags: ['code-review', 'pr']
      },
      {
        title: 'Test functionality',
        priority: 3,
        tags: ['testing', 'pr']
      },
      {
        title: 'Approve or request changes',
        priority: 2,
        tags: ['approval', 'pr']
      }
    ]
  });
}
```

#### Sprint Planning Integration

```javascript
// Example: Sprint planning with task breakdown
async function createSprintTasks(sprintInfo) {
  const sprintList = await mcp_task_manager_create_todo_list({
    title: `Sprint ${sprintInfo.number}: ${sprintInfo.name}`,
    description: `Tasks for ${sprintInfo.duration}-week sprint`,
    context: `sprint-${sprintInfo.number}`,
    tasks: []
  });

  // Analyze each user story for complexity
  for (const story of sprintInfo.userStories) {
    const analysis = await mcp_task_manager_analyze_task_complexity({
      taskDescription: story.description,
      context: `sprint-${sprintInfo.number}`,
      autoCreate: false,
      generateOptions: {
        style: 'technical',
        maxTasks: 5
      }
    });

    // Add story and subtasks to sprint
    await mcp_task_manager_update_todo_list({
      listId: sprintList.id,
      action: 'add_item',
      itemData: {
        title: story.title,
        description: story.description,
        priority: story.priority,
        estimatedDuration: analysis.analysis.estimatedDuration,
        tags: ['user-story', `story-${story.id}`]
      }
    });

    // Add subtasks if complex
    if (analysis.analysis.isComplex) {
      for (const subtask of analysis.analysis.suggestedTasks) {
        await mcp_task_manager_update_todo_list({
          listId: sprintList.id,
          action: 'add_item',
          itemData: {
            title: subtask,
            priority: story.priority - 1,
            tags: ['subtask', `story-${story.id}`],
            dependencies: [] // Could link to parent story
          }
        });
      }
    }
  }

  return sprintList;
}
```

## Custom MCP Client Integration

### Node.js Client Example

```javascript
// custom-mcp-client.js
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class MCPTaskManagerClient extends EventEmitter {
  constructor(serverPath) {
    super();
    this.serverPath = serverPath;
    this.server = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    this.server = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stdout.on('data', (data) => {
      this.handleResponse(data.toString());
    });

    this.server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    // Initialize connection
    await this.listTools();
  }

  async callTool(name, arguments_) {
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: arguments_ }
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async listTools() {
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/list'
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  handleResponse(data) {
    try {
      const response = JSON.parse(data);
      const pending = this.pendingRequests.get(response.id);
      
      if (pending) {
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      console.error('Failed to parse response:', error);
    }
  }

  disconnect() {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }
}

// Usage example
async function main() {
  const client = new MCPTaskManagerClient('./dist/index.js');
  
  try {
    await client.connect();
    
    // Create a todo list
    const result = await client.callTool('create_todo_list', {
      title: 'API Development',
      description: 'REST API development tasks',
      context: 'backend-project',
      tasks: [
        {
          title: 'Design API endpoints',
          priority: 5,
          tags: ['api', 'design']
        },
        {
          title: 'Implement authentication',
          priority: 4,
          tags: ['auth', 'security']
        }
      ]
    });
    
    console.log('Created todo list:', JSON.parse(result.content[0].text));
    
    // Get the list back
    const listId = JSON.parse(result.content[0].text).id;
    const retrieved = await client.callTool('get_todo_list', {
      listId: listId
    });
    
    console.log('Retrieved list:', JSON.parse(retrieved.content[0].text));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.disconnect();
  }
}

main();
```

### Python Client Example

```python
# custom_mcp_client.py
import json
import subprocess
import threading
import queue
from typing import Dict, Any, Optional

class MCPTaskManagerClient:
    def __init__(self, server_path: str):
        self.server_path = server_path
        self.process = None
        self.request_id = 0
        self.pending_requests = {}
        self.response_queue = queue.Queue()
        
    def connect(self):
        """Start the MCP server process"""
        self.process = subprocess.Popen(
            ['node', self.server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0
        )
        
        # Start response handler thread
        self.response_thread = threading.Thread(
            target=self._handle_responses,
            daemon=True
        )
        self.response_thread.start()
        
        # Initialize connection
        return self.list_tools()
    
    def _handle_responses(self):
        """Handle responses from the server"""
        while self.process and self.process.poll() is None:
            try:
                line = self.process.stdout.readline()
                if line:
                    response = json.loads(line.strip())
                    self.response_queue.put(response)
            except json.JSONDecodeError:
                continue
            except Exception as e:
                print(f"Response handler error: {e}")
                break
    
    def _send_request(self, method: str, params: Optional[Dict] = None) -> Dict:
        """Send a request and wait for response"""
        self.request_id += 1
        request = {
            'jsonrpc': '2.0',
            'id': self.request_id,
            'method': method
        }
        
        if params:
            request['params'] = params
        
        # Send request
        request_json = json.dumps(request) + '\n'
        self.process.stdin.write(request_json)
        self.process.stdin.flush()
        
        # Wait for response
        while True:
            try:
                response = self.response_queue.get(timeout=30)
                if response.get('id') == self.request_id:
                    if 'error' in response:
                        raise Exception(f"MCP Error: {response['error']}")
                    return response.get('result', {})
            except queue.Empty:
                raise TimeoutError("Request timed out")
    
    def list_tools(self) -> Dict:
        """List available tools"""
        return self._send_request('tools/list')
    
    def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict:
        """Call a specific tool"""
        return self._send_request('tools/call', {
            'name': name,
            'arguments': arguments
        })
    
    def create_todo_list(self, title: str, description: str = None, 
                        context: str = None, tasks: list = None) -> Dict:
        """Create a new todo list"""
        args = {'title': title}
        if description:
            args['description'] = description
        if context:
            args['context'] = context
        if tasks:
            args['tasks'] = tasks
            
        result = self.call_tool('create_todo_list', args)
        return json.loads(result['content'][0]['text'])
    
    def get_todo_list(self, list_id: str, include_completed: bool = True) -> Dict:
        """Get a todo list by ID"""
        result = self.call_tool('get_todo_list', {
            'listId': list_id,
            'includeCompleted': include_completed
        })
        return json.loads(result['content'][0]['text'])
    
    def update_todo_list(self, list_id: str, action: str, **kwargs) -> Dict:
        """Update a todo list"""
        args = {'listId': list_id, 'action': action}
        args.update(kwargs)
        
        result = self.call_tool('update_todo_list', args)
        return json.loads(result['content'][0]['text'])
    
    def analyze_task_complexity(self, task_description: str, 
                              context: str = None, auto_create: bool = False) -> Dict:
        """Analyze task complexity"""
        args = {'taskDescription': task_description}
        if context:
            args['context'] = context
        if auto_create:
            args['autoCreate'] = auto_create
            
        result = self.call_tool('analyze_task_complexity', args)
        return json.loads(result['content'][0]['text'])
    
    def disconnect(self):
        """Disconnect from the server"""
        if self.process:
            self.process.terminate()
            self.process.wait()
            self.process = None

# Usage example
def main():
    client = MCPTaskManagerClient('./dist/index.js')
    
    try:
        # Connect to server
        tools = client.connect()
        print(f"Connected! Available tools: {[t['name'] for t in tools['tools']]}")
        
        # Analyze task complexity
        analysis = client.analyze_task_complexity(
            "Build a microservices architecture with Docker and Kubernetes",
            context="devops-project",
            auto_create=True
        )
        
        print(f"Task complexity: {analysis['analysis']['complexity']['overall']}/10")
        print(f"Confidence: {analysis['analysis']['confidence']:.2%}")
        
        if analysis['autoCreated']:
            list_data = analysis['createdList']
            print(f"Auto-created list: {list_data['title']} with {list_data['totalItems']} tasks")
            
            # Get the full list details
            full_list = client.get_todo_list(list_data['id'])
            print("\nGenerated tasks:")
            for i, item in enumerate(full_list['items'], 1):
                print(f"{i}. {item['title']} (Priority: {item['priority']})")
        
        # Create a simple todo list
        simple_list = client.create_todo_list(
            title="Daily Tasks",
            description="My daily work tasks",
            context="personal",
            tasks=[
                {"title": "Check emails", "priority": 2},
                {"title": "Review code", "priority": 4},
                {"title": "Update documentation", "priority": 3}
            ]
        )
        
        print(f"\nCreated simple list: {simple_list['title']}")
        print(f"Progress: {simple_list['progress']}% ({simple_list['completedItems']}/{simple_list['totalItems']})")
        
        # Update task status
        first_task_id = simple_list['items'][0]['id']
        updated_list = client.update_todo_list(
            simple_list['id'],
            'update_status',
            itemId=first_task_id,
            itemData={'status': 'completed'}
        )
        
        print(f"Updated progress: {updated_list['progress']}%")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.disconnect()

if __name__ == "__main__":
    main()
```

## Integration Patterns

### Workflow Automation

#### GitHub Actions Integration

```yaml
# .github/workflows/task-management.yml
name: Automated Task Management

on:
  pull_request:
    types: [opened, synchronize]
  issues:
    types: [opened, labeled]

jobs:
  create-tasks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install MCP Task Manager
        run: |
          git clone https://github.com/keyurgolani/task-list-mcp.git
          cd task-list-mcp
          npm install
          npm run build
          
      - name: Create Review Tasks
        if: github.event_name == 'pull_request'
        run: |
          node -e "
          const { spawn } = require('child_process');
          
          async function createReviewTasks() {
            const server = spawn('node', ['task-list-mcp/dist/index.js']);
            
            const request = {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'analyze_task_complexity',
                arguments: {
                  taskDescription: 'Code review for PR: ${{ github.event.pull_request.title }}',
                  context: 'github-pr-${{ github.event.number }}',
                  autoCreate: true
                }
              }
            };
            
            server.stdin.write(JSON.stringify(request) + '\n');
            server.stdout.on('data', (data) => {
              const response = JSON.parse(data.toString());
              console.log('Created review tasks:', response.result);
              server.kill();
            });
          }
          
          createReviewTasks();
          "
```

#### Slack Bot Integration

```javascript
// slack-bot-integration.js
const { App } = require('@slack/bolt');
const MCPTaskManagerClient = require('./mcp-client');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const mcpClient = new MCPTaskManagerClient('./task-list-mcp/dist/index.js');

// Handle slash command for creating tasks
app.command('/create-tasks', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    await mcpClient.connect();
    
    const analysis = await mcpClient.callTool('analyze_task_complexity', {
      taskDescription: command.text,
      context: `slack-${command.user_id}`,
      autoCreate: true,
      generateOptions: {
        style: 'business',
        maxTasks: 8
      }
    });
    
    const result = JSON.parse(analysis.content[0].text);
    
    if (result.autoCreated) {
      const list = result.createdList;
      await respond({
        text: `Created task list: *${list.title}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${list.title}*\n📋 ${list.totalItems} tasks • ⏱️ ~${Math.round(result.analysis.estimatedDuration / 60)} hours`
            }
          },
          {
            type: 'divider'
          },
          ...list.items.slice(0, 5).map(item => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• ${item.title} (Priority: ${item.priority})`
            }
          }))
        ]
      });
    } else {
      await respond({
        text: `Task appears simple (complexity: ${result.analysis.complexity.overall}/10). No breakdown needed.`
      });
    }
    
  } catch (error) {
    await respond({
      text: `Error creating tasks: ${error.message}`
    });
  } finally {
    mcpClient.disconnect();
  }
});

// Handle task status updates
app.message(/completed (.+)/, async ({ message, say }) => {
  try {
    await mcpClient.connect();
    
    const taskTitle = message.text.match(/completed (.+)/)[1];
    
    // Search for the task
    const searchResult = await mcpClient.callTool('search_todo_lists', {
      query: taskTitle,
      context: `slack-${message.user}`,
      filters: {
        status: ['pending', 'in_progress']
      }
    });
    
    const results = JSON.parse(searchResult.content[0].text);
    
    if (results.results.length > 0) {
      const match = results.results[0];
      
      // Update task status
      await mcpClient.callTool('update_todo_list', {
        listId: match.listId,
        action: 'update_status',
        itemId: match.item.id,
        itemData: { status: 'completed' }
      });
      
      await say(`✅ Marked "${match.item.title}" as completed!`);
    } else {
      await say(`❓ Couldn't find a pending task matching "${taskTitle}"`);
    }
    
  } catch (error) {
    await say(`Error updating task: ${error.message}`);
  } finally {
    mcpClient.disconnect();
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack bot is running!');
})();
```

### Analytics and Reporting

#### Progress Dashboard

```javascript
// progress-dashboard.js
const express = require('express');
const MCPTaskManagerClient = require('./mcp-client');

const app = express();
const mcpClient = new MCPTaskManagerClient('./task-list-mcp/dist/index.js');

app.get('/dashboard/:context', async (req, res) => {
  try {
    await mcpClient.connect();
    
    // Get all lists for context
    const listsResult = await mcpClient.callTool('list_todo_lists', {
      context: req.params.context,
      status: 'all'
    });
    
    const lists = JSON.parse(listsResult.content[0].text);
    
    // Calculate aggregate statistics
    const stats = {
      totalLists: lists.length,
      totalTasks: lists.reduce((sum, list) => sum + list.totalItems, 0),
      completedTasks: lists.reduce((sum, list) => sum + list.completedItems, 0),
      overallProgress: 0,
      activeProjects: lists.filter(list => !list.isArchived && list.progress < 100).length,
      completedProjects: lists.filter(list => list.progress === 100).length
    };
    
    stats.overallProgress = stats.totalTasks > 0 
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;
    
    // Generate HTML dashboard
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Task Dashboard - ${req.params.context}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 30px; }
        .stat-card { 
          background: #f5f5f5; 
          padding: 20px; 
          border-radius: 8px; 
          text-align: center;
          min-width: 120px;
        }
        .stat-number { font-size: 2em; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 5px; }
        .progress-bar {
          background: #e0e0e0;
          border-radius: 10px;
          height: 20px;
          margin: 10px 0;
        }
        .progress-fill {
          background: #4caf50;
          height: 100%;
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        .project-list { margin-top: 30px; }
        .project-item {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
        }
        .project-title { font-weight: bold; margin-bottom: 5px; }
        .project-progress { font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <h1>Task Dashboard: ${req.params.context}</h1>
      
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number">${stats.totalLists}</div>
          <div class="stat-label">Total Projects</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.totalTasks}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.completedTasks}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.overallProgress}%</div>
          <div class="stat-label">Overall Progress</div>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${stats.overallProgress}%"></div>
      </div>
      
      <div class="project-list">
        <h2>Active Projects (${stats.activeProjects})</h2>
        ${lists
          .filter(list => !list.isArchived && list.progress < 100)
          .map(list => `
            <div class="project-item">
              <div class="project-title">${list.title}</div>
              <div class="project-progress">
                ${list.completedItems}/${list.totalItems} tasks completed (${list.progress}%)
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${list.progress}%"></div>
              </div>
            </div>
          `).join('')}
      </div>
      
      <div class="project-list">
        <h2>Completed Projects (${stats.completedProjects})</h2>
        ${lists
          .filter(list => list.progress === 100)
          .map(list => `
            <div class="project-item">
              <div class="project-title">${list.title} ✅</div>
              <div class="project-progress">
                All ${list.totalItems} tasks completed
              </div>
            </div>
          `).join('')}
      </div>
    </body>
    </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  } finally {
    mcpClient.disconnect();
  }
});

app.listen(3001, () => {
  console.log('Dashboard available at http://localhost:3001/dashboard/{context}');
});
```

These integration examples demonstrate the flexibility and power of the MCP Task Manager when integrated with various AI agents and platforms. The key is leveraging the MCP protocol's standardized interface to create seamless, intelligent task management workflows.