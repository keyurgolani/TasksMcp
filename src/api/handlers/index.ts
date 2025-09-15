/**
 * MCP handlers for list and task management operations
 * 
 * This module exports all MCP (Model Context Protocol) request handlers for the task management system.
 * Handlers are organized by functionality:
 * 
 * List Management:
 * - Create, retrieve, list, and delete todo lists
 * 
 * Task Management:
 * - Add, update, remove, and complete tasks
 * - Set task priorities and manage tags
 * 
 * Search and Display:
 * - Search tasks by text, filter by criteria, and format for display
 * 
 * AI-Powered Features:
 * - Analyze task complexity and generate suggestions
 */

// List management handlers
export { handleCreateList } from './create-list.js';
export { handleGetList } from './get-list.js';
export { handleListAllLists } from './list-all-lists.js';
export { handleDeleteList } from './delete-list.js';

// Task management handlers
export { handleAddTask } from './add-task.js';
export { handleUpdateTask } from './update-task.js';
export { handleRemoveTask } from './remove-task.js';
export { handleCompleteTask } from './complete-task.js';
export { handleSetTaskPriority } from './set-task-priority.js';
export { handleAddTaskTags } from './add-task-tags.js';

// Search and display handlers
export { handleSearchTasks } from './search-tasks.js';
export { handleFilterTasks } from './filter-tasks.js';
export { handleShowTasks } from './show-tasks.js';

// AI-powered intelligence handlers
export { handleAnalyzeTask } from './analyze-task.js';
export { handleGetTaskSuggestions } from './get-task-suggestions.js';