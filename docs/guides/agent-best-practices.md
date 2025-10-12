# Agent Best Practices for MCP Task Manager

## Overview

This guide provides proven methodologies and best practices for AI agents using the MCP Task Manager. These practices have been refined through real-world usage and are designed to maximize effectiveness, ensure quality outcomes, and optimize workflow efficiency.

## Core Methodology

### The Three Pillars of Effective Task Management

#### 1. Plan and Reflect

**Plan thoroughly before every tool call and reflect on the outcome after.**

- **Before Acting**: Analyze the current situation, understand requirements, and choose the most appropriate tools
- **During Execution**: Monitor progress and adjust approach based on intermediate results
- **After Completion**: Evaluate outcomes, learn from the process, and document insights

#### 2. Use Your Tools, Don't Guess

**If you're unsure about code, files, or project state, use available tools to investigate.**

- **Never Hallucinate**: Always verify information using actual tool calls
- **Investigate First**: Use search, analysis, and inspection tools before making assumptions
- **Validate Continuously**: Check your work and verify results throughout the process

#### 3. Persist Until Complete

**Keep going until the job is completely solved before ending your turn.**

- **Complete Solutions**: Don't leave tasks partially finished
- **Quality Assurance**: Ensure all exit criteria are met before marking tasks complete
- **Follow Through**: Address any issues or blockers that arise during execution

## Task Creation Best Practices

### Investigation and Planning Phase

Before creating any task, conduct thorough investigation to identify the optimal action plan:

#### 1. Analyze Requirements

```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Build user authentication system",
    "context": "Web application with React frontend and Node.js backend"
  }
}
```

#### 2. Break Down Complex Work

- Identify all components and dependencies
- Consider technical constraints and requirements
- Plan for testing, documentation, and deployment
- Estimate realistic timeframes for each component

#### 3. Define Clear Action Plans

Each task should include a detailed action plan in the description:

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "project-uuid",
    "title": "Implement user authentication",
    "description": "ACTION PLAN:\n1. Research authentication libraries (Passport.js, Auth0)\n2. Design database schema for users and sessions\n3. Implement login/logout endpoints\n4. Add password hashing and validation\n5. Create JWT token management\n6. Build frontend login components\n7. Add route protection middleware\n8. Write comprehensive tests\n\nCONTEXT:\n- Using Node.js/Express backend\n- React frontend with Redux\n- PostgreSQL database\n- Need to support email/password and OAuth\n\nCONSIDERATIONS:\n- Security best practices (OWASP guidelines)\n- Password complexity requirements\n- Session management and timeout\n- Rate limiting for login attempts",
    "priority": 5,
    "estimatedDuration": 480,
    "tags": ["backend", "security", "authentication"],
    "exitCriteria": [
      "Users can register with email and password",
      "Users can login and logout successfully",
      "Passwords are properly hashed and validated",
      "JWT tokens are generated and validated",
      "Protected routes require authentication",
      "All authentication endpoints have tests",
      "Security review completed and approved"
    ]
  }
}
```

### Task Notes and Context

#### Comprehensive Task Documentation

Include relevant context that will help during execution:

- **Technical Requirements**: Specific technologies, frameworks, or constraints
- **Business Context**: Why this task matters and how it fits into larger goals
- **Dependencies**: What must be completed first or what this task enables
- **Resources**: Links to documentation, examples, or reference materials
- **Assumptions**: Any assumptions made during planning that should be validated

#### Example Task with Rich Context

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "web-app-project",
    "title": "Optimize database queries for user dashboard",
    "description": "ACTION PLAN:\n1. Profile current query performance using EXPLAIN ANALYZE\n2. Identify N+1 query problems in user data loading\n3. Add appropriate database indexes\n4. Implement query result caching\n5. Optimize ORM queries (add eager loading)\n6. Add database query monitoring\n7. Performance test with realistic data volumes\n\nCONTEXT:\n- Dashboard loads slowly with >1000 users\n- Using PostgreSQL with Sequelize ORM\n- Current load time: 3-5 seconds, target: <500ms\n- Peak usage: 200 concurrent users\n\nRESOURCES:\n- Database performance guide: /docs/db-optimization.md\n- Current slow query log: /logs/slow-queries.log\n- Performance requirements: /specs/performance.md",
    "priority": 4,
    "estimatedDuration": 240,
    "tags": ["backend", "performance", "database"],
    "exitCriteria": [
      "Dashboard loads in under 500ms for 1000+ users",
      "Database queries are properly indexed",
      "N+1 query problems eliminated",
      "Query result caching implemented",
      "Performance monitoring in place",
      "Load testing passes with 200 concurrent users"
    ]
  }
}
```

### Exit Criteria Definition

#### Specific and Measurable Criteria

Define clear, testable conditions that must be met for task completion:

- **Functional Requirements**: What the system must do
- **Performance Requirements**: Speed, scalability, resource usage targets
- **Quality Requirements**: Testing coverage, code review, documentation
- **Acceptance Requirements**: Stakeholder approval, user validation

#### Exit Criteria Best Practices

```json
{
  "name": "set_task_exit_criteria",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "exitCriteria": [
      "Feature works correctly in all supported browsers (Chrome, Firefox, Safari, Edge)",
      "Unit test coverage is at least 90% for new code",
      "Integration tests pass in CI/CD pipeline",
      "Code review completed and approved by senior developer",
      "Performance benchmarks meet requirements (page load <2s)",
      "Accessibility audit passes WCAG 2.1 AA standards",
      "Documentation updated in wiki and README",
      "Feature flag configuration deployed to production"
    ]
  }
}
```

## Task Execution Best Practices

### Research and Preparation Phase

#### Start Every Task with Investigation

Before beginning work, thoroughly research the current state:

```json
// 1. Get task details and action plan
{
  "name": "get_list",
  "arguments": {
    "listId": "project-uuid",
    "includeCompleted": false
  }
}

// 2. Analyze project structure and dependencies
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "project-uuid",
    "format": "analysis"
  }
}

// 3. Check for related completed tasks for context
{
  "name": "search_tool",
  "arguments": {
    "query": "authentication security",
    "includeCompleted": true,
    "sortBy": "updatedAt"
  }
}
```

#### Update Execution Plan Based on Research

After investigation, refine the action plan with new insights:

```json
{
  "name": "update_task",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "description": "UPDATED ACTION PLAN (based on codebase analysis):\n1. ✅ Research completed - found existing auth middleware in /middleware/auth.js\n2. Extend existing user model in /models/User.js (already has email field)\n3. Add password hashing using existing bcrypt setup\n4. Implement login endpoint in /routes/auth.js (file exists, needs login method)\n5. Update frontend AuthContext in /src/contexts/AuthContext.js\n6. Add protected route wrapper component\n7. Write tests using existing Jest setup\n\nDISCOVERIES:\n- Project already has bcrypt and JWT dependencies\n- Auth middleware partially implemented\n- User model exists but needs password field\n- Frontend has auth context structure ready\n\nUPDATED ESTIMATE: 240 minutes (reduced from 480 due to existing infrastructure)"
  }
}
```

### Continuous Status Updates

#### Track Progress Throughout Execution

Keep task status and notes updated as work progresses:

```json
// Update task with current progress
{
  "name": "update_task",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "description": "PROGRESS UPDATE:\n✅ 1. Database schema updated - added password field to users table\n✅ 2. Password hashing implemented using bcrypt\n🔄 3. Currently working on: Login endpoint implementation\n⏳ 4. Next: JWT token generation and validation\n⏳ 5. Remaining: Frontend integration and testing\n\nCURRENT STATUS:\n- Backend auth logic 60% complete\n- All database migrations successful\n- Password hashing tested and working\n- Working on /api/auth/login endpoint\n\nBLOCKERS: None\nESTIMATED COMPLETION: 2 hours remaining"
  }
}
```

#### Update Exit Criteria Progress

Track completion of individual exit criteria:

```json
{
  "name": "update_exit_criteria",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "criteriaId": "criteria-uuid-1",
    "isMet": true,
    "notes": "Password hashing implemented using bcrypt with salt rounds=12. All existing passwords migrated successfully."
  }
}
```

### Quality Assurance and Completion

#### Verify All Exit Criteria Before Completion

Before marking a task complete, ensure every exit criterion is satisfied:

```json
// Check current exit criteria status
{
  "name": "get_list",
  "arguments": {
    "listId": "project-uuid"
  }
}

// Update any remaining criteria
{
  "name": "update_exit_criteria",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "criteriaId": "criteria-uuid-7",
    "isMet": true,
    "notes": "All tests passing. Coverage report shows 94% coverage for authentication module."
  }
}

// Only then mark task complete
{
  "name": "complete_task",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "task-uuid"
  }
}
```

## Workflow Optimization Patterns

### Daily Workflow Management

#### 1. Start with Ready Task Analysis

```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "project-uuid",
    "limit": 10
  }
}
```

#### 2. Prioritize Based on Impact and Dependencies

- Focus on tasks that unblock others
- Consider business priority and deadlines
- Balance quick wins with complex, high-value work

#### 3. Work on One Task at a Time

- Complete tasks fully before moving to the next
- Maintain focus and avoid context switching
- Update progress regularly to maintain momentum

### Multi-Agent Coordination

#### For Orchestration Agents

```json
// 1. Analyze overall project status
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "project-uuid",
    "format": "both",
    "dagStyle": "ascii"
  }
}

// 2. Find tasks ready for assignment
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "project-uuid",
    "limit": 20
  }
}

// 3. Assign tasks based on agent specialization
// Frontend Agent gets UI tasks
// Backend Agent gets API tasks
// Testing Agent gets QA tasks
```

#### For Specialized Agents

```json
// 1. Get assigned task details
{
  "name": "get_list",
  "arguments": {
    "listId": "project-uuid"
  }
}

// 2. Research task context and dependencies
{
  "name": "search_tool",
  "arguments": {
    "tags": ["frontend", "ui"],
    "status": ["completed"],
    "sortBy": "updatedAt"
  }
}

// 3. Execute with continuous updates
// 4. Complete only when all criteria met
```

## Common Anti-Patterns to Avoid

### ❌ Poor Task Creation

- **Vague descriptions**: "Fix the bug" instead of specific problem description
- **Missing context**: No information about environment, constraints, or requirements
- **Unrealistic estimates**: Not accounting for testing, documentation, or edge cases
- **Weak exit criteria**: "Make it work" instead of specific, measurable outcomes

### ❌ Ineffective Execution

- **Skipping research**: Starting work without understanding current state
- **No progress updates**: Leaving tasks stale without status information
- **Premature completion**: Marking tasks done without meeting all exit criteria
- **Ignoring dependencies**: Working on blocked tasks instead of ready ones

### ❌ Poor Communication

- **No documentation**: Not updating task descriptions with discoveries
- **Missing context**: Not explaining decisions or trade-offs made
- **Incomplete handoffs**: Not providing enough information for others to continue work

## Integration with MCP Tools

### Essential Tool Combinations

#### Task Investigation Workflow

```json
// 1. Analyze task complexity
{"name": "analyze_task", "arguments": {"taskDescription": "..."}}

// 2. Search for related work
{"name": "search_tool", "arguments": {"query": "...", "includeCompleted": true}}

// 3. Check dependencies
{"name": "analyze_task_dependencies", "arguments": {"listId": "..."}}

// 4. Create comprehensive task
{"name": "add_task", "arguments": {"...with detailed action plan..."}}
```

#### Daily Execution Workflow

```json
// 1. Find ready work
{"name": "get_ready_tasks", "arguments": {"listId": "...", "limit": 5}}

// 2. Get task details
{"name": "get_list", "arguments": {"listId": "..."}}

// 3. Update progress regularly
{"name": "update_task", "arguments": {"...with progress notes..."}}

// 4. Track exit criteria
{"name": "update_exit_criteria", "arguments": {"...with completion status..."}}

// 5. Complete when ready
{"name": "complete_task", "arguments": {"listId": "...", "taskId": "..."}}
```

### Advanced Patterns

#### Bulk Operations for Efficiency

```json
{
  "name": "bulk_task_operations",
  "arguments": {
    "listId": "project-uuid",
    "operation": "create",
    "tasks": [
      {
        "title": "Set up CI/CD pipeline",
        "description": "ACTION PLAN:\n1. Configure GitHub Actions\n2. Add automated testing\n3. Set up deployment to staging\n4. Configure production deployment\n\nCONTEXT: New project needs automated deployment",
        "priority": 4,
        "tags": ["devops", "automation"]
      },
      {
        "title": "Implement error monitoring",
        "description": "ACTION PLAN:\n1. Set up Sentry integration\n2. Add error boundaries in React\n3. Configure alerting rules\n4. Create error dashboard\n\nCONTEXT: Need visibility into production errors",
        "priority": 3,
        "tags": ["monitoring", "reliability"]
      }
    ]
  }
}
```

#### Dependency Management for Complex Projects

```json
// Set up task relationships
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "project-uuid",
    "taskId": "deploy-application",
    "dependencyIds": ["implement-features", "write-tests", "security-review"]
  }
}
```

## Measuring Success

### Key Performance Indicators

#### Task Quality Metrics

- **Completion Rate**: Percentage of tasks completed vs. created
- **Rework Rate**: Tasks that need to be reopened or significantly modified
- **Exit Criteria Compliance**: Percentage of tasks completed with all criteria met
- **Estimation Accuracy**: How close actual time matches estimated duration

#### Process Efficiency Metrics

- **Time to First Progress**: How quickly work begins after task creation
- **Update Frequency**: How often task status is updated during execution
- **Dependency Resolution Time**: How quickly blocked tasks become ready
- **Handoff Quality**: Success rate of tasks passed between agents

#### Project Outcomes

- **Delivery Predictability**: Ability to meet planned deadlines
- **Quality Consistency**: Consistent quality across different agents and tasks
- **Stakeholder Satisfaction**: Feedback on delivered work quality
- **Technical Debt**: Amount of shortcuts or compromises made

### Continuous Improvement

#### Regular Retrospectives

- Review completed tasks for lessons learned
- Identify patterns in successful vs. problematic tasks
- Refine action plan templates based on experience
- Update exit criteria standards based on quality outcomes

#### Process Refinement

- Evolve task creation templates based on project needs
- Improve estimation accuracy through historical data
- Enhance coordination patterns for multi-agent workflows
- Optimize tool usage patterns for efficiency

---

## Quick Reference

### Task Creation Checklist

- [ ] Conducted thorough investigation and analysis
- [ ] Created detailed action plan with specific steps
- [ ] Included relevant context and constraints
- [ ] Defined specific, measurable exit criteria
- [ ] Set realistic time estimates
- [ ] Added appropriate tags and priority
- [ ] Identified and set up dependencies

### Task Execution Checklist

- [ ] Researched current state before starting work
- [ ] Updated action plan based on discoveries
- [ ] Provided regular progress updates
- [ ] Tracked exit criteria completion
- [ ] Documented decisions and trade-offs
- [ ] Verified all criteria met before completion
- [ ] Updated task with final outcomes and learnings

### Daily Workflow Checklist

- [ ] Reviewed ready tasks and priorities
- [ ] Selected appropriate task based on impact and dependencies
- [ ] Planned approach before beginning work
- [ ] Maintained focus on single task until completion
- [ ] Reflected on outcomes and documented learnings

This methodology ensures consistent, high-quality task management that maximizes the effectiveness of AI agents using the MCP Task Manager while maintaining clear communication and accountability throughout the process.
