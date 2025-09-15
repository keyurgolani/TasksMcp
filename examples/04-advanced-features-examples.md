# Advanced Features Examples

This document demonstrates the 2 AI-powered advanced MCP tools that provide intelligent task analysis and suggestions. Each tool includes 5 examples showing how to leverage AI capabilities for better task management and project planning.

## 1. analyze_task

### Example 1: Simple Development Task
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Create a login form with email and password validation",
    "context": "Web application development",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "isComplex": false,
  "complexityScore": 2,
  "confidence": 85,
  "estimatedDuration": 120,
  "reasoning": "Simple UI task with standard validation patterns",
  "suggestions": [],
  "breakdown": [
    "UI complexity: 2/10 - Standard form components",
    "Logic complexity: 2/10 - Basic validation rules"
  ]
}
```

### Example 2: Complex System Integration
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Implement real-time collaborative editing with operational transforms, conflict resolution, and multi-user synchronization across distributed systems",
    "context": "Enterprise web application",
    "maxSuggestions": 5
  }
}
```

**Response:**
```json
{
  "isComplex": true,
  "complexityScore": 9,
  "confidence": 90,
  "estimatedDuration": 2400,
  "reasoning": "Highly complex task requiring advanced algorithms and distributed systems knowledge",
  "suggestions": [
    "Break down into operational transform implementation",
    "Separate conflict resolution logic",
    "Create multi-user state management system",
    "Implement distributed synchronization protocol",
    "Add comprehensive testing for edge cases"
  ],
  "breakdown": [
    "Technical complexity: 9/10 - Advanced algorithms required",
    "Integration complexity: 8/10 - Multiple system coordination",
    "Testing complexity: 9/10 - Complex edge cases"
  ]
}
```

### Example 3: API Development Task
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Build REST API endpoints for user management with CRUD operations, authentication, and role-based access control",
    "context": "Backend development",
    "maxSuggestions": 4
  }
}
```

**Response:**
```json
{
  "isComplex": true,
  "complexityScore": 6,
  "confidence": 80,
  "estimatedDuration": 960,
  "reasoning": "Moderately complex backend task with multiple components",
  "suggestions": [
    "Create user model and database schema",
    "Implement authentication middleware",
    "Build CRUD endpoints with validation",
    "Add role-based access control system"
  ],
  "breakdown": [
    "Technical complexity: 6/10 - Standard backend patterns",
    "Security complexity: 7/10 - Authentication and authorization",
    "Database complexity: 5/10 - Standard CRUD operations"
  ]
}
```

### Example 4: Learning Task
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Learn React hooks by building a todo application with local storage",
    "context": "Personal learning project",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "isComplex": false,
  "complexityScore": 3,
  "confidence": 75,
  "estimatedDuration": 480,
  "reasoning": "Learning task with practical application, moderate complexity for beginners",
  "suggestions": [
    "Start with basic useState and useEffect hooks",
    "Implement todo CRUD operations",
    "Add local storage persistence"
  ],
  "breakdown": [
    "Learning complexity: 4/10 - Intermediate React concepts",
    "Implementation complexity: 3/10 - Standard todo app patterns"
  ]
}
```

### Example 5: Bug Fix Task
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Fix memory leak in data processing pipeline that occurs during large file uploads",
    "context": "Production bug fix",
    "maxSuggestions": 4
  }
}
```

**Response:**
```json
{
  "isComplex": true,
  "complexityScore": 7,
  "confidence": 70,
  "estimatedDuration": 720,
  "reasoning": "Complex debugging task requiring performance analysis and system understanding",
  "suggestions": [
    "Profile memory usage during file uploads",
    "Identify memory leak sources in processing pipeline",
    "Implement proper resource cleanup",
    "Add monitoring for memory usage patterns"
  ],
  "breakdown": [
    "Debugging complexity: 8/10 - Memory leak investigation",
    "System complexity: 7/10 - File processing pipeline",
    "Testing complexity: 6/10 - Performance testing required"
  ]
}
```

## 2. get_task_suggestions

### Example 1: Development Project Suggestions
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "style": "detailed",
    "maxSuggestions": 5
  }
}
```

**Response:**
```json
{
  "listId": "12345678-1234-1234-1234-123456789012",
  "listTitle": "E-commerce Platform",
  "suggestions": [
    {
      "title": "Implement shopping cart persistence",
      "description": "Add functionality to save cart items across browser sessions using local storage or user accounts",
      "priority": 4,
      "estimatedDuration": 180,
      "tags": ["frontend", "persistence", "user-experience"],
      "reasoning": "Based on existing user authentication tasks, cart persistence would improve user experience"
    },
    {
      "title": "Add product search and filtering",
      "description": "Implement search functionality with filters for category, price range, and ratings",
      "priority": 3,
      "estimatedDuration": 240,
      "tags": ["search", "filtering", "database"],
      "reasoning": "Essential feature for e-commerce platforms to help users find products"
    }
  ],
  "style": "detailed",
  "context": {
    "totalTasks": 8,
    "completedTasks": 3,
    "progress": 37,
    "projectTag": "ecommerce"
  }
}
```

### Example 2: Learning Project Suggestions
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "style": "concise",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "listId": "87654321-4321-4321-4321-210987654321",
  "listTitle": "Learn TypeScript",
  "suggestions": [
    {
      "title": "Practice generic types",
      "description": "Build utility functions using TypeScript generics",
      "priority": 3,
      "estimatedDuration": 120,
      "tags": ["typescript", "generics", "practice"]
    },
    {
      "title": "Create type definitions",
      "description": "Write .d.ts files for external libraries",
      "priority": 2,
      "estimatedDuration": 90,
      "tags": ["typescript", "definitions", "libraries"]
    }
  ],
  "style": "concise",
  "context": {
    "totalTasks": 5,
    "completedTasks": 2,
    "progress": 40,
    "projectTag": "learning"
  }
}
```

### Example 3: Team Sprint Suggestions
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "style": "technical",
    "maxSuggestions": 4
  }
}
```

**Response:**
```json
{
  "listId": "abcdef12-3456-7890-abcd-ef1234567890",
  "listTitle": "Sprint 24 - Performance Optimization",
  "suggestions": [
    {
      "title": "Implement database query optimization",
      "description": "Add indexes, optimize N+1 queries, and implement query caching strategies",
      "priority": 5,
      "estimatedDuration": 360,
      "tags": ["database", "performance", "optimization"],
      "reasoning": "Critical for addressing performance bottlenecks identified in current sprint"
    },
    {
      "title": "Add application performance monitoring",
      "description": "Integrate APM tools to track response times, error rates, and resource usage",
      "priority": 4,
      "estimatedDuration": 240,
      "tags": ["monitoring", "apm", "observability"],
      "reasoning": "Essential for measuring optimization impact and ongoing performance tracking"
    }
  ],
  "style": "technical",
  "context": {
    "totalTasks": 12,
    "completedTasks": 4,
    "progress": 33,
    "projectTag": "sprint-24"
  }
}
```

### Example 4: Business Project Suggestions
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "style": "business",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "listId": "fedcba98-7654-3210-fedc-ba9876543210",
  "listTitle": "Q4 Marketing Campaign",
  "suggestions": [
    {
      "title": "Develop customer segmentation strategy",
      "description": "Analyze customer data to create targeted marketing segments for improved campaign effectiveness",
      "priority": 4,
      "estimatedDuration": 480,
      "tags": ["marketing", "analytics", "strategy"],
      "reasoning": "Segmentation will improve campaign ROI and customer engagement rates"
    },
    {
      "title": "Create A/B testing framework",
      "description": "Establish systematic approach to test campaign variations and measure performance",
      "priority": 3,
      "estimatedDuration": 360,
      "tags": ["testing", "optimization", "metrics"],
      "reasoning": "Data-driven approach to optimize campaign performance and budget allocation"
    }
  ],
  "style": "business",
  "context": {
    "totalTasks": 6,
    "completedTasks": 1,
    "progress": 16,
    "projectTag": "marketing"
  }
}
```

### Example 5: Empty List Suggestions
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "style": "detailed",
    "maxSuggestions": 5
  }
}
```

**Response:**
```json
{
  "listId": "11111111-2222-3333-4444-555555555555",
  "listTitle": "New Project Setup",
  "suggestions": [
    {
      "title": "Define project requirements",
      "description": "Document functional and non-functional requirements, user stories, and acceptance criteria",
      "priority": 5,
      "estimatedDuration": 240,
      "tags": ["planning", "requirements", "documentation"],
      "reasoning": "Essential first step for any new project to establish clear goals and scope"
    },
    {
      "title": "Set up development environment",
      "description": "Configure development tools, version control, and project structure",
      "priority": 4,
      "estimatedDuration": 120,
      "tags": ["setup", "development", "tools"],
      "reasoning": "Foundation for efficient development workflow"
    },
    {
      "title": "Create project timeline",
      "description": "Break down project into phases with milestones and deadlines",
      "priority": 3,
      "estimatedDuration": 90,
      "tags": ["planning", "timeline", "milestones"],
      "reasoning": "Important for project management and stakeholder communication"
    }
  ],
  "style": "detailed",
  "context": {
    "totalTasks": 0,
    "completedTasks": 0,
    "progress": 0,
    "projectTag": "new-project"
  }
}
```

## Analysis Information

Both advanced tools provide analysis information to help understand the reasoning behind suggestions and complexity assessments:

### Complexity Scoring (analyze_task)
- **Score 1-3**: Simple tasks that can be completed as-is
- **Score 4-6**: Moderate complexity, may benefit from breakdown
- **Score 7-10**: Complex tasks that should be broken down into smaller components

### Confidence Levels
- **80-100%**: High confidence in analysis
- **60-79%**: Moderate confidence, some uncertainty
- **Below 60%**: Low confidence, manual review recommended

### Suggestion Reasoning
Each suggestion includes reasoning based on:
- Existing tasks and patterns in the list
- Project context and tags
- Industry best practices
- Common workflow patterns