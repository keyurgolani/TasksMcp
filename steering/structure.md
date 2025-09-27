# Project Structure

## Directory Organization

The project follows a clean architecture pattern with clear separation of concerns:

```
src/
├── api/              # MCP protocol layer
│   ├── handlers/     # MCP tool implementations (18 tools)
│   └── tools/        # Tool definitions and schemas
├── app/              # Application entry points
│   ├── server.ts     # Main MCP server
│   ├── cli.ts        # Command-line interface
│   └── health-check.ts # Health monitoring
├── domain/           # Business logic (domain-driven design)
│   ├── intelligence/ # AI-powered analysis and suggestions
│   ├── lists/        # Todo list management
│   └── tasks/        # Task operations and dependencies
├── infrastructure/   # External concerns
│   ├── config/       # Configuration management
│   ├── monitoring/   # Performance and health monitoring
│   └── storage/      # Data persistence backends
└── shared/           # Cross-cutting concerns
    ├── errors/       # Error handling and recovery
    ├── logs/         # Logging utilities
    ├── types/        # TypeScript type definitions
    └── utils/        # Pure utility functions
```

## Key Architectural Patterns

### Clean Architecture
- **Domain layer** contains business logic independent of external concerns
- **Infrastructure layer** handles external dependencies (storage, monitoring)
- **API layer** manages MCP protocol communication
- **Shared layer** provides common utilities and types

### Dependency Injection
- Storage backends injected into domain managers
- Configuration injected at startup
- Monitoring systems configured through dependency injection

### Error Handling Strategy
- Centralized error handling in `shared/errors/`
- Structured error reporting with context
- Retry logic with exponential backoff
- Agent-friendly error messages with actionable guidance

## File Naming Conventions

### TypeScript Files
- **kebab-case** for file names: `todo-list-manager.ts`
- **PascalCase** for class names: `TodoListManager`
- **camelCase** for functions and variables: `createTodoList`
- **SCREAMING_SNAKE_CASE** for constants: `MCP_TOOLS`

### Directory Structure Rules
- **Singular nouns** for directories containing multiple related files: `handler/`, `type/`
- **Plural nouns** for directories containing instances: `handlers/`, `types/`
- **Descriptive names** that clearly indicate purpose: `intelligence/`, `monitoring/`

## Import/Export Patterns

### Module Exports
- Use **named exports** for most functions and classes
- Use **default exports** sparingly, only for main entry points
- Provide **index.ts** files for clean imports from directories

### Import Organization
```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';

// 2. External dependencies
import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// 3. Internal imports (relative paths with .js extension)
import { TodoListManager } from '../domain/lists/todo-list-manager.js';
import { logger } from '../shared/utils/logger.js';
```

## Configuration Management

### Environment-Based Configuration
- **Development**: Enhanced debugging, verbose logging
- **Production**: Optimized performance, minimal logging
- **Test**: Fast execution, memory storage, deterministic behavior

### Configuration Files
- `src/infrastructure/config/` - Configuration management
- Environment variables for runtime configuration
- Type-safe configuration with Zod validation

## Testing Structure

```
tests/
├── integration/      # End-to-end MCP protocol tests
├── unit/            # Individual component tests
└── utils/           # Test utilities and helpers
```

### Testing Patterns
- **Unit tests** for individual functions and classes
- **Integration tests** for MCP tool workflows
- **Test utilities** for common setup and mocking
- **Vitest** with Node.js environment for fast execution

## Documentation Structure

```
docs/
├── api/             # Complete API documentation
├── configuration/   # Setup and configuration guides
├── examples/        # Usage examples and patterns
├── reference/       # Reference materials and FAQ
└── tutorials/       # Step-by-step tutorials
```

## Build Artifacts

```
dist/
├── api/             # Compiled API layer
├── app/             # Compiled application entry points
├── domain/          # Compiled business logic
├── infrastructure/  # Compiled infrastructure
├── shared/          # Compiled shared utilities
├── index.js         # Main entry point
└── .tsbuildinfo     # TypeScript incremental build cache
```

## Development Workflow

1. **Source changes** in `src/` directory
2. **TypeScript compilation** to `dist/` directory
3. **Minification** for production builds
4. **Testing** with Vitest
5. **Validation** with project validation script

## Key Design Principles

- **Single Responsibility** - Each module has one clear purpose
- **Dependency Inversion** - Depend on abstractions, not concretions
- **Interface Segregation** - Small, focused interfaces
- **Open/Closed Principle** - Open for extension, closed for modification
- **Type Safety** - Strict TypeScript with no `any` types