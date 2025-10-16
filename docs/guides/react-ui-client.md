# React UI Client Integration

## Overview

The Task MCP Unified system provides a React-based user interface that offers a beautiful, responsive web application for task management. The React UI integrates with the REST API to provide full functionality through an intuitive interface.

## Architecture

### Component Structure

The React UI follows a domain-driven component architecture:

```
src/ui/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Layout/
│   ├── tasks/
│   │   ├── TaskCard/
│   │   ├── TaskForm/
│   │   ├── TaskList/
│   │   └── TaskFilters/
│   ├── lists/
│   │   ├── ListCard/
│   │   ├── ListForm/
│   │   └── ListSelector/
│   └── dependencies/
│       ├── DependencyGraph/
│       ├── DependencyEditor/
│       └── ReadyTasks/
├── pages/
│   ├── Dashboard/
│   ├── Projects/
│   ├── Tasks/
│   └── Settings/
├── services/
│   ├── api/
│   ├── storage/
│   └── notifications/
└── hooks/
    ├── useTasks/
    ├── useLists/
    └── useDependencies/
```

### Design System

The UI implements a comprehensive design system with:

- **Typography**: Consistent font hierarchy and spacing
- **Color Palette**: Accessible color scheme with proper contrast
- **Components**: Reusable UI components with consistent styling
- **Icons**: Comprehensive icon library for task management
- **Animations**: Subtle micro-animations for enhanced user experience

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run ui:dev

# Build for production
npm run ui:build
```

### Configuration

The React UI connects to the REST API server:

```typescript
// src/ui/config/api.ts
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  retries: 3,
};
```

### Environment Variables

```bash
# .env.local
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENABLE_DEBUG=true
REACT_APP_THEME=light
```

## Core Features

### Dashboard

The dashboard provides an overview of all projects and tasks:

- **Project Cards**: Visual representation of task lists with progress indicators
- **Recent Activity**: Timeline of recent task updates and completions
- **Quick Actions**: Fast access to common operations
- **Statistics**: Visual charts showing productivity metrics

### Task Management

Comprehensive task management interface:

- **Task Cards**: Rich task display with priority indicators, tags, and progress
- **Drag & Drop**: Intuitive task reordering and status changes
- **Bulk Operations**: Select multiple tasks for batch operations (via REST API)
- **Filtering**: Advanced filtering by status, priority, tags, and dependencies

### Dependency Visualization

Interactive dependency management:

- **Dependency Graph**: Visual representation of task relationships
- **Critical Path**: Highlighting of critical path through project
- **Blocked Tasks**: Clear indication of blocked tasks and reasons
- **Ready Tasks**: Prominent display of tasks ready to work on

### Real-time Updates

Live updates for collaborative environments:

- **WebSocket Integration**: Real-time task updates across clients
- **Optimistic Updates**: Immediate UI feedback with server synchronization
- **Conflict Resolution**: Handling of concurrent edits gracefully

## Component Examples

### TaskCard Component

```tsx
import React from 'react';
import { Task } from '../types';
import { PriorityBadge, StatusBadge, TagList } from '../common';

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onComplete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdate,
  onComplete,
}) => {
  return (
    <div className='task-card'>
      <div className='task-header'>
        <h3 className='task-title'>{task.title}</h3>
        <PriorityBadge priority={task.priority} />
      </div>

      <div className='task-content'>
        <p className='task-description'>{task.description}</p>
        <TagList tags={task.tags} />
      </div>

      <div className='task-footer'>
        <StatusBadge status={task.status} />
        <div className='task-actions'>
          <button onClick={() => onUpdate(task)}>Edit</button>
          <button
            onClick={() => onComplete(task.id)}
            disabled={task.status === 'completed'}
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};
```

### TaskForm Component

```tsx
import React, { useState } from 'react';
import { Task, CreateTaskData } from '../types';
import { Input, TextArea, Select, TagInput } from '../common';

interface TaskFormProps {
  onSubmit: (data: CreateTaskData) => void;
  onCancel: () => void;
  initialData?: Partial<Task>;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 3,
    tags: initialData?.tags || [],
    estimatedDuration: initialData?.estimatedDuration || 60,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className='task-form'>
      <Input
        label='Title'
        value={formData.title}
        onChange={title => setFormData({ ...formData, title })}
        required
      />

      <TextArea
        label='Description'
        value={formData.description}
        onChange={description => setFormData({ ...formData, description })}
      />

      <Select
        label='Priority'
        value={formData.priority}
        onChange={priority => setFormData({ ...formData, priority })}
        options={[
          { value: 1, label: 'Low' },
          { value: 2, label: 'Medium-Low' },
          { value: 3, label: 'Medium' },
          { value: 4, label: 'High' },
          { value: 5, label: 'Critical' },
        ]}
      />

      <TagInput
        label='Tags'
        value={formData.tags}
        onChange={tags => setFormData({ ...formData, tags })}
      />

      <div className='form-actions'>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
        <button type='submit'>Save Task</button>
      </div>
    </form>
  );
};
```

## API Integration

### Service Layer

The UI uses a service layer for API communication:

```typescript
// src/ui/services/api/tasks.ts
import { apiClient } from './client';
import { Task, CreateTaskData, UpdateTaskData } from '../../types';

export const tasksApi = {
  async getTasks(listId: string): Promise<Task[]> {
    const response = await apiClient.get(`/lists/${listId}/tasks`);
    return response.data.tasks;
  },

  async createTask(listId: string, data: CreateTaskData): Promise<Task> {
    const response = await apiClient.post(`/lists/${listId}/tasks`, data);
    return response.data;
  },

  async updateTask(
    listId: string,
    taskId: string,
    data: UpdateTaskData
  ): Promise<Task> {
    const response = await apiClient.patch(
      `/lists/${listId}/tasks/${taskId}`,
      data
    );
    return response.data;
  },

  async completeTask(listId: string, taskId: string): Promise<Task> {
    const response = await apiClient.post(
      `/lists/${listId}/tasks/${taskId}/complete`
    );
    return response.data;
  },

  async searchTasks(params: SearchParams): Promise<SearchResult> {
    const response = await apiClient.get('/search/tasks', { params });
    return response.data;
  },
};
```

### Custom Hooks

React hooks for state management:

```typescript
// src/ui/hooks/useTasks.ts
import { useState, useEffect } from 'react';
import { tasksApi } from '../services/api';
import { Task } from '../types';

export const useTasks = (listId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [listId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getTasks(listId);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (data: CreateTaskData) => {
    try {
      const newTask = await tasksApi.createTask(listId, data);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTask = async (taskId: string, data: UpdateTaskData) => {
    try {
      const updatedTask = await tasksApi.updateTask(listId, taskId, data);
      setTasks(prev =>
        prev.map(task => (task.id === taskId ? updatedTask : task))
      );
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    refresh: loadTasks,
  };
};
```

## Styling and Theming

### CSS-in-JS with Styled Components

```typescript
// src/ui/components/tasks/TaskCard/styles.ts
import styled from 'styled-components';

export const TaskCardContainer = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.sm};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    transform: translateY(-1px);
  }
`;

export const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

export const TaskTitle = styled.h3`
  font-size: ${props => props.theme.typography.sizes.lg};
  font-weight: ${props => props.theme.typography.weights.semibold};
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;
```

### Theme Configuration

```typescript
// src/ui/theme/index.ts
export const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    surface: '#FFFFFF',
    background: '#F9FAFB',
    border: '#E5E7EB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      muted: '#9CA3AF',
    },
    status: {
      pending: '#F59E0B',
      inProgress: '#3B82F6',
      completed: '#10B981',
      blocked: '#EF4444',
      cancelled: '#6B7280',
    },
    priority: {
      1: '#6B7280',
      2: '#F59E0B',
      3: '#3B82F6',
      4: '#F97316',
      5: '#EF4444',
    },
  },
  typography: {
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
};
```

## Performance Optimization

### Code Splitting

```typescript
// src/ui/pages/index.ts
import { lazy } from 'react';

export const Dashboard = lazy(() => import('./Dashboard'));
export const Projects = lazy(() => import('./Projects'));
export const Tasks = lazy(() => import('./Tasks'));
export const Settings = lazy(() => import('./Settings'));
```

### Memoization

```typescript
// src/ui/components/tasks/TaskList/index.tsx
import React, { memo, useMemo } from 'react';

export const TaskList = memo<TaskListProps>(({ tasks, filters }) => {
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.tags?.length && !filters.tags.some(tag => task.tags.includes(tag))) return false;
      return true;
    });
  }, [tasks, filters]);

  return (
    <div className="task-list">
      {filteredTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
});
```

### Virtual Scrolling

For large task lists:

```typescript
// src/ui/components/common/VirtualList/index.tsx
import { FixedSizeList as List } from 'react-window';

export const VirtualTaskList: React.FC<VirtualTaskListProps> = ({
  tasks,
  height = 400
}) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TaskCard task={tasks[index]} />
    </div>
  );

  return (
    <List
      height={height}
      itemCount={tasks.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## Testing

### Component Testing

```typescript
// src/ui/components/tasks/TaskCard/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from './index';
import { mockTask } from '../../../__mocks__/tasks';

describe('TaskCard', () => {
  const mockOnUpdate = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders task information correctly', () => {
    render(
      <TaskCard
        task={mockTask}
        onUpdate={mockOnUpdate}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(mockTask.title)).toBeInTheDocument();
    expect(screen.getByText(mockTask.description)).toBeInTheDocument();
  });

  it('calls onComplete when complete button is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        onUpdate={mockOnUpdate}
        onComplete={mockOnComplete}
      />
    );

    fireEvent.click(screen.getByText('Complete'));
    expect(mockOnComplete).toHaveBeenCalledWith(mockTask.id);
  });
});
```

### Integration Testing

```typescript
// src/ui/pages/Tasks/Tasks.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Tasks } from './index';
import { tasksApi } from '../../services/api';

jest.mock('../../services/api');

describe('Tasks Page', () => {
  it('loads and displays tasks', async () => {
    const mockTasks = [mockTask1, mockTask2];
    (tasksApi.getTasks as jest.Mock).mockResolvedValue(mockTasks);

    render(<Tasks listId="test-list-id" />);

    await waitFor(() => {
      expect(screen.getByText(mockTask1.title)).toBeInTheDocument();
      expect(screen.getByText(mockTask2.title)).toBeInTheDocument();
    });
  });
});
```

## Deployment

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/ui',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', 'styled-components'],
          charts: ['recharts', 'd3'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### Docker Configuration

```dockerfile
# Dockerfile.ui
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run ui:build

FROM nginx:alpine
COPY --from=builder /app/dist/ui /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Best Practices

### Component Design

- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Prefer composition over inheritance
- **Props Interface**: Well-defined TypeScript interfaces for all props
- **Error Boundaries**: Proper error handling and user feedback

### State Management

- **Local State**: Use useState for component-specific state
- **Shared State**: Use Context API for app-wide state
- **Server State**: Use custom hooks for API data management
- **Form State**: Use controlled components with validation

### Performance

- **Lazy Loading**: Code splitting for route-based components
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: For large lists and tables
- **Image Optimization**: Proper image loading and optimization

### Accessibility

- **Semantic HTML**: Use proper HTML elements and ARIA attributes
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper labeling and descriptions
- **Color Contrast**: Meet WCAG accessibility guidelines

This guide provides a comprehensive foundation for building and integrating the React UI client with the Task MCP Unified system.
