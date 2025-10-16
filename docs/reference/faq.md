# Frequently Asked Questions

## 🚀 Getting Started

### Q: What is the MCP Task Manager?

**A:** The MCP Task Manager is an intelligent Model Context Protocol (MCP) server that provides sophisticated task management capabilities for AI agents. It offers 20 focused tools for creating, managing, and analyzing task lists and tasks, with advanced features like dependency management, exit criteria, and multi-agent orchestration support.

### Q: Which AI agents work with the MCP Task Manager?

**A:** The MCP Task Manager works with any MCP-compatible client, including:

- **Claude Desktop** (Anthropic) - Full natural language integration
- **Kiro IDE** - Complete workspace integration
- **Custom MCP clients** - Any client supporting MCP 1.0+
- **GPT-4** - Via custom MCP client integration

### Q: Do I need to install anything locally?

**A:** No! The recommended approach uses `npx task-list-mcp@latest`, which requires no local installation. You just need:

- Node.js 18.0.0 or higher
- An MCP client (like Claude Desktop)
- A simple configuration file

## 🔧 Installation and Setup

### Q: How do I install the MCP Task Manager?

**A:** The easiest method is using npx:

```bash
# Test the installation
npx task-list-mcp@latest --version

# Configure in your MCP client
```

See the [Installation Guide](../guides/installation.md) for detailed instructions.

### Q: Where do I put the configuration file?

**A:** Configuration file locations:

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/mcp.json`
- **Claude Desktop (Windows)**: `%APPDATA%/Claude/mcp.json`
- **Kiro IDE**: `.kiro/settings/mcp.json` in your workspace
- **Custom clients**: Varies by client

### Q: The server won't start. What should I check?

**A:** Common troubleshooting steps:

1. **Check Node.js version**: `node --version` (must be 18.0.0+)
2. **Test npx access**: `npx task-list-mcp@latest --version`
3. **Clear npm cache**: `npm cache clean --force`
4. **Check configuration syntax**: Validate JSON with `jq . config-file.json`
5. **Restart MCP client** after configuration changes

See the [Troubleshooting Guide](../guides/troubleshooting.md) for more details.

### Q: Can I use this without an internet connection?

**A:** Yes, but with limitations:

- **npx method**: Requires internet for first download, then works offline
- **Global install**: `npm install -g task-list-mcp` works fully offline after installation
- **Local development**: Clone the repository for complete offline usage

## 🛠️ Usage and Features

### Q: How many tools are available?

**A:** The MCP Task Manager provides **20 focused tools** organized in 6 categories:

- **List Management** (4 tools): Create, retrieve, list, delete
- **Task Management** (6 tools): Add, update, remove, complete, priorities, tags
- **Search & Display** (3 tools): Search, filter, formatted display
- **Advanced Features** (2 tools): AI analysis and suggestions
- **Exit Criteria Management** (2 tools): Quality control and completion tracking
- **Dependency Management** (3 tools): Task relationships and workflow optimization

### Q: What's the difference between priority levels?

**A:** Priority levels use a 1-5 scale:

- **5 (Critical)**: Urgent, blocking other work, immediate attention required
- **4 (High)**: Important, time-sensitive, should be done soon
- **3 (Medium)**: Normal priority, regular tasks (default)
- **2 (Low)**: Nice to have, when time permits
- **1 (Minimal)**: Optional, lowest priority, someday/maybe

### Q: What are exit criteria and why should I use them?

**A:** Exit criteria are specific requirements that must be met before a task can be completed. They provide:

- **Quality Control**: Ensure tasks meet standards before completion
- **Progress Tracking**: See exactly what's done and what remains
- **Team Alignment**: Clear expectations for "done"
- **Prevent Rework**: Catch issues before tasks are marked complete

Example:

```json
{
  "exitCriteria": [
    "All unit tests pass with >90% coverage",
    "Code review completed by senior developer",
    "Documentation updated"
  ]
}
```

### Q: How do task dependencies work?

**A:** Task dependencies define prerequisite relationships:

- **Set Dependencies**: Use `set_task_dependencies` to define what must be completed first
- **Automatic Resolution**: System automatically tracks when dependencies are met
- **Ready Tasks**: Use `get_ready_tasks` to find tasks available to work on
- **Circular Detection**: System prevents circular dependency loops
- **Visualization**: Use `analyze_task_dependencies` to see the project structure

### Q: Can I work on multiple projects simultaneously?

**A:** Yes! The system supports unlimited projects:

- **Project Tags**: Organize lists by project using `projectTag`
- **Cross-Project Search**: Search across all projects or filter by specific projects
- **Resource Management**: Track work across multiple projects
- **Portfolio View**: Use `list_all_lists` to see all active projects

## 🔍 Advanced Features

### Q: What is the unified search tool?

**A:** The `search_tool` is a powerful unified interface that replaces separate search and filter tools:

- **Text Search**: Find tasks by title, description, or tags
- **Advanced Filtering**: Filter by status, priority, tags, dependencies
- **Cross-List Search**: Search across all projects or specific lists
- **Dependency-Based Ordering**: Tasks are ordered by dependency completion
- **Pagination**: Handle large result sets efficiently

**Recommendation**: Use `search_tool` instead of the legacy search and filter tools.

### Q: What are bulk operations and when should I use them?

**A:** Bulk operations have been removed from MCP tools and are only available through the REST API. They allow you to perform multiple actions in a single request:

**Use Cases (REST API only):**

- **Sprint Setup**: Create multiple tasks at once (via REST API)
- **Priority Updates**: Adjust priorities for multiple tasks (via REST API)
- **Status Changes**: Mark multiple tasks as complete (via REST API)

**Note**: For MCP clients, use individual tool calls for each operation.

- **Cleanup**: Remove or archive multiple completed tasks

**Benefits:**

- **Efficiency**: Fewer API calls
- **Consistency**: Atomic operations with rollback
- **Performance**: Faster than individual operations

### Q: How does the DAG visualization work?

**A:** DAG (Directed Acyclic Graph) visualization shows task dependencies in multiple formats:

- **ASCII Format**: Human-readable text-based graph
- **DOT Format**: Graphviz-compatible for external rendering
- **Mermaid Format**: Diagram-as-code for documentation

**Use Cases:**

- **Project Planning**: Visualize project structure
- **Bottleneck Identification**: Find tasks blocking others
- **Team Coordination**: Share project structure visually
- **Progress Tracking**: See completion status graphically

## 🚨 Troubleshooting

### Q: I'm getting validation errors. What's wrong?

**A:** The MCP Task Manager includes smart parameter preprocessing, but some common issues:

**Priority Errors:**

```json
// ❌ Wrong
{"priority": "high"}

// ✅ Correct
{"priority": 5}

// 🔄 Auto-converted
{"priority": "5"}  // Automatically becomes 5
```

**UUID Errors:**

```json
// ❌ Wrong
{"listId": "abc-123"}

// ✅ Correct
{"listId": "123e4567-e89b-12d3-a456-426614174000"}
```

**Array Errors:**

```json
// ❌ Wrong
{"tags": "urgent,important"}

// ✅ Correct
{"tags": ["urgent", "important"]}

// 🔄 Auto-converted
{"tags": "[\"urgent\", \"important\"]"}  // JSON string converted
```

### Q: My tasks show as "blocked". What does this mean?

**A:** Tasks are blocked when they have incomplete dependencies:

1. **Check Dependencies**: Use `get_list` to see what's blocking the task
2. **Complete Prerequisites**: Finish the blocking tasks first
3. **Find Ready Tasks**: Use `get_ready_tasks` to see what you can work on now
4. **Remove Dependencies**: Use `set_task_dependencies` with empty array if dependencies are no longer needed

### Q: Can I undo operations like deleting tasks or lists?

**A:** Currently, the system provides:

- **Permanent Delete**: Lists are permanently deleted when requested
- **Backup System**: Automatic backups for data recovery
- **Task Removal**: Tasks are removed but lists maintain history

**Future Enhancement**: Full undo/redo functionality is planned for future versions.

### Q: How much data can the system handle?

**A:** Current limits and performance:

- **Tasks per List**: 1,000 (recommended), tested up to 10,000+
- **Total Lists**: Unlimited (limited by storage)
- **Concurrent Operations**: 100+ simultaneous requests
- **Response Time**: ~5ms for create, ~2ms for read operations
- **Memory Usage**: ~145MB typical, stable under load

## 🔒 Security and Data

### Q: Where is my data stored?

**A:** Data storage depends on configuration:

- **File Storage** (default): Local JSON files in `DATA_DIRECTORY`
- **Memory Storage**: In-memory only (for testing/development)
- **Location**: Configurable via `DATA_DIRECTORY` environment variable

**Default Locations:**

- **Development**: `./data` in current directory
- **Production**: User-specified secure location

### Q: Is my data secure?

**A:** Security features include:

- **Local Storage**: Data stays on your machine by default
- **File Permissions**: Configurable directory permissions
- **No Network Access**: Server doesn't communicate externally
- **Backup Encryption**: Planned for future versions

**Recommendations:**

- Use secure directory permissions (700 or 750)
- Regular backups of `DATA_DIRECTORY`
- Monitor access logs if enabled

### Q: Can multiple users share the same data?

**A:** Currently, the system is designed for single-user operation:

- **Single Instance**: One server instance per user/workspace
- **No Authentication**: No built-in user management
- **File Locking**: Basic file-level concurrency control

**Future Enhancement**: Multi-user support with authentication is planned.

## 🚀 Performance and Scaling

### Q: How fast is the MCP Task Manager?

**A:** Performance characteristics:

- **Response Time**: < 10ms for most operations
- **Throughput**: 900+ operations per second
- **Memory Usage**: Stable at ~145MB under normal load
- **Startup Time**: < 2 seconds for server initialization

### Q: Can I use this for large projects?

**A:** Yes, the system handles large projects well:

- **Tested Scale**: 1M+ tasks across multiple lists
- **Performance**: Linear scaling with data size
- **Memory Management**: Efficient storage and caching
- **Optimization**: Built-in performance monitoring

**Best Practices for Large Projects:**

- Use pagination for large result sets
- Filter searches to specific lists when possible
- Use bulk operations for efficiency
- Monitor memory usage in production

### Q: What happens if the server crashes?

**A:** The system includes robust error handling:

- **Atomic Operations**: File operations are atomic
- **Automatic Backups**: Regular backup creation
- **Data Integrity**: Consistency checks on startup
- **Recovery**: Automatic recovery from backups if needed

## 🔄 Updates and Maintenance

### Q: How do I update to the latest version?

**A:** Update methods depend on installation:

**npx Method (Recommended):**

```bash
# Automatically uses latest version
npx task-list-mcp@latest --version
```

**Global Installation:**

```bash
npm update -g task-list-mcp
```

**Development Installation:**

```bash
git pull origin main
npm install
npm run build
```

### Q: Will updates break my existing data?

**A:** The system maintains backward compatibility:

- **Data Migration**: Automatic migration for data format changes
- **API Compatibility**: Tool interfaces remain stable
- **Backup Creation**: Automatic backup before major updates
- **Rollback Support**: Ability to restore from backups

### Q: How do I backup my data?

**A:** Backup strategies:

**Automatic Backups:**

- Enabled by default in production
- Stored in `DATA_DIRECTORY/backups/`
- Configurable retention period

**Manual Backup:**

```bash
# Copy entire data directory
cp -r $DATA_DIRECTORY /path/to/backup/

# Or use system backup tools
tar -czf task-manager-backup.tar.gz $DATA_DIRECTORY
```

## 📞 Getting Help

### Q: Where can I get more help?

**A:** Support resources:

- **[Documentation](../readme.md)**: Comprehensive guides and examples
- **[Troubleshooting Guide](../guides/troubleshooting.md)**: Common issues and solutions
- **[GitHub Issues](https://github.com/keyurgolani/task-list-mcp/issues)**: Bug reports and feature requests
- **[Discussions](https://github.com/keyurgolani/task-list-mcp/discussions)**: Community Q&A

### Q: How do I report a bug?

**A:** When reporting bugs, include:

1. **System Information**: OS, Node.js version, MCP client
2. **Configuration**: Environment variables and settings
3. **Steps to Reproduce**: Exact steps that cause the issue
4. **Expected vs Actual**: What should happen vs what actually happens
5. **Error Messages**: Complete error messages and logs

### Q: Can I contribute to the project?

**A:** Yes! Contributions are welcome:

- **Bug Reports**: Help identify and fix issues
- **Feature Requests**: Suggest new capabilities
- **Code Contributions**: Submit pull requests
- **Documentation**: Improve guides and examples
- **Testing**: Help test new features

See the [Contributing Guide](../../contributing.md) for details.

---

**Still have questions?** Check the [Troubleshooting Guide](../guides/troubleshooting.md) or create an issue on [GitHub](https://github.com/keyurgolani/task-list-mcp/issues).
