#!/usr/bin/env node

/**
 * Script to update all MCP handlers with enhanced error formatting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handler configurations
const HANDLER_CONFIGS = {
  // List management tools
  'create-list': 'listManagement',
  'get-list': 'listManagement', 
  'list-all-lists': 'listManagement',
  'delete-list': 'listManagement',
  
  // Task management tools
  'add-task': 'taskManagement',
  'update-task': 'taskManagement',
  'remove-task': 'taskManagement',
  'complete-task': 'taskManagement',
  'set-task-priority': 'taskManagement',
  'add-task-tags': 'taskManagement',
  
  // Search and display tools
  'search-tasks': 'searchDisplay',
  'filter-tasks': 'searchDisplay',
  'show-tasks': 'searchDisplay',
  
  // Advanced features
  'analyze-task': 'advanced',
  'get-task-suggestions': 'advanced',
  
  // Dependency management
  'set-task-dependencies': 'taskManagement',
  'get-ready-tasks': 'taskManagement',
  'analyze-task-dependencies': 'taskManagement',
};

// Tool name mapping (file name to tool name)
const TOOL_NAME_MAPPING = {
  'create-list': 'create_list',
  'get-list': 'get_list',
  'list-all-lists': 'list_all_lists',
  'delete-list': 'delete_list',
  'add-task': 'add_task',
  'update-task': 'update_task',
  'remove-task': 'remove_task',
  'complete-task': 'complete_task',
  'set-task-priority': 'set_task_priority',
  'add-task-tags': 'add_task_tags',
  'search-tasks': 'search_tasks',
  'filter-tasks': 'filter_tasks',
  'show-tasks': 'show_tasks',
  'analyze-task': 'analyze_task',
  'get-task-suggestions': 'get_task_suggestions',
  'set-task-dependencies': 'set_task_dependencies',
  'get-ready-tasks': 'get_ready_tasks',
  'analyze-task-dependencies': 'analyze_task_dependencies',
};

const handlersDir = path.join(__dirname, '../src/api/handlers');

function updateHandler(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already updated (contains handler-error-formatter import)
  if (content.includes('handler-error-formatter')) {
    console.log(`✓ ${fileName} already updated`);
    return;
  }
  
  // Skip index.ts
  if (fileName === 'index.ts') {
    return;
  }
  
  const handlerKey = fileName.replace('.ts', '');
  const configType = HANDLER_CONFIGS[handlerKey];
  const toolName = TOOL_NAME_MAPPING[handlerKey];
  
  if (!configType || !toolName) {
    console.log(`⚠ Skipping ${fileName} - no configuration found`);
    return;
  }
  
  let updatedContent = content;
  
  // Add import for handler error formatter
  const importRegex = /(import.*from.*logger\.js';)/;
  if (importRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(
      importRegex,
      `$1\nimport { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';`
    );
  }
  
  // Replace the error handling block
  const errorHandlingRegex = /} catch \(error\) \{[\s\S]*?logger\.error\([^}]+\}[^}]*\);[\s\S]*?if \(error instanceof z\.ZodError\)[\s\S]*?\}[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\}/;
  
  const newErrorHandling = `} catch (error) {
    // Use enhanced error formatting with ${configType} configuration
    const formatError = createHandlerErrorFormatter('${toolName}', ERROR_CONFIGS.${configType});
    return formatError(error, request.params?.arguments);
  }`;
  
  if (errorHandlingRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(errorHandlingRegex, newErrorHandling);
    
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✓ Updated ${fileName}`);
  } else {
    console.log(`⚠ Could not find error handling pattern in ${fileName}`);
  }
}

// Process all handler files
const files = fs.readdirSync(handlersDir);

console.log('Updating MCP handlers with enhanced error formatting...\n');

files.forEach(fileName => {
  if (fileName.endsWith('.ts')) {
    const filePath = path.join(handlersDir, fileName);
    updateHandler(filePath, fileName);
  }
});

console.log('\nHandler update complete!');