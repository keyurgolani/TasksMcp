# Glossary

## Terms and Definitions

### A

**Agent Prompt Template**
A customizable template system that allows AI agents to receive personalized instructions and context for specific tasks. Supports variable substitution with {{task.*}} and {{list.*}} syntax.

**Auto-Approval**
MCP client configuration that automatically approves specific tool calls without user confirmation, improving workflow efficiency for trusted operations.

### B

**Block Reason**
Information about why a task cannot be started, typically due to incomplete dependencies. Shows which tasks must be completed first.

### C

**Circular Dependency**
A situation where tasks depend on each other in a loop (A depends on B, B depends on C, C depends on A), which prevents any of them from being completed. The system detects and prevents these automatically.

**Core Orchestration**
The central business logic layer that handles all CRUD operations, validation, and business rules. All MCP and REST handlers must use this layer instead of accessing data stores directly.

### D

**Data Delegation**
An architectural layer that enforces proper data access patterns by ensuring all operations go through the orchestration layer rather than directly accessing data stores.

**Dependency Graph**
A visual or logical representation of task relationships showing which tasks depend on others and the order in which they should be completed.

**Domain-Driven Architecture**
An organizational approach that structures code into clear domains based on business functionality rather than technical layers.

### E

**Exit Criteria**
Specific, measurable requirements that must be met before a task can be considered complete. Each criterion can be tracked individually and marked as met or not met.

### F

**Flaky Test**
A test that sometimes passes and sometimes fails without any code changes, indicating fundamental issues in the application or test setup that must be investigated and fixed.

### G

**Get Ready Tasks**
A function that returns tasks with no incomplete dependencies, representing work that can be started immediately.

### L

**List Metadata**
Basic information about a task list including title, description, project tag, creation date, and progress statistics.

### M

**MCP (Model Context Protocol)**
A protocol for AI agents to interact with external tools and services. The Task Manager implements MCP to provide task management capabilities to AI agents.

**Multi-Agent Environment**
A setup where multiple AI agents work together, potentially sharing task lists and coordinating work through the task management system.

### O

**Orchestration Layer**
See Core Orchestration.

### P

**Project Tag**
An organizational label used to group related task lists together, typically representing a project, team, or category.

**Priority**
A numerical value (1-5) indicating task importance, where 5 is highest priority and 1 is lowest priority.

### R

**Ready Tasks**
Tasks that have no incomplete dependencies and can be worked on immediately.

**REST API**
A web service interface that provides HTTP endpoints for all task management operations, complementing the MCP interface.

### S

**Search Tool**
A unified search and filtering interface that replaces legacy separate search and filter tools, providing comprehensive query capabilities.

**Status Transition**
The allowed changes between task statuses (pending → in_progress → completed, etc.) with validation to prevent invalid state changes.

### T

**Task**
A unit of work with properties like title, description, status, priority, tags, dependencies, and exit criteria. Formerly called "TodoItem".

**Task List**
A collection of related tasks, typically representing a project or area of work. Formerly called "TodoList".

**Task Status**
The current state of a task: pending, in_progress, completed, blocked, or cancelled.

**Template Engine**
The system component that processes agent prompt templates, substituting variables with actual task and list data.

**Template Variable**
Placeholders in agent prompt templates ({{task.title}}, {{list.projectTag}}) that get replaced with actual values during rendering.

### U

**UUID (Universally Unique Identifier)**
A 128-bit identifier used for tasks and lists, ensuring uniqueness across different systems and time periods.

### V

**Validation**
The process of checking that data meets required formats, constraints, and business rules before processing operations.

## Architectural Terms

### Configuration Management Domain

Handles environment variables, JSON/YAML configuration files, and feature gating for different deployment scenarios.

### Data Access Domain

Provides abstraction over different storage backends (file system, memory, future database support).

### MCP Tools Domain

Contains consolidated MCP tool definitions and handlers organized by functionality.

### Application Model Domain

Defines all entity types, interfaces, and data structures used throughout the system.

## Methodology Terms

### Plan and Reflect

A best practice approach that emphasizes thorough planning before action and reflection after completion to improve future work.

### Use Tools, Don't Guess

A principle that requires investigating and verifying information using available tools rather than making assumptions.

### Persist Until Complete

A methodology that ensures tasks are only marked complete when all exit criteria are verified and met.

## Technical Terms

### Agent Prompt Rendering

The process of taking a template with variables and producing a final prompt string with actual values substituted.

### Dependency Detection Algorithm

An O(n) time complexity algorithm that identifies circular dependencies in task graphs efficiently.

### Template Performance Targets

- Simple templates: < 10ms rendering time
- Complex templates: < 50ms rendering time

### Coverage Thresholds

- Unit tests: 95% line coverage, 90% branch coverage minimum
- Integration tests: Domain-level coverage requirements

## Legacy Terms (Deprecated)

These terms were used in previous versions but have been replaced:

- **TodoItem** → Task
- **TodoList** → TaskList
- **TodoStatus** → TaskStatus
- **search_tasks** → search_tool
- **filter_tasks** → search_tool (unified)
- **bulk_task_operations** → Individual operations only (bulk available in REST API)

## Common Abbreviations

- **MCP**: Model Context Protocol
- **REST**: Representational State Transfer
- **API**: Application Programming Interface
- **CRUD**: Create, Read, Update, Delete
- **UUID**: Universally Unique Identifier
- **JSON**: JavaScript Object Notation
- **YAML**: YAML Ain't Markup Language
- **CLI**: Command Line Interface
- **UI**: User Interface
