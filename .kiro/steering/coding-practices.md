# Coding Practices and Standards

This document defines comprehensive coding practices and standards for the Task MCP Unified system. It covers TypeScript standards, naming conventions, testing methodology, architectural patterns, error handling, and performance requirements as specified in the system requirements.

## File and Directory Management

### Kiro Directory Protection

- Never delete specs or any files under `.kiro` directory
- Always ignore the entire `.kiro` directory from git commits
- Preserve all specification and configuration files

### File Creation and Reuse

- Before creating any file, search the project to check if it already exists
- Repurpose existing files instead of creating duplicates
- Avoid creating alternative, compatible, temporary, or backup versions of files
- One canonical version per functionality - no versioned alternatives
- When starting any task, search through the project for existing files or similar functionality before creating new files

### File Migration and Refactoring

- When reorganizing files for domain-oriented architecture, recreate files from scratch in target directories
- Write unit tests from scratch for each recreated file
- Delete original files and tests only after new versions are complete and tested
- Follow domain-driven directory structure for intuitive code organization
- When refactoring, search repository-wide for patterns being migrated or removed
- Update all instances of patterns being migrated or removed throughout the entire codebase

### Naming Conventions

- No fluff qualifiers in names: avoid "improved", "enhanced", "compatible", "optimized", "simple", "sample", "basic", "comprehensive"
- Name based on functional purpose, not development state
- Apply name changes consistently across variables, classes, files, tests, and documentation
- Use "task" terminology throughout - never "todo"
- Enforce kebab-case for file names
- Enforce PascalCase for class names
- Enforce camelCase for function and variable names
- Enforce PascalCase for interface names without I prefix
- Enforce SCREAMING_SNAKE_CASE for constants
- Remove enum naming prefixes and suffixes
- Remove state qualifiers (is, has, was, will, etc.) from names
- Remove quality qualifiers (good, bad, valid, invalid, etc.) from names
- Remove scope qualifiers (global, local, temp, etc.) from names
- Remove redundant type information (Manager, Handler, Service suffixes) from names

## TypeScript Standards

### Strict Mode Compliance

- Enable TypeScript strict mode with zero errors and zero warnings
- Enable noImplicitAny to require explicit typing
- Enable strictNullChecks for explicit null/undefined handling
- Remove all `@ts-ignore` and `@ts-expect-error` comments
- Fix underlying issues instead of ignoring TypeScript errors

### Type Safety Requirements

- Replace all explicit `any` types with proper type definitions
- Use proper TypeScript typing throughout the codebase
- No implicit any types allowed anywhere
- Explicit handling of null and undefined values
- Comprehensive type definitions for all interfaces and classes

### ESLint Configuration

- Enable ESLint no-unused-vars rule and remove all unused variables
- Enable ESLint no-console rule and replace console statements with proper logging
- Enable ESLint prefer-const rule and convert let to const where possible
- Enable ESLint import/order rule for consistent import ordering
- Enable @typescript-eslint/no-explicit-any rule to prevent any types

### Code Formatting

- Configure Prettier with consistent formatting rules
- Apply Prettier formatting to entire workspace
- Maintain consistent code style across all files
- Integrate Prettier with development workflow

## Code Quality Standards

### Error and Warning Management

- Treat every warning as an error
- Never compromise on quality standards
- Fix all build, test, and validation failures immediately
- No bypassing verification with `--no-verify` or similar flags unless explicitly requested
- Zero TypeScript compilation errors and warnings required

### Simplicity and Engineering

- Simple is better - avoid over-engineering
- Implement solid, straightforward, functional foundations
- Prefer clear, maintainable code over complex solutions
- Focus on maintainability and readability

## Testing Requirements

### Test Organization

- Unit tests mirror source code directory structure exactly
- One unit test file per source code file
- Minimum 95% line coverage, 90% branch coverage per unit test
- Integration tests in each domain directory following domain-oriented architecture
- End-to-end tests for application interfaces (MCP, REST, UI)
- Configure coverage testing to cover only directories meant to be tested
- Each test file should be executable independently with own setup, mocks, and teardown
- Each test file must close all spawned threads to prevent memory leaks

### Test Execution

- All tests run with --run flag or timeout commands
- Use generous timeouts for shell commands based on complexity (e.g., `timeout 30s npm test --run`)
- Use `/tmp/tasks-server-tests` as default test directory
- No commands should wait for user intervention
- Ensure no commands are stuck waiting for user input

### Test Quality and Maintenance

- Update unit tests when changing source code
- Execute unit tests immediately after source changes
- Fix failing tests before proceeding to next file
- Investigate and resolve flaky tests thoroughly - never ignore them
- Flaky tests indicate fundamental application or test setup issues and must be fixed from the root
- Remove outdated tests only after thorough investigation
- All tests are mandatory - no optional testing
- Any changes in source code must be matched with changes in relevant unit tests
- After making changes to every file, execute unit tests for that file immediately

## Development Workflow

### Change Management

- Search repository-wide when refactoring to ensure complete cleanup
- Update all instances of patterns being migrated or removed
- Match source code changes with corresponding test updates
- Execute tests after each file modification
- Surgically remove unused features and dead code completely
- Go through each search result when refactoring to ensure intentional cleanup

### Architectural Refactoring

- Recreate files from scratch when moving between domains
- Follow domain-driven architecture principles strictly
- Remove monitoring, alerting, and intelligence features that create resource leaks
- Eliminate bulk operations, statistics, caching, and suggestion features
- Remove task ordering features - use dependency-based ordering only
- Surgically remove and cleanup all types of alerting and monitoring systems
- Remove intelligence features like task suggestions and complexity analysis completely
- Remove statistics management, caching and suggestion features from the application

### Command Execution

- Use timeout commands for all shell operations
- Ensure no commands wait for user intervention
- Example: `timeout 30s npm test --run`
- Build from scratch and test extensively at milestones
- Every shell command should use generous timeout according to command complexity

### Documentation and Cleanup

- Keep documentation current with code changes and up-to-date
- Investigate thoroughly before deleting outdated documentation
- Maintain clean codebase by removing dead code
- Clean up temporary files and maintain workspace organization
- When tests and documentation become irrelevant or outdated, do thorough investigation before deleting

## Core Development Principles

### Plan and Reflect

- Plan thoroughly before every tool call
- Reflect on outcomes after execution
- Document decisions and rationale

### Use Tools, Don't Guess

- Open and examine files when uncertain
- Never hallucinate about code or file contents
- Verify assumptions with actual file inspection

### Persist Until Complete

- Continue working until job is completely solved
- Don't leave tasks partially finished
- Ensure all related components are updated consistently

### Responsibility and Ownership

- Take ownership of the entire application
- Fix unrelated failures discovered during work - unrelated doesn't mean ignore
- Dive deep to identify root causes of issues
- Maintain application integrity across all changes
- Validate complete project state after each task completion

## Domain Architecture Requirements

### Domain Organization

- Organize code into clear domain boundaries
- Configuration Management domain for user settings and environment variables
- MCP Tools domain with consolidated schema and handlers
- Application Model domain for all entity definitions
- Core Orchestration domain for CRUD operations
- Data Delegation domain for multiple backing stores
- Data Access domain for storage implementations
- REST API domain parallel to MCP tools

### Configuration Management

- Accept environment variables from MCP configuration
- Support JSON/YAML configuration files for REST API
- Default to `/tmp/tasks-server` if no configuration provided
- Support multiple backing data store configurations

## Quality Assurance Standards

### Comprehensive Validation

- Achieve zero TypeScript errors and warnings
- Maintain strict TypeScript compliance
- Remove all `@ts-ignore`, `@ts-expect-error`, and `eslint-disable` patterns
- Replace all `any` types with proper typing
- Ensure all tests pass with proper coverage
- Validate code quality, functionality, best practices, and documentation
- Every warning should be treated as error - quality standards are utmost priority
- Never use `--no-verify` or any other verification bypass methods unless explicitly requested
- Simple is better - avoid over-engineering, prefer solid, straightforward, functional foundations

### Task Completion Validation

- Execute comprehensive validation after each task
- Fix all issues found - never just report them
- Bring workspace to expected state before ending
- Validate build success, test coverage, and GitHub hosting readiness
- No matter if failure is unrelated to current task - take ownership and fix all failures
- Dive deep to identify root causes of issues and fix them properly
- Maintain application integrity across all changes

### Failure and Error Handling

- Any failure in build, test, or validation must be fixed immediately
- Unrelated failures are still your responsibility to fix
- Flaky tests must be investigated thoroughly and root cause fixed
- Never ignore flaky tests - they indicate fundamental issues
- Take ownership of the entire application and fix discovered issues

## System Architecture Requirements

### Domain-Driven Organization

- Organize code into clear domain boundaries
- Configuration Management domain for user settings and environment variables
- MCP Tools domain with consolidated schema and handlers
- Application Model domain for all entity definitions
- Core Orchestration domain for CRUD operations
- Data Delegation domain for multiple backing stores
- Data Access domain for storage implementations
- REST API domain parallel to MCP tools
- Follow domain-driven directory structure for intuitive code organization

### Data Flow and Access Patterns

- All MCP and REST handlers must use Core Orchestration domain only
- No direct data store access from handlers
- Mandatory data flow through orchestrators
- Data delegation layer enforces proper access patterns

## Feature Management and Cleanup

### Prohibited Features

- No monitoring systems or infrastructure
- No alerting systems of any kind
- No intelligence features (suggestions, complexity analysis)
- No statistics management or calculation
- No caching implementations
- No task ordering features (use dependency-based ordering only)
- No archiving functionality (permanent deletion only)
- No bulk operations in MCP server (REST API only)
- No multiple task display formats (one simple format only)

### Required Features

- Dependency-based task ordering via get_ready_tasks
- Circular dependency detection and prevention with O(n) performance
- Agent prompt template system for multi-agent environments
- Comprehensive search and filter capabilities
- Modern tag validation (emoji, uppercase, unicode support)
- Task status management (pending, in_progress, completed, cancelled)
- List metadata management (title, description, projectTag updates)
- Enhanced error handling with descriptive messages and actionable guidance
- Performance requirements: simple templates < 10ms, complex templates < 50ms

## Terminology and Consistency

### Required Terminology

- Use "task" terminology throughout - never "todo"
- TaskList instead of TodoList
- Task instead of TodoItem
- TaskStatus instead of TodoStatus
- Consistent terminology across all files, variables, classes, tests, documentation

### Forbidden Terminology

- No "todo" anywhere in codebase
- No fluff qualifiers in names
- No state, quality, or scope qualifiers
- No redundant type information in names
- No version indicators in names (v2, new, old, legacy, temp, backup, compat, sample)

## Validation and Testing Standards

### Coverage Requirements

- Minimum 95% line coverage per unit test file
- Minimum 90% branch coverage per unit test file
- Coverage testing configured for source directories only
- No coverage reduction due to untestable directories

### Test Structure Requirements

- Unit tests mirror source code directory structure exactly
- One unit test file per source code file
- Integration tests in each domain directory
- End-to-end tests for all application interfaces
- Each test file executable independently
- All spawned threads must be closed to prevent leaks

### Validation Process

- Run comprehensive validation after each task completion
- Fix all discovered issues immediately
- Validate TypeScript compilation (zero errors/warnings)
- Validate test coverage meets thresholds
- Validate build success and functionality
- Validate workspace cleanliness and organization

## Implementation Standards

### File and Code Management

- Search before creating - repurpose existing files when possible
- Recreate files from scratch when moving between domains
- Delete original files only after new versions are tested
- Remove dead code and unused files surgically
- Maintain clean workspace with only necessary files

### Error Handling and Quality

- Descriptive error messages with context and actionable guidance
- Proper TypeScript typing throughout (no `any` types)
- No TypeScript ignore comments (`@ts-ignore`, `@ts-expect-error`)
- No ESLint disable comments
- All warnings treated as errors

### Development Process

- Plan thoroughly before every tool call
- Use tools to verify - never guess or hallucinate
- Persist until job is completely solved
- Execute tests immediately after each file change
- Build and test extensively at milestones
- Take ownership of entire application integrity

## Performance Requirements

### Template Rendering Performance

- Simple templates must complete in under 10ms
- Complex templates must complete in under 50ms
- Template compilation caching for repeated use
- Performance metrics collection and monitoring

### Dependency Detection Performance

- Circular dependency detection must complete in O(n) time complexity
- Support for dependency graphs with 10,000+ nodes
- Optimized memory usage for large dependency graphs
- Efficient dependency analysis for comprehensive results

### Search and Operation Performance

- Search operations must support pagination for large datasets
- System operations must provide performance metrics
- Error responses must include timing information for debugging
- Large dataset processing must maintain responsive performance
- Memory usage optimization and proper resource cleanup

## Architectural Patterns

### Domain-Driven Design

- Organize code into clear domain boundaries with intuitive structure
- Configuration Management domain for user settings and environment variables
- MCP Tools domain with consolidated schema and handlers
- Application Model domain for all entity definitions
- Core Orchestration domain for CRUD operations and business rules
- Data Delegation domain for multiple backing stores
- Data Access domain for storage implementations
- REST API domain parallel to MCP tools

### Orchestration Layer Requirements

- All MCP and REST handlers must use Core Orchestration domain only
- No direct data store access from handlers
- Mandatory data flow through orchestrators
- Data delegation layer enforces proper access patterns
- Centralized business rule enforcement in orchestrator classes
- Consistent validation patterns across all orchestrators

### Error Handling Patterns

- Descriptive error messages with context and actionable guidance
- Include current values, expected values, and guidance in errors
- Proper error types for different failure scenarios
- Comprehensive error logging without sensitive data exposure
- Error responses include timing information for debugging
