# Design Document

## Overview

The concurrent mode configuration feature adds intelligent multi-agent coordination capabilities to the MCP Task Manager. This design enables the system to adapt its behavior based on deployment context - whether it's serving multiple AI agents working in parallel or a single agent working sequentially through tasks.

The system maintains full backward compatibility while providing smart defaults that prevent task conflicts in multi-agent environments and optimize task resumption in single-agent scenarios. The design prioritizes explicit control for agents while providing sensible defaults based on the operational mode.

## Architecture

### Configuration Layer

The concurrent mode configuration integrates into the existing configuration system:

```
Environment Variables
    ↓
Configuration Parser (enhanced)
    ↓
Concurrent Mode Manager (new)
    ↓
┌─────────────────┬─────────────────┐
│  Task Filtering │  Task Priority  │
│  Logic (new)    │  Logic (new)    │
└─────────────────┴─────────────────┘
    ↓
Existing MCP Tools (enhanced)
```

**Design Rationale**: This layered approach ensures that concurrent mode awareness permeates the system without disrupting existing functionality. The configuration drives behavior changes throughout the task management pipeline.

### Concurrent Mode States

The system operates in two distinct modes:

1. **Concurrent Mode (multi-agent)**: Multiple agents may execute tasks simultaneously
   - Default: Exclude in-progress tasks from ready lists
   - Assumption: In-progress tasks are being handled by other agents
   - Priority: Avoid task conflicts and duplicate work

2. **Single-Agent Mode (sequential)**: One agent executes tasks one at a time
   - Default: Include in-progress tasks in ready lists with high priority
   - Assumption: In-progress tasks were interrupted and need resumption
   - Priority: Resume interrupted work before starting new tasks

**Design Rationale**: These two modes address the fundamental difference in how agents coordinate work. Concurrent mode prevents conflicts, while single-agent mode optimizes for context window recovery.

## Components and Interfaces

### Concurrent Mode Manager

```typescript
interface ConcurrentModeConfig {
  enabled: boolean;
  defaultIncludeInProgress: boolean;
  taskConflictPrevention: boolean;
  agentCoordinationMode: 'concurrent' | 'sequential';
}

class ConcurrentModeManager {
  private config: ConcurrentModeConfig;
  
  constructor(config: ConcurrentModeConfig) {
    this.config = config;
  }
  
  shouldIncludeInProgressTasks(explicitOverride?: boolean): boolean {
    if (explicitOverride !== undefined) {
      return explicitOverride;
    }
    return this.config.defaultIncludeInProgress;
  }
  
  getTaskPriorityStrategy(): TaskPriorityStrategy {
    return this.config.enabled 
      ? new ConcurrentTaskPriorityStrategy()
      : new SequentialTaskPriorityStrategy();
  }
  
  getFilteringStrategy(): TaskFilteringStrategy {
    return this.config.enabled
      ? new ConcurrentTaskFilteringStrategy()
      : new SequentialTaskFilteringStrategy();
  }
}
```

### Task Filtering Strategies

```typescript
interface TaskFilteringStrategy {
  filterReadyTasks(tasks: Task[], includeInProgress?: boolean): Task[];
  prioritizeTasks(tasks: Task[]): Task[];
  explainFiltering(originalCount: number, filteredCount: number): string;
}

class ConcurrentTaskFilteringStrategy implements TaskFilteringStrategy {
  filterReadyTasks(tasks: Task[], includeInProgress?: boolean): Task[] {
    const shouldInclude = includeInProgress ?? false; // Default: exclude in concurrent mode
    
    return tasks.filter(task => {
      if (task.status === 'in_progress' && !shouldInclude) {
        return false; // Exclude in-progress tasks by default
      }
      return this.hasNoIncompletedependencies(task);
    });
  }
  
  prioritizeTasks(tasks: Task[]): Task[] {
    // In concurrent mode, prioritize by priority then creation date
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
  
  explainFiltering(originalCount: number, filteredCount: number): string {
    if (originalCount > filteredCount) {
      return `Filtered ${originalCount - filteredCount} in-progress tasks (concurrent mode active)`;
    }
    return 'No filtering applied';
  }
}

class SequentialTaskFilteringStrategy implements TaskFilteringStrategy {
  filterReadyTasks(tasks: Task[], includeInProgress?: boolean): Task[] {
    const shouldInclude = includeInProgress ?? true; // Default: include in sequential mode
    
    return tasks.filter(task => {
      if (task.status === 'in_progress' && !shouldInclude) {
        return false;
      }
      return this.hasNoIncompletedependencies(task);
    });
  }
  
  prioritizeTasks(tasks: Task[]): Task[] {
    // In sequential mode, prioritize in-progress tasks first
    return tasks.sort((a, b) => {
      // In-progress tasks always come first
      if (a.status === 'in_progress' && b.status !== 'in_progress') {
        return -1;
      }
      if (b.status === 'in_progress' && a.status !== 'in_progress') {
        return 1;
      }
      
      // Among same status, prioritize by priority then creation date
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
  
  explainFiltering(originalCount: number, filteredCount: number): string {
    const inProgressCount = this.countInProgressTasks(tasks);
    if (inProgressCount > 0) {
      return `Prioritized ${inProgressCount} in-progress tasks for resumption (sequential mode active)`;
    }
    return 'No in-progress tasks to prioritize';
  }
}
```

### Enhanced MCP Tool Integration

```typescript
// Enhanced get-ready-tasks handler
class GetReadyTasksHandler {
  constructor(
    private todoListManager: TodoListManager,
    private concurrentModeManager: ConcurrentModeManager
  ) {}
  
  async handle(params: GetReadyTasksParams): Promise<GetReadyTasksResult> {
    const { listId, limit, includeInProgress } = params;
    
    // Get all potentially ready tasks
    const allTasks = await this.todoListManager.getTasks(listId);
    
    // Apply concurrent mode filtering
    const filteringStrategy = this.concurrentModeManager.getFilteringStrategy();
    const readyTasks = filteringStrategy.filterReadyTasks(allTasks, includeInProgress);
    
    // Apply concurrent mode prioritization
    const prioritizedTasks = filteringStrategy.prioritizeTasks(readyTasks);
    
    // Apply limit
    const limitedTasks = prioritizedTasks.slice(0, limit);
    
    // Generate explanation
    const explanation = filteringStrategy.explainFiltering(allTasks.length, readyTasks.length);
    
    return {
      tasks: limitedTasks,
      totalReady: readyTasks.length,
      concurrentMode: this.concurrentModeManager.isEnabled(),
      filteringExplanation: explanation,
      recommendations: this.generateRecommendations(limitedTasks)
    };
  }
  
  private generateRecommendations(tasks: Task[]): string[] {
    const recommendations: string[] = [];
    
    if (this.concurrentModeManager.isEnabled()) {
      recommendations.push('Concurrent mode: Focus on one task to avoid conflicts with other agents');
      if (tasks.length === 0) {
        recommendations.push('No ready tasks available. Other agents may be working on available tasks.');
      }
    } else {
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      if (inProgressTasks.length > 0) {
        recommendations.push(`Sequential mode: Resume ${inProgressTasks.length} in-progress tasks first`);
      }
    }
    
    return recommendations;
  }
}
```

### Configuration Integration

```typescript
// Enhanced configuration parser
interface AppConfig {
  // Existing configuration...
  concurrentMode: ConcurrentModeConfig;
}

class ConfigurationParser {
  static parseEnvironment(): AppConfig {
    const concurrentModeEnabled = process.env.MCP_CONCURRENT_MODE === 'true';
    
    return {
      // Existing configuration parsing...
      concurrentMode: {
        enabled: concurrentModeEnabled,
        defaultIncludeInProgress: !concurrentModeEnabled, // Inverse relationship
        taskConflictPrevention: concurrentModeEnabled,
        agentCoordinationMode: concurrentModeEnabled ? 'concurrent' : 'sequential'
      }
    };
  }
}
```

## Data Models

### Enhanced Task Query Options

```typescript
interface TaskQueryOptions {
  // Existing options...
  includeInProgress?: boolean; // Explicit override for concurrent mode defaults
  respectConcurrentMode?: boolean; // Whether to apply concurrent mode filtering
  priorityStrategy?: 'concurrent' | 'sequential' | 'custom';
}

interface ReadyTasksResponse {
  tasks: Task[];
  totalReady: number;
  concurrentMode: boolean;
  filteringExplanation: string;
  recommendations: string[];
  agentGuidance?: {
    suggestedAction: string;
    reasoning: string;
  };
}
```

### System Status Enhancement

```typescript
interface SystemStatus {
  // Existing status fields...
  concurrentMode: {
    enabled: boolean;
    coordinationMode: 'concurrent' | 'sequential';
    defaultBehavior: {
      includeInProgressInReady: boolean;
      taskPrioritization: string;
    };
    activeAgents?: number; // If trackable
  };
}
```

## Error Handling

### Concurrent Mode Validation

```typescript
class ConcurrentModeValidator {
  static validateConfiguration(config: ConcurrentModeConfig): ValidationResult {
    const errors: string[] = [];
    
    if (config.enabled && config.defaultIncludeInProgress) {
      errors.push('Concurrent mode should not include in-progress tasks by default');
    }
    
    if (!config.enabled && !config.defaultIncludeInProgress) {
      errors.push('Sequential mode should include in-progress tasks by default');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### Agent Guidance System

```typescript
class AgentGuidanceSystem {
  constructor(private concurrentModeManager: ConcurrentModeManager) {}
  
  generateTaskSelectionGuidance(availableTasks: Task[]): AgentGuidance {
    if (this.concurrentModeManager.isEnabled()) {
      return this.generateConcurrentModeGuidance(availableTasks);
    } else {
      return this.generateSequentialModeGuidance(availableTasks);
    }
  }
  
  private generateConcurrentModeGuidance(tasks: Task[]): AgentGuidance {
    if (tasks.length === 0) {
      return {
        suggestedAction: 'Wait or check for new tasks',
        reasoning: 'All available tasks may be in progress by other agents'
      };
    }
    
    return {
      suggestedAction: `Start with highest priority task: "${tasks[0].title}"`,
      reasoning: 'Focus on one task to avoid conflicts in multi-agent environment'
    };
  }
  
  private generateSequentialModeGuidance(tasks: Task[]): AgentGuidance {
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    
    if (inProgressTasks.length > 0) {
      return {
        suggestedAction: `Resume in-progress task: "${inProgressTasks[0].title}"`,
        reasoning: 'Complete interrupted tasks before starting new work'
      };
    }
    
    return {
      suggestedAction: `Start new task: "${tasks[0].title}"`,
      reasoning: 'No interrupted tasks to resume, begin new work'
    };
  }
}
```

## Testing Strategy

### Unit Testing Approach

1. **Concurrent Mode Manager Tests**: Verify mode detection and strategy selection
2. **Filtering Strategy Tests**: Test both concurrent and sequential filtering logic
3. **Priority Strategy Tests**: Verify task ordering in different modes
4. **Configuration Tests**: Validate environment variable parsing and defaults

### Integration Testing Strategy

1. **Multi-Agent Simulation**: Test concurrent mode with simulated multiple agents
2. **Context Recovery Tests**: Verify sequential mode handles interrupted tasks correctly
3. **Override Behavior Tests**: Ensure explicit parameters override defaults
4. **Tool Integration Tests**: Verify all MCP tools respect concurrent mode settings

### Test Scenarios

```typescript
describe('Concurrent Mode Integration', () => {
  describe('Concurrent Mode Enabled', () => {
    it('should exclude in-progress tasks from ready tasks by default', async () => {
      // Test implementation
    });
    
    it('should include in-progress tasks when explicitly requested', async () => {
      // Test implementation
    });
    
    it('should prioritize tasks by priority in concurrent mode', async () => {
      // Test implementation
    });
  });
  
  describe('Sequential Mode Enabled', () => {
    it('should include in-progress tasks in ready tasks by default', async () => {
      // Test implementation
    });
    
    it('should prioritize in-progress tasks first in sequential mode', async () => {
      // Test implementation
    });
    
    it('should exclude in-progress tasks when explicitly requested', async () => {
      // Test implementation
    });
  });
});
```

## Performance Considerations

### Filtering Performance

```typescript
class OptimizedTaskFilter {
  // Cache filtering results for repeated queries
  private filterCache = new Map<string, Task[]>();
  
  filterTasks(tasks: Task[], strategy: TaskFilteringStrategy, options: TaskQueryOptions): Task[] {
    const cacheKey = this.generateCacheKey(tasks, options);
    
    if (this.filterCache.has(cacheKey)) {
      return this.filterCache.get(cacheKey)!;
    }
    
    const filtered = strategy.filterReadyTasks(tasks, options.includeInProgress);
    const prioritized = strategy.prioritizeTasks(filtered);
    
    this.filterCache.set(cacheKey, prioritized);
    return prioritized;
  }
}
```

### Memory Optimization

- **Strategy Pattern**: Avoid creating new strategy instances for each request
- **Result Caching**: Cache filtered task lists for repeated queries
- **Lazy Loading**: Only apply filtering when tasks are actually requested

**Design Rationale**: Performance optimizations ensure that concurrent mode logic doesn't impact system responsiveness, especially important in multi-agent environments with frequent task queries.

## Security Considerations

### Configuration Security

- **Environment Variable Validation**: Ensure MCP_CONCURRENT_MODE accepts only valid values
- **Default Security**: Safe defaults that prevent task conflicts
- **Override Validation**: Validate explicit override parameters

### Multi-Agent Coordination

- **Task Locking**: Prevent race conditions when multiple agents query simultaneously
- **Audit Logging**: Log concurrent mode decisions for debugging
- **Access Control**: Ensure agents can only override their own task queries

**Design Rationale**: Security measures prevent configuration tampering and ensure safe multi-agent coordination without compromising system integrity.

## Migration and Compatibility

### Backward Compatibility

The design maintains full backward compatibility:

1. **Default Behavior**: When MCP_CONCURRENT_MODE is not set, system behaves as before
2. **API Compatibility**: All existing MCP tools maintain their current interfaces
3. **Response Format**: Enhanced responses include additional fields but maintain existing structure

### Migration Path

1. **Phase 1**: Deploy with concurrent mode disabled (default)
2. **Phase 2**: Enable concurrent mode in multi-agent environments
3. **Phase 3**: Optimize based on usage patterns and feedback

**Design Rationale**: Gradual migration ensures existing deployments continue working while new deployments can benefit from concurrent mode features immediately.