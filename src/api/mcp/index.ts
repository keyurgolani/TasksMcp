/**
 * MCP Domain Index
 * Exports consolidated MCP tools, handlers, and server
 */

// Consolidated Tools Export
export {
  ALL_MCP_TOOLS,
  LIST_MANAGEMENT_TOOLS,
  TASK_MANAGEMENT_TOOLS,
  SEARCH_DISPLAY_TOOLS,
  DEPENDENCY_MANAGEMENT_TOOLS,
  EXIT_CRITERIA_MANAGEMENT_TOOLS,
  AGENT_PROMPT_MANAGEMENT_TOOLS,
} from './tools/consolidated-tools.js';

// Consolidated Handlers Export
export { ConsolidatedMcpHandlers } from './handlers/consolidated-handlers.js';

// Consolidated Server Export
export { ConsolidatedMcpServer } from './mcp-server.js';

// Type Definitions Export
export * from './types/request-params.js';
