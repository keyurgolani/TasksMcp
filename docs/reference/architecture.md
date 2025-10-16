# Architecture Overview

## Domain-Driven Architecture

The Task MCP Unified system is built using domain-driven design principles with clear separation of concerns across multiple layers.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Interface Layer                          │
├─────────────────────────────────────────────────────────────┤
│  MCP Server (mcp.js)     │     REST API Server (rest.js)   │
│  - 17 MCP Tools          │     - Full CRUD Operations      │
│  - Agent Integration     │     - Bulk Operations (removed from MCP) │
│  - Parameter Validation  │     - OpenAPI Documentation    │
└─────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────┐
│                 Core Orchestration Layer                   │
├─────────────────────────────────────────────────────────────┤
│  TaskOrchestrator        │  ListOrchestrator               │
│  DependencyOrchestrator  │  SearchOrchestrator             │
│  AgentPromptOrchestrator │  Validation Services            │
└─────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Task Models            │  TaskList Models                 │
│  Repository Interfaces  │  Domain Services                 │
│  Business Logic         │  Domain Events                   │
└─────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Data Delegation Service │ Data Access Service             │
│  Repository Implementations │ Storage Backends             │
│  File Storage           │  Memory Storage                  │
└─────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Configuration Management │ Logging & Error Handling       │
│  Storage Factory         │ Health Monitoring               │
│  Environment Variables   │ JSON/YAML Configuration         │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Principles

### 1. Domain-Driven Design (DDD)

- **Clear Domain Boundaries**: Each domain has specific responsibilities
- **Ubiquitous Language**: Consistent terminology throughout the system
- **Domain Models**: Rich domain objects with business logic
- **Repository Pattern**: Abstract data access behind interfaces

### 2. Orchestration Layer

- **Business Rule Enforcement**: All business logic centralized in orchestrators
- **Data Flow Control**: No direct data access from interface layers
- **Validation**: Comprehensive validation with descriptive error messages
- **Transaction Management**: Atomic operations across domain boundaries

### 3. Multi-Interface Support

- **MCP Server**: Optimized for AI agent integration
- **REST API Server**: Full programmatic access with bulk operations (not available in MCP)
- **Shared Core**: Both interfaces use the same orchestration layer
- **Consistent Behavior**: Same business rules across all interfaces

## Directory Structure

```
src/
├── api/                    # Interface Layer
│   ├── handlers/          # MCP tool implementations
│   ├── mcp/              # MCP server and protocol handling
│   ├── rest/             # REST API server and routes
│   └── tools/            # Tool definitions and schemas
├── core/                  # Core Orchestration Layer
│   └── orchestration/    # Business logic orchestrators
│       ├── interfaces/   # Orchestrator interfaces
│       ├── services/     # Orchestrator implementations
│       └── validators/   # Validation services
├── domain/               # Domain Layer
│   ├── models/          # Domain models (Task, TaskList)
│   ├── tasks/           # Task-specific domain logic
│   ├── lists/           # List-specific domain logic
│   └── repositories/    # Repository interfaces and adapters
├── data/                 # Data Layer
│   ├── access/          # Data access implementations
│   └── delegation/      # Data delegation service
├── infrastructure/       # Infrastructure Layer
│   ├── config/          # Configuration management
│   └── storage/         # Storage backends and utilities
├── shared/              # Shared Utilities
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── errors/          # Error handling utilities
└── app/                 # Application Entry Points
    ├── cli.ts           # Main CLI interface
    ├── health-check.ts  # Health check utilities
    └── server.ts        # Server initialization
```

## Configuration Management

### Environment Variables (MCP Server)

The MCP server uses environment variables for configuration:

```bash
NODE_ENV=production          # Environment mode
MCP_LOG_LEVEL=info          # Logging level
DATA_DIRECTORY=/path/to/data # Data storage location
```

### JSON/YAML Configuration (REST API Server)

The REST API server supports JSON/YAML configuration files:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": true
  },
  "dataStore": {
    "type": "file",
    "location": "/path/to/data"
  }
}
```

## Data Flow

### MCP Tool Request Flow

1. **MCP Client** sends tool request
2. **MCP Handler** validates parameters and preprocesses input
3. **Orchestrator** enforces business rules and validation
4. **Data Delegation** routes to appropriate data access layer
5. **Storage Backend** performs atomic operations
6. **Response** flows back through the same layers

### REST API Request Flow

1. **REST Client** sends HTTP request
2. **REST Controller** validates request and extracts parameters
3. **Orchestrator** enforces business rules (same as MCP)
4. **Data Delegation** routes to appropriate data access layer
5. **Storage Backend** performs atomic operations
6. **HTTP Response** returned with appropriate status codes

## Agent Prompt Template System

### Template Engine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Template Processing                          │
├─────────────────────────────────────────────────────────────┤
│  Template Parser        │  Variable Resolver               │
│  - {{task.*}} variables │  - Task context injection        │
│  - {{list.*}} variables │  - List context injection        │
│  - Syntax validation    │  - Performance optimization      │
└─────────────────────────────────────────────────────────────┘
```

### Performance Requirements

- **Simple Templates**: < 10ms rendering time
- **Complex Templates**: < 50ms rendering time
- **Variable Substitution**: Support for nested object properties
- **Error Handling**: Descriptive errors for invalid templates

## Dependency Management

### Circular Dependency Detection

- **Algorithm**: O(n) time complexity using depth-first search
- **Prevention**: Automatic rejection of circular dependencies
- **Analysis**: Comprehensive dependency graph analysis
- **Visualization**: ASCII, DOT (Graphviz), and Mermaid formats

### Ready Task Identification

- **Dependency-Based Ordering**: Tasks ordered by completion of prerequisites
- **Parallel Execution**: Multiple agents can work on independent tasks
- **Block Reason Calculation**: Clear explanation of why tasks are blocked

## Removed Features

The following features have been completely removed from the system:

### Removed Features (No Longer Available)

The following features have been completely removed from the system:

- **Intelligence Systems**: Task suggestions, complexity analysis, and AI-powered recommendations
- **Monitoring and Notifications**: Performance monitoring and notification systems
- **Statistics Management**: Task statistics calculation and reporting systems
- **Caching Systems**: All caching implementations have been removed for simplicity
- **Task Ordering**: Manual task ordering (tasks are now ordered by dependencies only)
- **Archiving**: Archiving functionality has been removed (permanent deletion only)

## Quality Standards

### TypeScript Compliance

- **Strict Mode**: Enabled with zero errors and warnings
- **No Any Types**: All types explicitly defined
- **Null Safety**: Strict null checks enabled
- **Import Organization**: Consistent import ordering

### Testing Requirements

- **Unit Tests**: 95% line coverage, 90% branch coverage
- **Integration Tests**: Domain-level integration testing
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Template rendering and dependency detection

### Error Handling

- **Descriptive Messages**: Clear, actionable error guidance
- **Context Information**: Current values, expected values, and suggestions
- **Proper Types**: Specific error types for different scenarios
- **Logging**: Comprehensive error logging without sensitive data

## Performance Characteristics

### Response Times

- **CRUD Operations**: ~5ms create, ~2ms read
- **Template Rendering**: <10ms simple, <50ms complex
- **Dependency Analysis**: O(n) circular detection
- **Search Operations**: <100ms with pagination

### Scalability

- **Concurrent Operations**: 100+ simultaneous requests
- **Data Volume**: 1000+ items per list, unlimited lists
- **Memory Usage**: ~145MB typical, stable under load
- **Throughput**: ~900 operations per second sustained

This architecture provides a solid foundation for enterprise-grade task management with clear separation of concerns, comprehensive error handling, and support for multiple interfaces while maintaining high performance and reliability.
