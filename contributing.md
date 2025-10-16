# Contributing to MCP Task Manager

Thank you for your interest in contributing to the MCP Task Manager! This document provides guidelines for contributing to the project.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/task-list-mcp.git
   cd task-list-mcp
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the project**:
   ```bash
   npm run build
   ```
5. **Run tests**:
   ```bash
   npm test
   ```

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 7.0.0 or higher
- **Git**: Latest version

### Environment Setup

1. **Create a development environment**:

   ```bash
   export NODE_ENV=development
   export MCP_LOG_LEVEL=debug
   export STORAGE_TYPE=memory
   ```

2. **Run in development mode**:

   ```bash
   npm run dev
   ```

3. **Run tests with watch mode**:
   ```bash
   npm run test
   ```

## 📝 Code Standards

### TypeScript Guidelines

- **Strict mode**: All code must pass TypeScript strict mode
- **No `any` types**: Use proper typing for all variables and functions
- **Interfaces**: Define clear interfaces for all data structures
- **Error handling**: Comprehensive error handling with proper types

### Code Style

- **ESLint**: Follow the project's ESLint configuration
- **Formatting**: Use consistent formatting (2 spaces, semicolons)
- **Naming**: Use descriptive names for variables, functions, and classes
- **Comments**: Document complex logic and public APIs

### Testing Requirements

- **Unit tests**: All new functions must have unit tests
- **Integration tests**: New features require integration tests
- **Test coverage**: Maintain >90% test coverage
- **Test naming**: Use descriptive test names that explain the scenario

## 🔧 Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-rest-api-bulk-operations`
- `fix/priority-validation-error`
- `docs/update-api-reference`
- `refactor/simplify-error-handling`

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:

- `feat(rest-api): add bulk task operations endpoint`
- `fix(validation): correct priority range validation`
- `docs(readme): update installation instructions`
- `test(integration): add dependency management tests`

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the code standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run the full test suite**:
   ```bash
   npm run test:run
   npm run lint
   npm run build
   ```
6. **Create a pull request** with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots for UI changes
   - Test results

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for full workflows
├── performance/    # Performance and load tests
└── fixtures/       # Test data and utilities
```

### Writing Tests

- **Arrange, Act, Assert**: Structure tests clearly
- **Descriptive names**: Test names should explain the scenario
- **Independent tests**: Each test should be independent
- **Clean up**: Properly clean up resources after tests

Example test:

```typescript
describe('TaskListManager', () => {
  describe('createList', () => {
    it('should create a list with valid parameters', async () => {
      // Arrange
      const manager = new TaskListManager(storage);
      const listData = { title: 'Test List' };

      // Act
      const result = await manager.createList(listData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test List');
    });
  });
});
```

## 📚 Documentation

### Documentation Standards

- **Clear and concise**: Write for developers of all skill levels
- **Examples**: Include practical examples for all features
- **Up-to-date**: Keep documentation synchronized with code changes
- **Markdown**: Use proper Markdown formatting

### Documentation Structure

```
docs/
├── api/            # API reference documentation
├── guides/         # How-to guides and tutorials
├── examples/       # Usage examples and patterns
└── reference/      # Reference materials and FAQs
```

### Updating Documentation

- Update relevant documentation when making code changes
- Add examples for new features
- Update the changelog for significant changes
- Review documentation for accuracy and clarity

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with the latest version**
3. **Reproduce the issue** with minimal steps
4. **Check the documentation** for known limitations

### Bug Report Template

```markdown
## Bug Description

Brief description of the issue

## Steps to Reproduce

1. Step one
2. Step two
3. Step three

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- Node.js version:
- npm version:
- Operating system:
- MCP Task Manager version:

## Additional Context

Any other relevant information
```

## 💡 Feature Requests

### Before Requesting

1. **Check existing issues** for similar requests
2. **Consider the scope** - does it fit the project goals?
3. **Think about implementation** - how would it work?

### Feature Request Template

```markdown
## Feature Description

Clear description of the proposed feature

## Use Case

Why is this feature needed? What problem does it solve?

## Proposed Solution

How should this feature work?

## Alternatives Considered

What other approaches were considered?

## Additional Context

Any other relevant information
```

## 🏗️ Architecture Guidelines

### Project Structure

```
src/
├── api/            # MCP tool handlers and definitions
├── core/           # Core business logic
├── storage/        # Data persistence layer
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```

### Design Principles

- **Single Responsibility**: Each module has one clear purpose
- **Dependency Injection**: Use dependency injection for testability
- **Error Handling**: Comprehensive error handling at all levels
- **Performance**: Optimize for common use cases
- **Extensibility**: Design for future enhancements

## 🚀 Release Process

### Version Management

- **Semantic Versioning**: Follow semver (major.minor.patch)
- **Changelog**: Update CHANGELOG.md for all releases
- **Version Sync**: Keep package.json and version.json synchronized

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Version numbers are bumped
- [ ] Changelog is updated
- [ ] Build artifacts are generated
- [ ] Release notes are prepared

## 🤝 Community Guidelines

### Code of Conduct

- **Be respectful**: Treat all contributors with respect
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Documentation**: Check the docs first
- **Code Review**: Participate in code reviews

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors are recognized in:

- **readme.md**: Major contributors listed
- **Release notes**: Contributors mentioned in releases
- **GitHub**: Automatic contributor recognition

Thank you for contributing to the MCP Task Manager! Your contributions help make this project better for everyone.
