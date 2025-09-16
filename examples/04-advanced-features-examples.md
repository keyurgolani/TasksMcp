# Advanced Features Examples

This document demonstrates the advanced AI-powered and analysis features of the MCP Task Manager.

## AI Task Analysis

### Simple Task Analysis
```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Build a real-time chat application with WebSocket support, user authentication, message persistence, and file sharing capabilities",
    "context": "Web application development project using Node.js and React",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "isComplex": false,
  "complexityScore": 4,
  "confidence": 25,
  "estimatedDuration": 732,
  "reasoning": "Task appears straightforward (score: 4/10). Can likely be completed as a single task.",
  "suggestions": [],
  "breakdown": [
    "Technical complexity: 8/10 - Requires programming expertise"
  ]
}
```

### Complex Task Analysis
```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Design and implement a complete e-commerce platform with user management, product catalog, shopping cart, payment processing, order management, inventory tracking, analytics dashboard, mobile app, admin panel, and deployment to AWS with CI/CD pipeline",
    "context": "Enterprise software development with microservices architecture",
    "maxSuggestions": 5
  }
}
```

**Response:**
```json
{
  "isComplex": false,
  "complexityScore": 4,
  "confidence": 35,
  "estimatedDuration": 781,
  "reasoning": "Task appears straightforward (score: 4/10). Can likely be completed as a single task.",
  "suggestions": [],
  "breakdown": [
    "Technical complexity: 10/10 - Requires programming expertise"
  ]
}
```

## AI Task Suggestions

### Technical Style Suggestions
```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "style": "technical",
    "maxSuggestions": 4
  }
}
```

**Response:**
```json
{
  "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "listTitle": "Development Project Alpha",
  "suggestions": [],
  "style": "technical",
  "context": {
    "totalTasks": 5,
    "completedTasks": 1,
    "progress": 20,
    "projectTag": "web-app"
  },
  "analysisInfo": {
    "complexityScore": 4,
    "confidence": 65,
    "reasoning": "Task appears straightforward (score: 4/10). Can likely be completed as a single task."
  }
}
```

### Business Style Suggestions
```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "1ebb1448-790b-438a-9ef8-aa16e9dbc4ba",
    "style": "business",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "listId": "1ebb1448-790b-438a-9ef8-aa16e9dbc4ba",
  "listTitle": "Mobile App Development",
  "suggestions": [],
  "style": "business",
  "context": {
    "totalTasks": 0,
    "completedTasks": 0,
    "progress": 0,
    "projectTag": "mobile-project"
  },
  "analysisInfo": {
    "complexityScore": 3,
    "confidence": 25,
    "reasoning": "Task appears straightforward (score: 3/10). Can likely be completed as a single task."
  }
}
```

### Other Suggestion Styles
Available styles:
- **detailed**: Comprehensive suggestions with full context
- **concise**: Brief, actionable suggestions
- **technical**: Developer-focused technical tasks
- **business**: Business and project management focused

## Task Dependencies Management

### Setting Task Dependencies
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "616496ad-87ad-4718-8ff1-68293c14077d",
    "dependencyIds": ["bc54482d-0f70-416b-987c-a6f15a98f16a"]
  }
}
```

**Response:**
```json
{
  "id": "616496ad-87ad-4718-8ff1-68293c14077d",
  "title": "Write comprehensive tests",
  "description": "Write unit tests, integration tests, and end-to-end tests for all components",
  "status": "pending",
  "priority": 2,
  "tags": ["testing", "quality", "automation"],
  "createdAt": "2025-09-16T21:17:02.710Z",
  "updatedAt": "2025-09-16T21:18:35.503Z",
  "estimatedDuration": 300,
  "dependencies": ["bc54482d-0f70-416b-987c-a6f15a98f16a"],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

### Clearing Dependencies
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "616496ad-87ad-4718-8ff1-68293c14077d",
    "dependencyIds": []
  }
}
```

### Getting Ready Tasks
```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "limit": 10
  }
}
```

**Response:**
```json
{
  "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "readyTasks": [
    {
      "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "title": "Design database schema",
      "description": "Create ERD and define table structures for user management, content, and analytics",
      "status": "pending",
      "priority": 5,
      "tags": ["database", "design", "backend", "critical", "architecture"],
      "estimatedDuration": 240,
      "createdAt": "2025-09-16T21:16:46.741Z",
      "updatedAt": "2025-09-16T21:17:27.397Z"
    },
    {
      "id": "62ab5565-5246-40be-953f-b2636c9753ba",
      "title": "Build frontend application",
      "description": "Create React components, routing, and state management for the user interface",
      "status": "pending",
      "priority": 3,
      "tags": ["frontend", "react", "ui"],
      "estimatedDuration": 360,
      "createdAt": "2025-09-16T21:16:57.035Z",
      "updatedAt": "2025-09-16T21:16:57.035Z"
    }
  ],
  "totalReady": 2,
  "nextActions": [
    "Start with high-priority tasks: \"Design database schema\"",
    "2 tasks are ready to work on. Focus on one at a time for best results."
  ],
  "summary": {
    "totalTasks": 5,
    "completedTasks": 1,
    "readyTasks": 2,
    "blockedTasks": 2
  }
}
```

## Dependency Analysis and Visualization

### Complete Analysis with ASCII DAG
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "both",
    "dagStyle": "ascii"
  }
}
```

**Response:**
```json
{
  "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "summary": {
    "totalTasks": 5,
    "readyTasks": 2,
    "blockedTasks": 2,
    "tasksWithDependencies": 3
  },
  "criticalPath": [
    "f47cd78e-962a-4860-a17e-49c67ab12da0",
    "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "bc54482d-0f70-416b-987c-a6f15a98f16a",
    "616496ad-87ad-4718-8ff1-68293c14077d"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": []
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Design database schema\" as it affects 3 other tasks.",
    "2 tasks are ready. Prioritize high-priority tasks like \"Design database schema\"."
  ]
}

==================================================
DAG VISUALIZATION:
==================================================

Task Dependency Graph (DAG):

🟢 READY TO START:
  • Design database schema → [Implement backend API]
  • Build frontend application

🔴 BLOCKED TASKS:
  • Implement backend API ← blocked by [Design database schema]
  • Write comprehensive tests ← blocked by [Implement backend API]

✅ COMPLETED:
  • Set up development environment and tools

DEPENDENCY RELATIONSHIPS:
  Design database schema ← depends on: [Set up development environment and tools]
  Implement backend API ← depends on: [Design database schema]
  Write comprehensive tests ← depends on: [Implement backend API]
```

### Mermaid Diagram Format
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "dag",
    "dagStyle": "mermaid"
  }
}
```

**Response:**
```
graph TD
  T1["Set up development environment and tools"]:::completed
  T2["Design database schema"]:::pending
  T3["Implement backend API"]:::pending
  T4["Build frontend application"]:::pending
  T5["Write comprehensive tests"]:::pending

  T1 --> T2
  T2 --> T3
  T3 --> T5

  classDef completed fill:#90EE90,stroke:#333,stroke-width:2px
  classDef inProgress fill:#87CEEB,stroke:#333,stroke-width:2px
  classDef blocked fill:#F08080,stroke:#333,stroke-width:2px
  classDef pending fill:#FFFFE0,stroke:#333,stroke-width:2px
  classDef cancelled fill:#D3D3D3,stroke:#333,stroke-width:2px
```

### Graphviz DOT Format
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "dag",
    "dagStyle": "dot"
  }
}
```

**Response:**
```
digraph TaskDAG {
  rankdir=TB;
  node [shape=box, style=rounded];

  "Set up development environment and tools" [fillcolor=lightgreen, style="rounded,filled", penwidth=3];
  "Design database schema" [fillcolor=lightyellow, style="rounded,filled", penwidth=3];
  "Implement backend API" [fillcolor=lightyellow, style="rounded,filled"];
  "Build frontend application" [fillcolor=lightyellow, style="rounded,filled"];
  "Write comprehensive tests" [fillcolor=lightyellow, style="rounded,filled"];

  "Set up development environment and tools" -> "Design database schema";
  "Design database schema" -> "Implement backend API";
  "Implement backend API" -> "Write comprehensive tests";
}
```

### Analysis Only (No Visualization)
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "analysis"
  }
}
```

## Key Features Explained

### Task Analysis
- **Complexity Score**: 1-10 scale indicating task difficulty
- **Confidence**: AI confidence in the analysis (0-100%)
- **Duration Estimate**: Suggested time in minutes
- **Breakdown**: Detailed analysis of complexity factors

### Task Suggestions
- **Context-Aware**: Based on existing tasks and project type
- **Style-Specific**: Tailored to technical, business, or other perspectives
- **Progressive**: Suggests next logical steps in project development

### Dependency Management
- **Automatic Blocking**: Tasks with incomplete dependencies are marked as blocked
- **Ready Task Identification**: Finds tasks that can be started immediately
- **Circular Dependency Detection**: Prevents invalid dependency chains
- **Critical Path Analysis**: Identifies the longest sequence of dependent tasks

### Visualization Options
- **ASCII**: Text-based diagrams for terminal/console display
- **Mermaid**: Modern diagram format for web rendering
- **DOT**: Graphviz format for professional diagram generation

## Best Practices

### Task Analysis
1. **Provide context** for more accurate analysis
2. **Use specific descriptions** rather than vague titles
3. **Consider breaking down** tasks with high complexity scores
4. **Review suggestions** but adapt to your specific needs

### Dependency Management
1. **Define dependencies early** in project planning
2. **Keep dependency chains reasonable** (avoid too many levels)
3. **Use ready tasks** to identify what to work on next
4. **Review critical path** to understand project timeline
5. **Check for bottlenecks** that might slow down the project

### Visualization
1. **Use ASCII** for quick terminal-based reviews
2. **Use Mermaid** for documentation and web display
3. **Use DOT** for professional project documentation
4. **Combine analysis and visualization** for comprehensive understanding

## Common Use Cases

### Project Planning
- Analyze complex tasks to break them down
- Get suggestions for missing project components
- Visualize project structure with dependency graphs

### Daily Workflow
- Find ready tasks to work on immediately
- Understand what's blocking progress
- Prioritize work based on critical path analysis

### Team Coordination
- Share dependency visualizations for team understanding
- Use ready tasks to assign work to team members
- Track critical path to manage project timeline

### Progress Tracking
- Monitor dependency completion to unblock tasks
- Use analysis to estimate remaining project time
- Identify bottlenecks that need attention