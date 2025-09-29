# Basic Usage Examples

This guide provides practical examples for common task management scenarios using the MCP Task Manager, demonstrating the [Agent Best Practices](../guides/agent-best-practices.md) methodology in action.

## 🎯 Best Practices Integration

These examples follow the three core principles:

- **Plan and Reflect**: Thorough investigation before action, reflection after completion
- **Use Tools, Don't Guess**: Always investigate using available tools rather than assumptions
- **Persist Until Complete**: Ensure all exit criteria are met before marking tasks complete

## 🚀 Getting Started Examples

### Creating Your First Todo List

**Scenario**: You want to organize tasks for a new project.

**Step 1: Plan and Investigate** (following best practices)

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "projectTag": "web-development",
    "limit": 10
  }
}
```

_Check if similar projects exist to learn from their structure_

**Step 2: Create the List with Context**

```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Website Redesign Project",
    "description": "Complete redesign of company website with modern UI/UX. Goals: Improve user experience, increase conversion rates, modernize brand presentation. Timeline: 8 weeks. Stakeholders: Marketing team, Design team, Development team.",
    "projectTag": "web-development"
  }
}
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Website Redesign Project",
  "description": "Complete redesign of company website with modern UI/UX",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "projectTag": "web-development",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Adding Tasks with Investigation and Planning

**Step 1: Analyze Task Complexity** (Use Tools, Don't Guess)

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Create wireframes for main pages including home, about, services, and contact pages",
    "context": "Website redesign project with focus on user experience and conversion optimization"
  }
}
```

**Step 2: Create Task with Detailed Action Plan**

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Create wireframes for main pages",
    "description": "ACTION PLAN:\n1. Research current user analytics and pain points\n2. Review competitor websites for best practices\n3. Create low-fidelity wireframes for home page\n4. Design wireframes for about, services, and contact pages\n5. Include mobile responsive layouts\n6. Get stakeholder feedback and iterate\n\nCONTEXT:\nCritical foundation task that blocks UI design and development. Must align with brand guidelines and conversion goals.\n\nCONSIDERATIONS:\n- Mobile-first approach\n- Accessibility requirements\n- SEO-friendly structure\n- Conversion optimization",
    "priority": 5,
    "tags": ["design", "wireframes", "urgent", "foundation"],
    "estimatedDuration": 240,
    "exitCriteria": [
      "Wireframes completed for all 4 main pages",
      "Mobile responsive layouts included",
      "Stakeholder review completed and approved",
      "Accessibility considerations documented",
      "Handoff documentation prepared for design team"
    ]
  }
}
```

**Medium Priority Task:**

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Research competitor websites",
    "description": "Analyze 5 competitor websites for design inspiration and best practices",
    "priority": 3,
    "tags": ["research", "analysis"],
    "estimatedDuration": 120
  }
}
```

**Low Priority Task:**

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Update company logo",
    "description": "Consider updating the company logo for the new website",
    "priority": 2,
    "tags": ["design", "branding"],
    "estimatedDuration": 60
  }
}
```

## 📋 Daily Task Management

### Viewing Your Tasks

**Show all tasks organized by priority:**

```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "detailed",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

**Response:**

```
📋 Website Redesign Project (3 tasks, 0% complete)

🔥 CRITICAL PRIORITY (5):
  🔴 Create wireframes for main pages
     📝 Design wireframes for home, about, services, and contact pages
     ⏱️  240 min | 🏷️  design, wireframes, urgent

🔸 MEDIUM PRIORITY (3):
  🔴 Research competitor websites
     📝 Analyze 5 competitor websites for design inspiration and best practices
     ⏱️  120 min | 🏷️  research, analysis

🔹 LOW PRIORITY (2):
  🔴 Update company logo
     📝 Consider updating the company logo for the new website
     ⏱️  60 min | 🏷️  design, branding
```

### Daily Workflow: Finding and Executing Tasks

**Step 1: Plan Your Day** (Plan and Reflect methodology)

```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "limit": 5
  }
}
```

**Step 2: Research Task Context Before Starting**

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

_Review task details, action plan, and exit criteria before beginning work_

**Response:**

```json
{
  "readyTasks": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "title": "Create wireframes for main pages",
      "priority": 5,
      "estimatedDuration": 240,
      "tags": ["design", "wireframes", "urgent"],
      "isReady": true
    },
    {
      "id": "789abcde-e89b-12d3-a456-426614174002",
      "title": "Research competitor websites",
      "priority": 3,
      "estimatedDuration": 120,
      "tags": ["research", "analysis"],
      "isReady": true
    }
  ],
  "summary": {
    "totalReady": 3,
    "highestPriority": 5,
    "totalEstimatedTime": 420
  },
  "nextActions": [
    "Start with highest priority: \"Create wireframes for main pages\" (Priority 5)",
    "3 tasks are ready to work on. Focus on one at a time for best results."
  ]
}
```

## 🔍 Searching and Filtering

### Search by Text

**Find all tasks related to "design":**

```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "design",
    "limit": 10
  }
}
```

### Filter by Priority

**Find high-priority tasks:**

```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "priority": [4, 5],
    "sortBy": "priority",
    "sortOrder": "desc"
  }
}
```

### Filter by Tags

**Find all research-related tasks:**

```json
{
  "tool": "search_tool",
  "parameters": {
    "tags": ["research"],
    "tagOperator": "AND",
    "sortBy": "createdAt"
  }
}
```

### Complex Filtering

**Find pending high-priority tasks with specific tags:**

```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": ["pending"],
    "priority": [4, 5],
    "tags": ["design", "urgent"],
    "tagOperator": "OR",
    "sortBy": "priority",
    "sortOrder": "desc",
    "limit": 5
  }
}
```

## ✅ Task Execution with Best Practices

### Methodology-Driven Task Execution

**Step 1: Start with Research and Planning**

```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "wireframes design",
    "includeCompleted": true,
    "sortBy": "updatedAt"
  }
}
```

_Research similar completed tasks for context and learnings_

**Step 2: Update Task with Research Findings**

```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "description": "UPDATED ACTION PLAN (based on research):\n✅ 1. Research completed - found user analytics showing 60% mobile traffic\n🔄 2. Currently working on: Competitor analysis (5 sites reviewed)\n⏳ 3. Next: Create mobile-first wireframes\n⏳ 4. Then: Desktop layouts and stakeholder review\n\nKEY FINDINGS:\n- Mobile traffic dominates (prioritize mobile-first)\n- Users drop off at contact form (needs simplification)\n- Competitor sites use card-based layouts effectively\n\nUPDATED APPROACH:\n- Start with mobile wireframes\n- Simplify contact form design\n- Use card-based content organization"
  }
}
```

**Step 3: Track Progress with Exit Criteria Updates**

```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "criteriaId": "wireframes-criteria-id",
    "isMet": true,
    "notes": "Mobile wireframes completed for all 4 pages. Used card-based layout based on competitor research. Simplified contact form design."
  }
}
```

**Step 4: Complete Only When All Criteria Met**

```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

**Step 5: Reflect and Document Learnings**

```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "description": "COMPLETED - Wireframes for Main Pages\n\n✅ ALL EXIT CRITERIA MET:\n- Wireframes completed for all 4 main pages ✅\n- Mobile responsive layouts included ✅\n- Stakeholder review completed and approved ✅\n- Accessibility considerations documented ✅\n- Handoff documentation prepared ✅\n\n🎯 KEY LEARNINGS:\n- Mobile-first approach saved 2 hours of rework\n- Competitor research revealed card-based layouts work well\n- Simplified contact form reduced complexity by 40%\n- Stakeholder feedback was positive on mobile designs\n\n📊 QUALITY METRICS:\n- Completed on time (240 minutes estimated, 235 actual)\n- Zero rework required after stakeholder review\n- All accessibility requirements addressed upfront\n\n🚀 NEXT ACTIONS ENABLED:\n- UI design team can start visual designs\n- Development team has clear structure to follow\n- Content team knows required copy sections"
  }
}
```

**Response:**

```json
{
  "id": "789abcde-e89b-12d3-a456-426614174002",
  "title": "Research competitor websites",
  "status": "completed",
  "completedAt": "2024-01-15T14:30:00Z",
  "progress": 100
}
```

### Updating Task Properties

**Change task priority:**

```json
{
  "tool": "set_task_priority",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "priority": 4
  }
}
```

**Add tags to a task:**

```json
{
  "tool": "add_task_tags",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "tags": ["client-review", "milestone"]
  }
}
```

**Update task details:**

```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "title": "Create and review wireframes for main pages",
    "description": "Design wireframes for home, about, services, and contact pages. Include client review session.",
    "estimatedDuration": 300
  }
}
```

## 📊 Project Overview

### List All Your Projects

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "limit": 20
  }
}
```

**Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Website Redesign Project",
    "taskCount": 3,
    "completedCount": 1,
    "progress": 33,
    "projectTag": "web-development",
    "lastUpdated": "2024-01-15T14:30:00Z"
  },
  {
    "id": "987fcdeb-e89b-12d3-a456-426614174003",
    "title": "Marketing Campaign Q1",
    "taskCount": 8,
    "completedCount": 3,
    "progress": 38,
    "projectTag": "marketing",
    "lastUpdated": "2024-01-14T16:45:00Z"
  }
]
```

### Filter Projects by Tag

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "projectTag": "web-development",
    "limit": 10
  }
}
```

### Get Detailed Project View

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "includeCompleted": true
  }
}
```

## 🎯 Task Analysis

### Analyze Task Complexity

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Create a responsive website header with navigation menu, logo, and search functionality",
    "context": "React.js frontend development project",
    "maxSuggestions": 3
  }
}
```

**Response:**

```json
{
  "complexity": {
    "score": 6.5,
    "level": "Medium-High",
    "factors": [
      "Multiple components required",
      "Responsive design considerations",
      "Interactive functionality",
      "Integration requirements"
    ]
  },
  "estimatedDuration": 180,
  "confidence": 0.75,
  "suggestions": [
    "Break down into smaller tasks: Logo component, Navigation menu, Search functionality",
    "Consider mobile-first responsive design approach",
    "Plan for accessibility requirements (ARIA labels, keyboard navigation)"
  ]
}
```

### Get Task Suggestions

```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "style": "practical",
    "maxSuggestions": 5
  }
}
```

## 🔄 Bulk Operations

### Create Multiple Tasks at Once

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "operations": [
      {
        "type": "create",
        "data": {
          "title": "Set up development environment",
          "priority": 4,
          "tags": ["setup", "development"],
          "estimatedDuration": 60
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Install required dependencies",
          "priority": 4,
          "tags": ["setup", "dependencies"],
          "estimatedDuration": 30
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Configure build system",
          "priority": 3,
          "tags": ["setup", "build"],
          "estimatedDuration": 90
        }
      }
    ]
  }
}
```

### Update Multiple Task Priorities

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
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
        "type": "set_priority",
        "taskId": "task-id-3",
        "priority": 3
      }
    ]
  }
}
```

## 🗂️ Project Management

### Archive Completed Projects

```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "completed-project-id",
    "permanent": false
  }
}
```

### Permanently Delete Old Projects

```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "old-project-id",
    "permanent": true
  }
}
```

## 📈 Progress Tracking

### Check Project Progress

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

The response includes progress information:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Website Redesign Project",
  "taskCount": 5,
  "completedCount": 2,
  "progress": 40,
  "tasks": [...]
}
```

### Track Time Estimates

**View total estimated time:**

```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": ["pending", "in_progress"]
  }
}
```

The response includes time estimates for remaining work.

## 🎨 Best Practices Workflow Patterns

### Daily Methodology-Driven Workflow

**Morning Planning (Plan and Reflect)**

1. **Analyze current project state:**

   ```json
   {
     "tool": "analyze_task_dependencies",
     "parameters": { "listId": "project-id" }
   }
   ```

2. **Find ready tasks with context:**

   ```json
   {
     "tool": "get_ready_tasks",
     "parameters": { "listId": "project-id", "limit": 5 }
   }
   ```

3. **Research task before starting (Use Tools, Don't Guess):**

   ```json
   { "tool": "get_list", "parameters": { "listId": "project-id" } }
   ```

4. **Check for related completed work:**
   ```json
   {
     "tool": "search_tool",
     "parameters": { "query": "related-keywords", "includeCompleted": true }
   }
   ```

**During Execution** 5. **Update progress regularly:**

```json
{
  "tool": "update_task",
  "parameters": {
    "taskId": "current-task",
    "description": "PROGRESS UPDATE: ..."
  }
}
```

6. **Track exit criteria completion:**
   ```json
   {
     "tool": "update_exit_criteria",
     "parameters": { "criteriaId": "criteria-id", "isMet": true }
   }
   ```

**End of Day (Persist Until Complete)** 7. **Verify all criteria before completion:**

```json
{ "tool": "get_list", "parameters": { "listId": "project-id" } }
```

8. **Complete only when ready:**

   ```json
   { "tool": "complete_task", "parameters": { "taskId": "task-id" } }
   ```

9. **Reflect and document learnings:**
   ```json
   {
     "tool": "update_task",
     "parameters": { "description": "COMPLETED - Key learnings: ..." }
   }
   ```

### Weekly Planning with Investigation

**Monday: Project Analysis**

1. **Review all projects with context:**

   ```json
   { "tool": "list_all_lists", "parameters": { "limit": 20 } }
   ```

2. **Analyze dependencies and bottlenecks:**

   ```json
   {
     "tool": "analyze_task_dependencies",
     "parameters": { "listId": "each-project-id" }
   }
   ```

3. **Identify critical path items:**
   ```json
   {
     "tool": "search_tool",
     "parameters": { "priority": [4, 5], "isReady": true }
   }
   ```

**Tuesday-Friday: Execution with Methodology** 4. **Daily ready task analysis:**

```json
{ "tool": "get_ready_tasks", "parameters": { "listId": "project-id" } }
```

5. **Research before starting each task:**

   ```json
   {
     "tool": "search_tool",
     "parameters": { "query": "task-context", "includeCompleted": true }
   }
   ```

6. **Execute with continuous updates and exit criteria tracking**

**Friday: Reflection and Planning** 7. **Review completed work:**

```json
{
  "tool": "search_tool",
  "parameters": { "status": ["completed"], "dateRange": "this-week" }
}
```

8. **Analyze what's ready for next week:**
   ```json
   { "tool": "get_ready_tasks", "parameters": { "limit": 20 } }
   ```

### Task Cleanup Workflow

1. **Find completed tasks:**

   ```json
   { "tool": "search_tool", "parameters": { "status": ["completed"] } }
   ```

2. **Archive old completed tasks:**

   ```json
   {
     "tool": "remove_task",
     "parameters": { "listId": "project-id", "taskId": "old-task-id" }
   }
   ```

3. **Update task priorities:**
   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

### Project Setup Workflow

1. **Create project list:**

   ```json
   {
     "tool": "create_list",
     "parameters": { "title": "New Project", "projectTag": "category" }
   }
   ```

2. **Add initial tasks:**

   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

3. **Set up task priorities:**

   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

4. **Review project structure:**
   ```json
   {
     "tool": "show_tasks",
     "parameters": { "listId": "project-id", "groupBy": "priority" }
   }
   ```

## 💡 Methodology-Driven Best Practices

### Plan and Reflect Principles

**Before Starting Any Task:**

- Use `analyze_task` to understand complexity
- Use `search_tool` to find related completed work
- Use `get_list` to understand full project context
- Create detailed action plans with specific steps

**After Completing Tasks:**

- Document key learnings and discoveries
- Update task descriptions with outcomes
- Reflect on what worked well and what didn't
- Use insights to improve future task planning

### Use Tools, Don't Guess Guidelines

**Always Investigate First:**

```json
// Instead of assuming, always check:
{"tool": "search_tool", "parameters": {"query": "authentication", "includeCompleted": true}}
{"tool": "analyze_task_dependencies", "parameters": {"listId": "project-id"}}
{"tool": "get_ready_tasks", "parameters": {"listId": "project-id"}}
```

**Research Patterns:**

- Check completed tasks for similar work
- Analyze project dependencies before starting
- Verify task context and requirements
- Look for existing solutions or approaches

### Persist Until Complete Standards

**Exit Criteria Best Practices:**

- Define specific, measurable completion requirements
- Include quality checks (testing, review, documentation)
- Set acceptance criteria (stakeholder approval, performance targets)
- Track criteria completion throughout execution

**Quality Completion Checklist:**

- [ ] All exit criteria verified and met
- [ ] Task description updated with final outcomes
- [ ] Key learnings documented for future reference
- [ ] Next actions or dependencies clearly identified
- [ ] Quality metrics recorded (time, rework, satisfaction)

### Effective Task Creation with Investigation

**Task Title Patterns:**

- **Good**: "Implement user authentication with JWT tokens and password hashing"
- **Better**: "Implement secure user authentication system (JWT + bcrypt) with rate limiting"
- **Poor**: "Auth stuff"

**Action Plan Structure:**

```
ACTION PLAN:
1. [Research phase] - Investigate existing solutions
2. [Design phase] - Plan implementation approach
3. [Implementation] - Build core functionality
4. [Testing] - Verify all requirements met
5. [Documentation] - Update guides and handoffs

CONTEXT:
- Why this task matters
- How it fits into larger goals
- Technical constraints or requirements

CONSIDERATIONS:
- Security requirements
- Performance targets
- Integration points
- Future extensibility
```

**Exit Criteria Examples:**

- "Feature works correctly in all supported browsers"
- "Unit test coverage ≥90% for new code"
- "Performance benchmarks meet requirements (<2s load time)"
- "Security review completed and approved"
- "Documentation updated and reviewed"

### Progress Tracking Patterns

**Regular Update Structure:**

```
PROGRESS UPDATE:
✅ COMPLETED: [What's been finished]
🔄 IN PROGRESS: [Current work with details]
⏳ NEXT: [Upcoming steps]
🚧 BLOCKERS: [Any issues or dependencies]
📊 STATUS: [Overall progress percentage]
⏱️ TIME: [Actual vs estimated time]
```

**Exit Criteria Tracking:**

- Update criteria status as work progresses
- Include notes explaining how criteria were met
- Document any changes to original requirements
- Track quality metrics and outcomes

---

These examples cover the most common task management scenarios. For more advanced workflows, see the [Advanced Examples](advanced.md) guide.
