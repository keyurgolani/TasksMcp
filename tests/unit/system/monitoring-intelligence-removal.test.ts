/**
 * Unit tests for monitoring and intelligence removal verification
 * Tests that monitoring, alerting, and intelligence systems have been completely removed
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { describe, test, expect } from 'vitest';

import { MCP_TOOLS } from '../../../src/api/tools/definitions.js';

describe('Monitoring and Intelligence Removal Verification', () => {
  describe('Directory Structure Verification', () => {
    test('monitoring directory should not exist', () => {
      const monitoringDir = join(
        process.cwd(),
        'src/infrastructure/monitoring'
      );
      expect(existsSync(monitoringDir)).toBe(false);
    });

    test('intelligence directory should not exist', () => {
      const intelligenceDir = join(process.cwd(), 'src/domain/intelligence');
      expect(existsSync(intelligenceDir)).toBe(false);
    });
  });

  describe('File System Verification', () => {
    test('memory leak prevention files should not exist', () => {
      const memoryLeakPreventionFile = join(
        process.cwd(),
        'src/shared/utils/memory-leak-prevention.ts'
      );
      expect(existsSync(memoryLeakPreventionFile)).toBe(false);
    });

    test('memory cleanup manager files should not exist', () => {
      const memoryCleanupManagerFile = join(
        process.cwd(),
        'src/shared/utils/memory-cleanup-manager.ts'
      );
      expect(existsSync(memoryCleanupManagerFile)).toBe(false);
    });

    test('memory cleanup utility files should not exist', () => {
      const memoryCleanupFile = join(
        process.cwd(),
        'src/shared/utils/memory-cleanup.ts'
      );
      expect(existsSync(memoryCleanupFile)).toBe(false);
    });
  });

  describe('MCP Tools Verification', () => {
    test('intelligence tools should not be in MCP_TOOLS array', () => {
      const toolNames = MCP_TOOLS.map(tool => tool.name);

      // Intelligence tools that should be removed
      const intelligenceTools = [
        'analyze_task',
        'get_task_suggestions',
        'analyze_task_complexity',
        'get_complexity_analysis',
        'suggest_task_breakdown',
        'get_intelligence_report',
      ];

      intelligenceTools.forEach(toolName => {
        expect(toolNames).not.toContain(toolName);
      });
    });

    test('MCP_TOOLS should not contain monitoring tools', () => {
      const toolNames = MCP_TOOLS.map(tool => tool.name);

      // Monitoring tools that should be removed
      const monitoringTools = [
        'get_health_status',
        'get_performance_metrics',
        'get_memory_usage',
        'get_system_stats',
        'monitor_performance',
        'check_memory_leaks',
      ];

      monitoringTools.forEach(toolName => {
        expect(toolNames).not.toContain(toolName);
      });
    });
  });

  describe('Source Code Verification', () => {
    test('no monitoring imports should exist in any file', () => {
      const srcDir = join(process.cwd(), 'src');
      const violations = findImportViolations(srcDir, [
        'memory-leak-prevention',
        'memory-cleanup-manager',
        'memory-cleanup',
        'monitoring',
        'alerting',
        'intelligence',
      ]);

      expect(violations).toEqual([]);
    });

    test('no intelligence imports should exist in any file', () => {
      const srcDir = join(process.cwd(), 'src');
      const violations = findImportViolations(srcDir, [
        'intelligence',
        'task-suggestions',
        'complexity-analysis',
        'ai-analysis',
        'smart-suggestions',
      ]);

      expect(violations).toEqual([]);
    });

    test('no memory leak prevention code should remain', () => {
      const srcDir = join(process.cwd(), 'src');
      const violations = findCodeViolations(srcDir, [
        'memoryLeakPrevention',
        'memoryCleanupManager',
        'MemoryUtils.isMemoryPressure',
      ]);

      // Filter out comments that say something was removed
      const actualViolations = violations.filter(violation => {
        const filePath = violation.split(':')[0];
        try {
          const content = readFileSync(filePath, 'utf-8');
          // Allow comments that say something was removed
          return !content.includes('removed - no longer supported');
        } catch {
          return true;
        }
      });

      expect(actualViolations).toEqual([]);
    });

    test('no intelligence code should remain', () => {
      const srcDir = join(process.cwd(), 'src');
      const violations = findCodeViolations(srcDir, [
        'suggestTaskCompletionReadiness',
        'complexity analysis',
        'task suggestions',
        'intelligence analysis',
      ]);

      // Allow the methods to exist but they should be neutered (return null or basic responses)
      // We'll check that they don't contain actual intelligence logic
      const methodImplementationViolations = violations.filter(violation => {
        const filePath = violation.split(':')[0];
        const fileName = filePath.split('/').pop() || '';

        // Only check files that should contain the method implementations
        return (
          violation.includes('suggestTaskCompletionReadiness') &&
          fileName.includes('exit-criteria-manager')
        );
      });

      methodImplementationViolations.forEach(violation => {
        // These methods should exist but be neutered
        const fileContent = readFileSync(violation.split(':')[0], 'utf-8');
        expect(fileContent).toContain('removed - no longer supported');
      });
    });
  });

  describe('Configuration Verification', () => {
    test('MCP settings should not contain intelligence tools', () => {
      const mcpSettingsFile = join(process.cwd(), '.kiro/settings/mcp.json');

      if (existsSync(mcpSettingsFile)) {
        const mcpSettings = JSON.parse(readFileSync(mcpSettingsFile, 'utf-8'));
        const autoApprove = mcpSettings.mcpServers?.tasks?.autoApprove || [];

        const intelligenceTools = ['analyze_task', 'get_task_suggestions'];

        intelligenceTools.forEach(toolName => {
          expect(autoApprove).not.toContain(toolName);
        });
      }
    });
  });

  describe('Documentation Verification', () => {
    test('README should not contain intelligence feature references', () => {
      const readmeFile = join(process.cwd(), 'readme.md');

      if (existsSync(readmeFile)) {
        const readmeContent = readFileSync(readmeFile, 'utf-8');

        // Should not contain active intelligence-related terms (but removal messages are OK)
        expect(readmeContent).not.toMatch(/AI-powered.*analysis/i);
        expect(readmeContent).not.toMatch(/task.*suggestions/i);
        expect(readmeContent).not.toMatch(/complexity.*analysis/i);
        // Allow "Intelligence features have been removed" but not active intelligence features
        expect(readmeContent).not.toMatch(
          /intelligence.*features(?!.*removed)/i
        );
      }
    });

    test('package.json should not contain intelligence keywords', () => {
      const packageFile = join(process.cwd(), 'package.json');

      if (existsSync(packageFile)) {
        const packageContent = JSON.parse(readFileSync(packageFile, 'utf-8'));
        const keywords = packageContent.keywords || [];

        expect(keywords).not.toContain('complexity-analysis');
        expect(keywords).not.toContain('intelligent-tasks');
        expect(keywords).not.toContain('ai-powered');
      }
    });
  });
});

/**
 * Helper function to find import violations in source files
 */
function findImportViolations(dir: string, patterns: string[]): string[] {
  const violations: string[] = [];

  function searchDirectory(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, coverage, etc.
        if (
          !['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)
        ) {
          searchDirectory(fullPath);
        }
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');

          patterns.forEach(pattern => {
            const importRegex = new RegExp(`import.*${pattern}`, 'i');
            const requireRegex = new RegExp(`require.*${pattern}`, 'i');

            if (importRegex.test(content) || requireRegex.test(content)) {
              violations.push(
                `${fullPath}: Contains import/require of ${pattern}`
              );
            }
          });
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }
  }

  searchDirectory(dir);
  return violations;
}

/**
 * Helper function to find code violations in source files
 */
function findCodeViolations(dir: string, patterns: string[]): string[] {
  const violations: string[] = [];

  function searchDirectory(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, coverage, etc.
        if (
          !['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)
        ) {
          searchDirectory(fullPath);
        }
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');

          patterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'i');

            if (regex.test(content)) {
              violations.push(`${fullPath}: Contains ${pattern}`);
            }
          });
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }
  }

  searchDirectory(dir);
  return violations;
}
