/**
 * Unit tests for MCP CLI
 * Tests MCP CLI starts server correctly with proper configuration
 */

import { describe, it, expect } from 'vitest';

describe('MCP CLI', () => {
  describe('CLI File Structure', () => {
    it('should be executable as a Node.js script', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');

      // Check if file exists
      expect(() => fs.accessSync(cliPath)).not.toThrow();

      // Check if file has executable shebang
      const content = fs.readFileSync(cliPath, 'utf8');
      expect(content).toMatch(/^#!/);
      expect(content).toContain('#!/usr/bin/env node');
    });

    it('should import ConsolidatedMcpServer correctly', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain('ConsolidatedMcpServer');
      expect(content).toContain('./dist/api/mcp/mcp-server.js');
    });

    it('should import ConfigurationManager correctly', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain('ConfigurationManager');
      expect(content).toContain(
        './dist/infrastructure/config/system-configuration.js'
      );
    });

    it('should handle SIGINT gracefully', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain("process.on('SIGINT'");
      expect(content).toContain('Shutting down MCP Server...');
    });

    it('should handle SIGTERM gracefully', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain("process.on('SIGTERM'");
      expect(content).toContain('Shutting down MCP Server...');
    });

    it('should export startMcpServer function', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain('module.exports = { startMcpServer }');
    });

    it('should start server when run directly', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain('if (require.main === module)');
      expect(content).toContain('startMcpServer()');
    });

    it('should exit with error code on startup failure', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain('process.exit(1)');
      expect(content).toContain('Failed to start MCP Server:');
    });

    it('should log error messages appropriately', () => {
      const fs = require('fs');
      const path = require('path');

      const cliPath = path.join(process.cwd(), 'mcp.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content).toContain('console.error');
      expect(content).toContain('error.message');
    });
  });

  describe('MCP Tools Organization', () => {
    it('should use consolidated MCP tools', async () => {
      const { ALL_MCP_TOOLS } = await import(
        '../../src/api/mcp/tools/consolidated-tools.js'
      );

      expect(ALL_MCP_TOOLS).toBeDefined();
      expect(ALL_MCP_TOOLS.length).toBeGreaterThan(0);

      // Verify tools are properly organized by domain
      const toolNames = ALL_MCP_TOOLS.map(tool => tool.name);
      expect(toolNames.some(name => name.includes('list'))).toBe(true);
      expect(toolNames.some(name => name.includes('task'))).toBe(true);
      expect(toolNames.some(name => name.includes('search'))).toBe(true);
      expect(toolNames.some(name => name.includes('dependencies'))).toBe(true);
    });

    it('should use consolidated MCP handlers', async () => {
      const { ConsolidatedMcpHandlers } = await import(
        '../../src/api/mcp/handlers/consolidated-handlers.js'
      );

      expect(ConsolidatedMcpHandlers).toBeDefined();
      expect(typeof ConsolidatedMcpHandlers).toBe('function');
    });

    it('should use consolidated MCP server', async () => {
      const { ConsolidatedMcpServer } = await import(
        '../../src/api/mcp/mcp-server.js'
      );

      expect(ConsolidatedMcpServer).toBeDefined();
      expect(typeof ConsolidatedMcpServer).toBe('function');
    });
  });

  describe('Orchestration Layer Usage', () => {
    it('should not import direct data store modules in MCP handlers', async () => {
      // This test verifies that MCP handlers only use orchestration layer
      const fs = require('fs');
      const path = require('path');

      const handlersPath = path.join(
        process.cwd(),
        'src/api/mcp/handlers/consolidated-handlers.ts'
      );
      const content = fs.readFileSync(handlersPath, 'utf8');

      // Verify no direct data store imports
      expect(content).not.toContain('data/stores');
      expect(content).not.toContain('infrastructure/storage');

      // Verify only orchestration layer imports
      expect(content).toContain('core/orchestration/interfaces');
    });

    it('should not import direct data store modules in MCP server', async () => {
      const fs = require('fs');
      const path = require('path');

      const serverPath = path.join(process.cwd(), 'src/api/mcp/mcp-server.ts');
      const content = fs.readFileSync(serverPath, 'utf8');

      // Verify no direct data store imports
      expect(content).not.toContain('data/stores');
      expect(content).not.toContain('infrastructure/storage');

      // Verify orchestration layer usage
      expect(content).toContain('core/orchestration/interfaces');
    });
  });
});
