import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { glob } from 'glob';
import { describe, it, expect } from 'vitest';

/**
 * Documentation Cleanup Verification Tests
 *
 * This test suite verifies that documentation reflects the current architecture
 * and features, contains no references to removed features, has accurate
 * installation guides, and uses correct terminology and patterns.
 *
 * Requirements: Documentation cleanup requirement, 12.1
 */
describe('Documentation Cleanup Verification', () => {
  const rootDir = process.cwd();

  /**
   * Helper function to get all documentation files
   */
  const getDocumentationFiles = async (): Promise<string[]> => {
    const patterns = [
      'docs/**/*.md',
      'readme.md',
      'contributing.md',
      'agents.md',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: rootDir });
      files.push(...matches.map(file => join(rootDir, file)));
    }

    return files.filter(file => existsSync(file));
  };

  /**
   * Helper function to read file content safely
   */
  const readFileContent = (filePath: string): string => {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  };

  describe('Current Architecture Documentation', () => {
    it('should document domain-driven architecture correctly', async () => {
      const files = await getDocumentationFiles();
      const architectureFile = files.find(f => f.includes('architecture.md'));

      expect(architectureFile).toBeDefined();

      if (architectureFile) {
        const content = readFileContent(architectureFile);

        // Should document current domain structure
        expect(content).toMatch(/domain-driven/i);
        expect(content).toMatch(/orchestration/i);
        expect(content).toMatch(/core.*orchestration/i);
        expect(content).toMatch(/data.*delegation/i);
        expect(content).toMatch(/data.*access/i);
      }
    });
    it('should document MCP and REST API servers correctly', async () => {
      const files = await getDocumentationFiles();
      const installationFile = files.find(f => f.includes('installation.md'));

      expect(installationFile).toBeDefined();

      if (installationFile) {
        const content = readFileContent(installationFile);

        // Should reference new CLI structure
        expect(content).toMatch(/mcp\.js/);
        expect(content).toMatch(/rest\.js/);
        expect(content).toMatch(/node.*mcp\.js/);
        expect(content).toMatch(/node.*rest\.js/);

        // Should not reference old npx patterns for local installation
        const lines = content.split('\n');
        const localInstallSection = lines.findIndex(
          line =>
            line.includes('Local Installation') ||
            line.includes('Development Installation')
        );

        if (localInstallSection !== -1) {
          const localSection = lines
            .slice(localInstallSection, localInstallSection + 50)
            .join('\n');
          // Local installation should use node commands, not npx
          expect(localSection).toMatch(/node.*mcp\.js/);
        }
      }
    });

    it('should document current tool count and features', async () => {
      const files = await getDocumentationFiles();
      const toolsFile = files.find(f => f.includes('tools.md'));

      expect(toolsFile).toBeDefined();

      if (toolsFile) {
        const content = readFileContent(toolsFile);

        // Should document correct number of MCP tools (17)
        expect(content).toMatch(/17.*tools/i);

        // Should document current features
        expect(content).toMatch(/agent.*prompt.*template/i);
        expect(content).toMatch(/dependency.*management/i);
        expect(content).toMatch(/exit.*criteria/i);
        expect(content).toMatch(/circular.*dependency.*detection/i);
      }
    });

    it('should document task terminology consistently', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Should use "task" terminology, not "task-item"
        const taskItemMatches = content.match(/\btask-item\b/gi) || [];
        const acceptableTaskItemUses = taskItemMatches.filter(match => {
          const context = content
            .substring(
              Math.max(0, content.indexOf(match) - 50),
              content.indexOf(match) + 50
            )
            .toLowerCase();

          // Allow references to migration or historical context
          return (
            context.includes('task-item-to-task') ||
            context.includes('migration') ||
            context.includes('previously') ||
            context.includes('// task:') ||
            context.includes('* task:')
          );
        });

        const unacceptableTaskItemUses =
          taskItemMatches.length - acceptableTaskItemUses.length;

        if (unacceptableTaskItemUses > 0) {
          throw new Error(
            `File ${fileName} contains ${unacceptableTaskItemUses} unacceptable "task-item" references. ` +
              `All documentation should use "task" terminology consistently.`
          );
        }
      }
    });
  });

  describe('Removed Features Documentation', () => {
    it('should not document removed monitoring features', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Check for inappropriate monitoring references
        const monitoringPatterns = [
          /performance.*monitoring.*dashboard/i,
          /resource.*usage.*tracking/i,
          /memory.*leak.*detection/i,
          /alerting.*system/i,
          /monitoring.*infrastructure/i,
        ];

        const violations: string[] = [];

        for (const pattern of monitoringPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Allow references in migration guide or removal documentation
            const context = content
              .substring(
                Math.max(0, content.indexOf(matches[0]) - 100),
                content.indexOf(matches[0]) + 100
              )
              .toLowerCase();

            const isAcceptableReference =
              context.includes('removed') ||
              context.includes('no longer') ||
              context.includes('breaking changes') ||
              context.includes('migration') ||
              fileName.includes('migration');

            if (!isAcceptableReference) {
              violations.push(`${fileName}: ${matches[0]}`);
            }
          }
        }

        if (violations.length > 0) {
          throw new Error(
            `Found inappropriate monitoring feature references:\n${violations.join('\n')}`
          );
        }
      }
    });

    it('should not document removed intelligence features', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Check for inappropriate intelligence references
        const intelligencePatterns = [
          /task.*suggestion.*tool/i,
          /complexity.*analysis.*algorithm/i,
          /ai.*powered.*recommendation/i,
          /predictive.*completion/i,
          /intelligent.*task.*generation/i,
        ];

        const violations: string[] = [];

        for (const pattern of intelligencePatterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Allow references in migration guide or removal documentation
            const context = content
              .substring(
                Math.max(0, content.indexOf(matches[0]) - 100),
                content.indexOf(matches[0]) + 100
              )
              .toLowerCase();

            const isAcceptableReference =
              context.includes('removed') ||
              context.includes('no longer') ||
              context.includes('breaking changes') ||
              context.includes('migration') ||
              fileName.includes('migration');

            if (!isAcceptableReference) {
              violations.push(`${fileName}: ${matches[0]}`);
            }
          }
        }

        if (violations.length > 0) {
          throw new Error(
            `Found inappropriate intelligence feature references:\n${violations.join('\n')}`
          );
        }
      }
    });
    it('should not document removed statistics and caching features', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Check for inappropriate statistics/caching references
        const statisticsPatterns = [
          /task.*completion.*statistics/i,
          /progress.*analytics.*dashboard/i,
          /performance.*metrics.*collection/i,
          /reporting.*system/i,
          /template.*compilation.*caching/i,
          /search.*result.*caching/i,
          /data.*access.*caching/i,
          /response.*caching/i,
        ];

        const violations: string[] = [];

        for (const pattern of statisticsPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Allow references in migration guide or removal documentation
            const context = content
              .substring(
                Math.max(0, content.indexOf(matches[0]) - 100),
                content.indexOf(matches[0]) + 100
              )
              .toLowerCase();

            const isAcceptableReference =
              context.includes('removed') ||
              context.includes('no longer') ||
              context.includes('breaking changes') ||
              context.includes('migration') ||
              fileName.includes('migration');

            if (!isAcceptableReference) {
              violations.push(`${fileName}: ${matches[0]}`);
            }
          }
        }

        if (violations.length > 0) {
          throw new Error(
            `Found inappropriate statistics/caching feature references:\n${violations.join('\n')}`
          );
        }
      }
    });

    it('should not document removed archiving features', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Check for inappropriate archiving references
        const archivingPatterns = [
          /archive.*task.*list/i,
          /task.*archiving.*functionality/i,
          /archived.*tasks/i,
          /restore.*from.*archive/i,
        ];

        const violations: string[] = [];

        for (const pattern of archivingPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Allow references in migration guide or removal documentation
            const context = content
              .substring(
                Math.max(0, content.indexOf(matches[0]) - 100),
                content.indexOf(matches[0]) + 100
              )
              .toLowerCase();

            const isAcceptableReference =
              context.includes('removed') ||
              context.includes('no longer') ||
              context.includes('only permanent deletion') ||
              context.includes('breaking changes') ||
              context.includes('migration') ||
              fileName.includes('migration');

            if (!isAcceptableReference) {
              violations.push(`${fileName}: ${matches[0]}`);
            }
          }
        }

        if (violations.length > 0) {
          throw new Error(
            `Found inappropriate archiving feature references:\n${violations.join('\n')}`
          );
        }
      }
    });

    it('should correctly document bulk operations availability', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Find bulk operations references
        const bulkMatches = content.match(/bulk.*operations?/gi) || [];

        for (const match of bulkMatches) {
          const context = content.substring(
            Math.max(0, content.indexOf(match) - 200),
            content.indexOf(match) + 200
          );

          // Should clarify that bulk operations are REST API only, not MCP
          const hasMcpContext = /mcp/i.test(context);
          const hasRestContext = /rest.*api/i.test(context);
          const hasRemovalContext =
            /removed|not.*available|only.*available/i.test(context);

          if (hasMcpContext && !hasRemovalContext) {
            throw new Error(
              `File ${fileName} mentions bulk operations in MCP context without clarifying they're removed from MCP: "${context.trim()}"`
            );
          }

          if (
            !hasRestContext &&
            !hasRemovalContext &&
            !fileName.includes('migration')
          ) {
            throw new Error(
              `File ${fileName} mentions bulk operations without clarifying REST API availability: "${context.trim()}"`
            );
          }
        }
      }
    });
  });

  describe('Installation Guide Accuracy', () => {
    it('should have accurate installation commands', async () => {
      const files = await getDocumentationFiles();
      const installationFile = files.find(f => f.includes('installation.md'));

      expect(installationFile).toBeDefined();

      if (installationFile) {
        const content = readFileContent(installationFile);

        // Should include correct build and test commands
        expect(content).toMatch(/npm.*install/);
        expect(content).toMatch(/npm.*run.*build/);
        expect(content).toMatch(/node.*mcp\.js/);
        expect(content).toMatch(/node.*rest\.js/);

        // Should reference correct repository
        expect(content).toMatch(/github\.com.*keyurgolani.*task-list-mcp/);

        // Should have correct health check commands
        expect(content).toMatch(/npm.*run.*health|--health/);
      }
    });

    it('should have accurate MCP client configuration examples', async () => {
      const files = await getDocumentationFiles();
      const installationFile = files.find(f => f.includes('installation.md'));

      expect(installationFile).toBeDefined();

      if (installationFile) {
        const content = readFileContent(installationFile);

        // Should show correct command structure for local installation
        const mcpConfigMatches = content.match(/"command":\s*"node"/g) || [];
        expect(mcpConfigMatches.length).toBeGreaterThan(0);

        // Should reference correct script files
        expect(content).toMatch(/"args":\s*\[.*mcp\.js.*\]/);

        // Should include proper environment variables
        expect(content).toMatch(/NODE_ENV/);
        expect(content).toMatch(/MCP_LOG_LEVEL/);
        expect(content).toMatch(/DATA_DIRECTORY/);
      }
    });

    it('should have complete system requirements', async () => {
      const files = await getDocumentationFiles();
      const installationFile = files.find(f => f.includes('installation.md'));

      expect(installationFile).toBeDefined();

      if (installationFile) {
        const content = readFileContent(installationFile);

        // Should specify Node.js version requirements
        expect(content).toMatch(/Node\.js.*18\.0\.0/);

        // Should specify memory and storage requirements
        expect(content).toMatch(/Memory.*512MB|RAM/i);
        expect(content).toMatch(/Storage.*100MB/i);

        // Should list supported operating systems
        expect(content).toMatch(/Windows.*macOS.*Linux|Linux.*macOS.*Windows/);
      }
    });
    it('should have accurate troubleshooting information', async () => {
      const files = await getDocumentationFiles();
      const troubleshootingFile = files.find(f =>
        f.includes('troubleshooting.md')
      );

      if (troubleshootingFile) {
        const content = readFileContent(troubleshootingFile);

        // Should reference current CLI structure
        expect(content).toMatch(/mcp\.js|rest\.js/);

        // Should not reference removed features in troubleshooting
        const removedFeaturePatterns = [
          /intelligence.*tool.*not.*working/i,
          /monitoring.*dashboard.*error/i,
          /caching.*issue/i,
          /statistics.*not.*updating/i,
        ];

        for (const pattern of removedFeaturePatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });
  });

  describe('Examples and Patterns', () => {
    it('should use correct terminology in examples', async () => {
      const files = await getDocumentationFiles();
      const exampleFiles = files.filter(f => f.includes('examples/'));

      for (const file of exampleFiles) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Should use task terminology consistently
        const taskItemReferences = content.match(/\btask-item\b/gi) || [];
        const unacceptableReferences = taskItemReferences.filter(ref => {
          const context = content
            .substring(
              Math.max(0, content.indexOf(ref) - 30),
              content.indexOf(ref) + 30
            )
            .toLowerCase();

          // Only allow in migration context or comments
          return (
            !context.includes('migration') &&
            !context.includes('// task:') &&
            !context.includes('* task:')
          );
        });

        if (unacceptableReferences.length > 0) {
          throw new Error(
            `Example file ${fileName} uses "task-item" terminology instead of "task"`
          );
        }

        // Should use current tool names
        expect(content).not.toMatch(/search_tasks|filter_tasks/); // Old tool names
        expect(content).not.toMatch(/intelligence_tool|suggest_task/); // Removed tools
      }
    });

    it('should demonstrate current MCP tools correctly', async () => {
      const files = await getDocumentationFiles();
      const exampleFiles = files.filter(f => f.includes('examples/'));

      for (const file of exampleFiles) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Should use current tool names in JSON examples
        const toolCalls = content.match(/"tool":\s*"([^"]+)"/g) || [];

        for (const toolCall of toolCalls) {
          const toolName = toolCall.match(/"tool":\s*"([^"]+)"/)?.[1];

          if (toolName) {
            // Should not reference removed tools
            const removedTools = [
              'search_tasks',
              'filter_tasks',
              'intelligence_tool',
              'suggest_task',
              'analyze_complexity',
              'bulk_task_operations',
            ];

            if (removedTools.includes(toolName)) {
              throw new Error(
                `Example file ${fileName} references removed tool: ${toolName}`
              );
            }
          }
        }
      }
    });

    it('should show correct parameter patterns', async () => {
      const files = await getDocumentationFiles();
      const exampleFiles = files.filter(f => f.includes('examples/'));

      for (const file of exampleFiles) {
        const content = readFileContent(file);

        // Should use current parameter names
        expect(content).not.toMatch(/"taskItemId"/); // Should be taskId
        expect(content).not.toMatch(/"taskItemListId"/); // Should be listId

        // Should demonstrate agent prompt templates if mentioned
        const agentPromptMatches = content.match(/agentPromptTemplate/g) || [];
        if (agentPromptMatches.length > 0) {
          // Should show variable substitution examples
          expect(content).toMatch(/\{\{task\.|{{list\./);
        }
      }
    });
  });

  describe('Documentation Completeness', () => {
    it('should have all required documentation files', async () => {
      const requiredFiles = [
        'docs/readme.md',
        'docs/guides/installation.md',
        'docs/guides/getting-started.md',
        'docs/api/tools.md',
        'docs/examples/readme.md',
        'readme.md',
      ];

      for (const requiredFile of requiredFiles) {
        const filePath = join(rootDir, requiredFile);
        expect(existsSync(filePath)).toBe(true);

        // Should not be empty
        const content = readFileContent(filePath);
        expect(content.trim().length).toBeGreaterThan(100);
      }
    });

    it('should have consistent cross-references', async () => {
      const files = await getDocumentationFiles();

      for (const file of files) {
        const content = readFileContent(file);
        const fileName = file.split('/').pop() || '';

        // Find markdown links
        const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];

        for (const linkMatch of linkMatches) {
          const linkPath = linkMatch.match(/\[([^\]]+)\]\(([^)]+)\)/)?.[2];

          if (
            linkPath &&
            !linkPath.startsWith('http') &&
            !linkPath.startsWith('#')
          ) {
            // Resolve relative path
            const basePath = file.substring(0, file.lastIndexOf('/'));
            const resolvedPath = join(basePath, linkPath);

            // Check if referenced file exists (ignore anchors)
            const pathWithoutAnchor = resolvedPath.split('#')[0];
            if (!existsSync(pathWithoutAnchor)) {
              throw new Error(
                `File ${fileName} contains broken link: ${linkPath} (resolved to ${pathWithoutAnchor})`
              );
            }
          }
        }
      }
    });

    it('should have up-to-date version information', async () => {
      const files = await getDocumentationFiles();
      const packageJsonPath = join(rootDir, 'package.json');

      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileContent(packageJsonPath));
        const currentVersion = packageJson.version;

        // Check main documentation files for version consistency
        const mainFiles = files.filter(
          f =>
            f.includes('readme.md') ||
            f.includes('tools.md') ||
            f.includes('installation.md')
        );

        for (const file of mainFiles) {
          const content = readFileContent(file);
          const fileName = file.split('/').pop() || '';

          // Look for version references
          const versionMatches =
            content.match(/version[:\s]+(\d+\.\d+\.\d+)/gi) || [];

          for (const versionMatch of versionMatches) {
            const foundVersion = versionMatch.match(/(\d+\.\d+\.\d+)/)?.[1];

            if (foundVersion && foundVersion !== currentVersion) {
              // Allow for reasonable version differences in documentation
              const [major, minor] = currentVersion.split('.').map(Number);
              const [foundMajor, foundMinor] = foundVersion
                .split('.')
                .map(Number);

              // Only flag if major version is different or minor version is more than 1 behind
              if (
                foundMajor !== major ||
                (major === foundMajor && foundMinor < minor - 1)
              ) {
                console.warn(
                  `File ${fileName} may have outdated version reference: ${foundVersion} (current: ${currentVersion})`
                );
              }
            }
          }
        }
      }
    });

    it('should document all current MCP tools', async () => {
      const files = await getDocumentationFiles();
      const toolsFile = files.find(f => f.includes('tools.md'));

      expect(toolsFile).toBeDefined();

      if (toolsFile) {
        const content = readFileContent(toolsFile);

        // Should document all current tools
        const expectedTools = [
          'create_list',
          'get_list',
          'list_all_lists',
          'delete_list',
          'add_task',
          'update_task',
          'remove_task',
          'complete_task',
          'set_task_priority',
          'add_task_tags',
          'remove_task_tags',
          'get_agent_prompt',
          'search_tool',
          'show_tasks',
          'set_task_dependencies',
          'get_ready_tasks',
          'analyze_task_dependencies',
          'set_task_exit_criteria',
          'update_exit_criteria',
        ];

        for (const tool of expectedTools) {
          expect(content).toMatch(new RegExp(`\\b${tool}\\b`));
        }

        // Should not document removed tools
        const removedTools = [
          'search_tasks',
          'filter_tasks',
          'intelligence_tool',
          'suggest_task',
          'analyze_complexity',
          'bulk_task_operations',
        ];

        for (const removedTool of removedTools) {
          // Allow mentions in removal context
          const matches =
            content.match(new RegExp(`\\b${removedTool}\\b`, 'g')) || [];

          for (const match of matches) {
            const context = content
              .substring(
                Math.max(0, content.indexOf(match) - 100),
                content.indexOf(match) + 100
              )
              .toLowerCase();

            const isRemovalContext =
              context.includes('removed') ||
              context.includes('no longer') ||
              context.includes('replaced by');

            if (!isRemovalContext) {
              throw new Error(
                `Tools documentation references removed tool ${removedTool} without removal context`
              );
            }
          }
        }
      }
    });
  });
});
