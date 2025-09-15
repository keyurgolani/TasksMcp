# Tests Directory

This directory contains all test-related files and utilities for the MCP Task Manager project.

## Structure

```
tests/
├── unit/                    # Unit tests organized by domain
│   ├── domain/
│   │   ├── lists/          # List management tests (3 files)
│   │   └── tasks/          # Task management tests (2 files)
│   └── shared/
│       ├── errors/         # Error handling tests (1 file)
│       └── utils/          # Utility tests (1 file)
├── integration/            # Integration tests (1 file)
├── performance/            # Performance tests (2 files)
├── utils/                  # Test utilities and helpers
│   └── dataset-generator.ts  # Generates test datasets
└── README.md              # This file
```

## Current Test Coverage

### Unit Tests (7 files)
- **Domain/Lists**: cleanup-suggestion-manager, project-manager, todo-list-manager-action-plans
- **Domain/Tasks**: action-plan-manager, notes-manager  
- **Shared/Errors**: error-handler
- **Shared/Utils**: pretty-print-formatter

### Integration Tests (1 file)
- **notes-integration**: Tests integration between notes and other components

### Performance Tests (2 files)
- **large-dataset**: Tests with large data volumes
- **performance-optimization**: Performance benchmarks

## Test Utilities

### Dataset Generator (`utils/dataset-generator.ts`)
Generates realistic test data for performance benchmarks and testing scenarios:
- Creates todo lists with configurable parameters
- Generates tasks with various statuses, priorities, and complexity
- Supports action plans, implementation notes, and dependencies
- Useful for load testing and development

## Usage

Test utilities can be imported from the tests directory:

```typescript
import { DatasetGenerator } from '../tests/utils/dataset-generator.js';

const generator = new DatasetGenerator();
const testData = generator.generateDataset({
  listCount: 10,
  tasksPerList: 20
});
```

## Best Practices

- Keep test files separate from production source code
- Use descriptive test names and organize by feature
- Include both unit and integration tests
- Use fixtures for consistent test data
- Document complex test scenarios