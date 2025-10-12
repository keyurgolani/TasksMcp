# Advanced Workflow Examples

This document demonstrates advanced features including AI-powered analysis, dependency management, and multi-agent orchestration patterns, all following the [Agent Best Practices](../guides/agent-best-practices.md) methodology.

## 🎯 Advanced Methodology Integration

These examples demonstrate the three core principles in complex scenarios:

- **Plan and Reflect**: Deep analysis and investigation for complex projects
- **Use Tools, Don't Guess**: Comprehensive research and validation approaches
- **Persist Until Complete**: Quality assurance through detailed exit criteria and progress tracking

## Methodology-Driven Complex Project Planning

### Investigation-First Approach for Complex Tasks

**Step 1: Initial Task Analysis (Plan and Reflect)**

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Build a real-time chat application with WebSocket support, user authentication, message persistence, and file sharing capabilities",
    "context": "Web application development project using Node.js and React. Team has 3 developers, 8-week timeline, needs to support 1000+ concurrent users.",
    "maxSuggestions": 5
  }
}
```

**Step 2: Research Existing Similar Work (Use Tools, Don't Guess)**

```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "chat application websocket authentication",
    "includeCompleted": true,
    "sortBy": "updatedAt",
    "limit": 10
  }
}
```

**Step 3: Analyze Project Dependencies**

```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "current-project-id",
    "format": "analysis"
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
  "breakdown": ["Technical complexity: 8/10 - Requires programming expertise"]
}
```

### Complete Methodology Example: E-commerce Platform

**Phase 1: Investigation and Analysis (Plan and Reflect)**

**Step 1: Comprehensive Task Analysis**

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Design and implement a complete e-commerce platform with user management, product catalog, shopping cart, payment processing, order management, inventory tracking, analytics dashboard, mobile app, admin panel, and deployment to AWS with CI/CD pipeline",
    "context": "Enterprise software development with microservices architecture. Team: 8 developers, 6-month timeline, budget: $500K, target: 10K concurrent users, B2B focus.",
    "maxSuggestions": 8
  }
}
```

**Step 2: Research Similar Completed Projects**

```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "e-commerce platform microservices",
    "includeCompleted": true,
    "tags": ["enterprise", "platform", "microservices"],
    "sortBy": "updatedAt",
    "limit": 15
  }
}
```

**Step 3: Analyze Current Project State**

```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "format": "both",
    "dagStyle": "ascii"
  }
}
```

**Phase 2: Strategic Task Creation with Detailed Planning**

**Step 4: Create Foundation Tasks with Investigation-Based Action Plans**

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "title": "Design Microservices Architecture",
    "description": "ACTION PLAN (based on research findings):\n\n🔍 RESEARCH COMPLETED:\n- Analyzed 3 similar enterprise e-commerce projects\n- Found common patterns: User service, Product service, Order service, Payment service\n- Identified critical integration points and data flow requirements\n- Reviewed AWS architecture best practices for microservices\n\n📋 IMPLEMENTATION PLAN:\n1. Define service boundaries and responsibilities\n2. Design inter-service communication patterns (REST + events)\n3. Plan data consistency and transaction strategies\n4. Design API gateway and service discovery\n5. Plan monitoring and logging architecture\n6. Create deployment and scaling strategies\n7. Design security and authentication flow\n8. Document service contracts and APIs\n\nCONTEXT:\n- Foundation task that blocks all development work\n- Must support 10K concurrent users with <200ms response times\n- B2B focus requires complex pricing and inventory management\n- Team has experience with Node.js, React, PostgreSQL, Redis\n\nTECHNICAL CONSTRAINTS:\n- AWS cloud deployment required\n- Microservices must be independently deployable\n- Event-driven architecture for real-time updates\n- GDPR compliance required for EU customers\n\nRISK MITIGATION:\n- Start with core services (User, Product, Order)\n- Plan for gradual migration from monolith if needed\n- Include performance testing from early stages\n- Design for horizontal scaling from day one",
    "priority": 5,
    "estimatedDuration": 480,
    "tags": ["architecture", "microservices", "foundation", "critical"],
    "exitCriteria": [
      "Service architecture diagram completed and reviewed",
      "API contracts defined for all core services",
      "Data flow and consistency strategy documented",
      "Security and authentication architecture approved",
      "Performance and scaling strategy validated",
      "Team architecture review completed and signed off",
      "Development team onboarding materials prepared",
      "Technical debt and migration strategy documented"
    ]
  }
}
```

**Phase 3: Execution with Continuous Updates**

**Step 5: Start with Research and Context Gathering**

```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "limit": 5
  }
}
```

**Step 6: Execute with Regular Progress Updates**

```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "taskId": "architecture-task-id",
    "description": "PROGRESS UPDATE - Microservices Architecture Design\n\n✅ COMPLETED (Days 1-2):\n- Service boundary analysis completed\n- Identified 6 core services: User, Product, Inventory, Order, Payment, Notification\n- API gateway pattern selected (AWS API Gateway + Lambda)\n- Event sourcing pattern chosen for order management\n\n🔄 IN PROGRESS (Day 3):\n- Designing inter-service communication patterns\n- Working on data consistency strategy (Saga pattern evaluation)\n- Creating service contract specifications\n\n⏳ NEXT STEPS:\n- Complete API contract definitions\n- Design monitoring and observability strategy\n- Create deployment pipeline architecture\n- Security architecture review\n\n🎯 KEY DISCOVERIES:\n- Event sourcing adds complexity but provides audit trail needed for B2B\n- Saga pattern better than 2PC for distributed transactions\n- AWS EventBridge suitable for inter-service events\n- Need dedicated search service (Elasticsearch) for product catalog\n\n📊 PROGRESS METRICS:\n- Architecture diagram: 80% complete\n- API contracts: 60% complete\n- Security design: 40% complete\n- Performance strategy: 30% complete\n\n⏱️ TIME TRACKING:\n- Estimated: 480 minutes (8 hours)\n- Actual so far: 360 minutes (6 hours)\n- Remaining estimate: 180 minutes (3 hours)\n\n🚧 CONSIDERATIONS:\n- May need additional time for security architecture review\n- Performance testing strategy more complex than initially estimated\n- Team wants additional review session for API contracts"
  }
}
```

**Step 7: Track Exit Criteria Progress**

```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "taskId": "architecture-task-id",
    "criteriaId": "service-architecture-criteria-id",
    "isMet": true,
    "notes": "Service architecture diagram completed using C4 model. Includes 6 core microservices with clear boundaries, data flow, and integration patterns. Reviewed and approved by senior architect and tech lead."
  }
}
```

**Phase 4: Quality Completion (Persist Until Complete)**

**Step 8: Verify All Exit Criteria Before Completion**

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "ecommerce-platform-project"
  }
}
```

**Step 9: Complete Only When All Criteria Met**

```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "taskId": "architecture-task-id"
  }
}
```

**Step 10: Document Comprehensive Learnings and Outcomes**

```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "ecommerce-platform-project",
    "taskId": "architecture-task-id",
    "description": "COMPLETED - Microservices Architecture Design\n\n✅ ALL EXIT CRITERIA MET:\n- Service architecture diagram completed (C4 model) ✅\n- API contracts defined for 6 core services ✅\n- Data consistency strategy (Saga pattern) documented ✅\n- Security architecture (OAuth2 + JWT) approved ✅\n- Performance strategy (auto-scaling, caching) validated ✅\n- Team architecture review completed ✅\n- Development onboarding materials prepared ✅\n- Technical debt strategy documented ✅\n\n🎯 KEY OUTCOMES:\n- 6 microservices architecture: User, Product, Inventory, Order, Payment, Notification\n- Event-driven design with AWS EventBridge for real-time updates\n- Saga pattern for distributed transaction management\n- API Gateway + Lambda for service orchestration\n- Elasticsearch for product search and analytics\n- Redis for caching and session management\n- PostgreSQL for transactional data storage\n\n📊 QUALITY METRICS:\n- Completed in 660 minutes (11 hours) vs 480 estimated\n- Zero rework required after stakeholder review\n- 100% team buy-in on architecture decisions\n- All security requirements addressed upfront\n- Performance targets validated through capacity planning\n\n🧠 CRITICAL LEARNINGS:\n- Event sourcing complexity justified by B2B audit requirements\n- Saga pattern learning curve required additional team training\n- AWS EventBridge more cost-effective than SQS for our use case\n- Security architecture review took longer but prevented future issues\n- Team collaboration sessions were more valuable than individual work\n\n🚀 NEXT ACTIONS ENABLED:\n- Development teams can start service implementation\n- DevOps team can begin infrastructure setup\n- QA team can plan testing strategies for microservices\n- Product team has clear API contracts for frontend planning\n\n📈 PROJECT IMPACT:\n- Unblocked 12 development tasks\n- Reduced integration risk by 70% through clear contracts\n- Established foundation for 6-month development timeline\n- Created reusable architecture patterns for future projects\n\n⚠️ RISKS MITIGATED:\n- Service boundary conflicts prevented through upfront design\n- Data consistency issues addressed with Saga pattern\n- Performance bottlenecks identified and planned for\n- Security vulnerabilities prevented through architecture review\n\n🔄 CONTINUOUS IMPROVEMENT:\n- Architecture will be reviewed monthly as implementation progresses\n- Performance assumptions will be validated in first sprint\n- Security architecture will be audited by external firm\n- Team feedback will be incorporated in next architecture iteration"
  }
}
```

**Response:**

```json
{
  "isComplex": true,
  "complexityScore": 9,
  "confidence": 85,
  "estimatedDuration": 2400,
  "reasoning": "This is a highly complex task (score: 9/10) that should be broken down into smaller, manageable components.",
  "suggestions": [
    "Break into separate microservices: User service, Product service, Order service, Payment service",
    "Create separate tasks for frontend (web app) and mobile app development",
    "Set up infrastructure and CI/CD pipeline as foundational tasks",
    "Implement core features first, then add advanced analytics and admin features",
    "Consider using existing solutions for payment processing and authentication"
  ],
  "breakdown": [
    "User Management System - 240 minutes",
    "Product Catalog with Search - 360 minutes",
    "Shopping Cart and Checkout - 300 minutes",
    "Payment Processing Integration - 180 minutes",
    "Order Management System - 240 minutes"
  ]
}
```

### Get Task Suggestions

```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "style": "practical",
    "maxSuggestions": 5
  }
}
```

**Response:**

```json
{
  "suggestions": [
    {
      "title": "Set up automated testing framework",
      "description": "Implement unit and integration tests for reliable development",
      "priority": 4,
      "estimatedDuration": 180,
      "tags": ["testing", "automation", "quality"],
      "reasoning": "Testing is crucial for maintaining code quality as the project grows"
    },
    {
      "title": "Implement error logging and monitoring",
      "description": "Set up comprehensive error tracking and performance monitoring",
      "priority": 3,
      "estimatedDuration": 120,
      "tags": ["monitoring", "logging", "operations"],
      "reasoning": "Essential for production readiness and debugging"
    }
  ],
  "context": {
    "existingTasks": 5,
    "completedTasks": 1,
    "averagePriority": 4.2,
    "commonTags": ["setup", "backend", "database"]
  }
}
```

## Dependency Management

### Setting Task Dependencies

**Basic Dependencies:**

```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "dependencyIds": ["f47cd78e-962a-4860-a17e-49c67ab12da0"]
  }
}
```

**Response:**

```json
{
  "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
  "title": "Design database schema",
  "description": "Create ERD and define table structures for user management, content, and analytics",
  "status": "pending",
  "priority": 5,
  "tags": ["database", "design", "backend", "critical", "architecture"],
  "createdAt": "2025-09-16T21:16:46.741Z",
  "updatedAt": "2025-09-16T21:17:27.397Z",
  "estimatedDuration": 240,
  "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

**Multiple Dependencies:**

```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "616496ad-87ad-4718-8ff1-68293c14077d",
    "dependencyIds": [
      "bc54482d-0f70-416b-987c-a6f15a98f16a",
      "62ab5565-5246-40be-953f-b2636c9753ba"
    ]
  }
}
```

### Finding Ready Tasks

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
  "readyTasks": [
    {
      "id": "f47cd78e-962a-4860-a17e-49c67ab12da0",
      "title": "Set up development environment and tools",
      "priority": 5,
      "estimatedDuration": 90,
      "tags": ["setup", "environment", "urgent"],
      "isReady": true,
      "blockedTasks": ["e7e5a962-f706-4607-b7e1-95f44b9867ee"]
    }
  ],
  "summary": {
    "totalReady": 1,
    "totalBlocked": 4,
    "highestPriority": 5,
    "totalEstimatedTime": 90
  },
  "recommendations": [
    "Focus on \"Set up development environment and tools\" first - it unblocks 1 other task",
    "Consider breaking down blocked tasks if dependencies are taking too long"
  ]
}
```

### Dependency Analysis

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
  "analysis": {
    "totalTasks": 5,
    "readyTasks": 1,
    "blockedTasks": 4,
    "criticalPath": [
      "f47cd78e-962a-4860-a17e-49c67ab12da0",
      "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "bc54482d-0f70-416b-987c-a6f15a98f16a"
    ],
    "criticalPathDuration": 570,
    "bottlenecks": [
      {
        "taskId": "f47cd78e-962a-4860-a17e-49c67ab12da0",
        "title": "Set up development environment and tools",
        "blocksCount": 1,
        "impact": "high"
      }
    ]
  },
  "visualization": {
    "ascii": "f47cd78e → e7e5a962 → bc54482d\n           ↓\n        62ab5565",
    "mermaid": "graph TD\n  A[Set up environment] --> B[Design database]\n  B --> C[Implement API]\n  B --> D[Create frontend]"
  },
  "recommendations": [
    "Focus on completing \"Set up development environment and tools\" first to unblock other work",
    "Consider if any dependencies can be removed or made optional",
    "The critical path will take approximately 570 minutes to complete"
  ]
}
```

## Multi-Agent Orchestration

### Pattern 1: Parallel Feature Development

**Setup: Create feature tasks with dependencies**

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "web-app-project",
    "title": "Implement user authentication",
    "tags": ["backend", "security"],
    "dependencies": ["setup-database"]
  }
}
```

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "web-app-project",
    "title": "Design user interface",
    "tags": ["frontend", "ui"],
    "dependencies": ["create-wireframes"]
  }
}
```

**Orchestration: Find ready tasks**

```json
{
  "tool": "get_ready_tasks",
  "parameters": { "listId": "web-app-project", "limit": 5 }
}
```

**Returns:** `["setup-database", "create-wireframes"]` - can be assigned to different agents

**Assignment:**

- Database Agent → "setup-database"
- Design Agent → "create-wireframes"
- Both work in parallel, unlocking more tasks when complete

### Pattern 2: Pipeline Processing

**Setup: Content creation pipeline**

```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "content-pipeline",
    "taskId": "publish-article",
    "dependencyIds": [
      "write-draft",
      "edit-content",
      "create-graphics",
      "seo-review"
    ]
  }
}
```

**Orchestration: As each stage completes, next becomes ready**

- Stage 1: Writer Agent → "write-draft"
- Stage 2: Editor Agent → "edit-content" (after draft complete)
- Stage 3: Designer Agent → "create-graphics" (parallel with editing)
- Stage 4: SEO Agent → "seo-review" (after content ready)
- Stage 5: Publisher Agent → "publish-article" (after all complete)

### Pattern 3: Quality Gates

**Setup: Code deployment with multiple approvals**

```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "deployment",
    "taskId": "deploy-production",
    "dependencyIds": [
      "code-review-1",
      "code-review-2",
      "security-scan",
      "performance-test"
    ]
  }
}
```

**Orchestration: Multiple review agents work in parallel**

- Review Agent 1 → "code-review-1"
- Review Agent 2 → "code-review-2"
- Security Agent → "security-scan"
- Performance Agent → "performance-test"
- All must complete before deployment agent can proceed

## Complex Workflow Examples

### Large Software Development Project

```bash
# Orchestration Agent Workflow:

# 1. Analyze current project state
analyze_task_dependencies → Identify bottlenecks and critical path

# 2. Find available work
get_ready_tasks → Get list of unblocked tasks

# 3. Assign tasks to specialized agents:
# - Frontend Agent: UI components (if design complete)
# - Backend Agent: API endpoints (if database ready)
# - Testing Agent: Unit tests (if code available)
# - DevOps Agent: Infrastructure (if requirements defined)

# 4. Monitor progress and reassign as tasks complete
# 5. Repeat until project completion
```

### Content Creation Pipeline

```bash
# Multi-Agent Content Workflow:

# 1. Content Manager Agent sets up pipeline
set_task_dependencies → Define content workflow stages

# 2. Find ready content pieces
get_ready_tasks → Identify articles ready for next stage

# 3. Assign to specialized agents:
# - Research Agent: Gather information and sources
# - Writing Agent: Create initial drafts
# - Editing Agent: Review and improve content
# - SEO Agent: Optimize for search engines
# - Publishing Agent: Format and publish

# 4. Pipeline flows automatically as each stage completes
```

## Advanced Search and Filtering

### Complex Multi-Criteria Search

```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "authentication security",
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "priority": [4, 5],
    "status": ["pending", "in_progress"],
    "tags": ["backend", "security"],
    "isReady": true,
    "sortBy": "priority",
    "sortOrder": "desc",
    "limit": 10
  }
}
```

### Filter by Time Estimates

```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "estimatedDurationMin": 60,
    "estimatedDurationMax": 240,
    "sortBy": "estimatedDuration"
  }
}
```

### Advanced Display Options

```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "detailed",
    "groupBy": "status",
    "includeCompleted": true,
    "showDependencies": true,
    "showBlockedBy": true,
    "showEstimates": true
  }
}
```

## Performance Optimization

### Batch Operations

**Create Multiple Related Tasks:**

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "operations": [
      {
        "type": "create",
        "data": {
          "title": "Set up user authentication API",
          "priority": 5,
          "tags": ["backend", "auth", "api"],
          "estimatedDuration": 180
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Implement JWT token handling",
          "priority": 4,
          "tags": ["backend", "auth", "security"],
          "estimatedDuration": 120
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Add password hashing and validation",
          "priority": 4,
          "tags": ["backend", "auth", "security"],
          "estimatedDuration": 90
        }
      }
    ]
  }
}
```

**Update Multiple Task Priorities:**

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "operations": [
      {
        "type": "set_priority",
        "taskId": "task-id-1",
        "priority": 5
      },
      {
        "type": "set_priority",
        "taskId": "task-id-2",
        "priority": 4
      },
      {
        "type": "add_tags",
        "taskId": "task-id-3",
        "tags": ["urgent", "client-facing"]
      }
    ]
  }
}
```

## Best Practices for Advanced Workflows

### Task Design

- **Atomic Tasks**: Create tasks that can be completed independently by a single agent
- **Clear Dependencies**: Only set dependencies that represent true prerequisites
- **Balanced Workload**: Design tasks with similar complexity for parallel execution

### Dependency Management

- **Minimize Dependencies**: Reduce coupling between tasks where possible
- **Parallel Paths**: Create multiple independent work streams
- **Critical Path Focus**: Prioritize tasks on the critical path

### Multi-Agent Coordination

- **Role-Based Assignment**: Assign tasks based on agent specialization
- **Progress Monitoring**: Regular check-ins on task completion status
- **Dynamic Rebalancing**: Reassign work based on agent availability and progress

### Performance Optimization

- **Batch Operations**: Use bulk operations for multiple related changes
- **Efficient Filtering**: Use specific criteria to reduce data transfer
- **Context Management**: Maintain context for related operations

These advanced patterns enable sophisticated project management and multi-agent orchestration workflows that can scale to handle complex, multi-phase projects with hundreds of interdependent tasks.
