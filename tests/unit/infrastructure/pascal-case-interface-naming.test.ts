/**
 * PascalCase Interface Naming Convention Tests
 *
 * Tests for Requirement 4.5: Enforce PascalCase interface naming without I prefix
 * Verifies that all interfaces use PascalCase naming convention without I prefix
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

import { describe, it, expect } from 'vitest';

describe('PascalCase Interface Naming Convention', () => {
  const srcDir = join(process.cwd(), 'src');

  /**
   * Recursively get all TypeScript files in a directory
   */
  function getTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getTypeScriptFiles(fullPath));
      } else if (extname(entry) === '.ts' && !entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Extract interface declarations from TypeScript content
   */
  function extractInterfaces(content: string): string[] {
    // Match both exported and non-exported interfaces
    // Use word boundaries and require opening brace to avoid false positives
    const interfaceRegex =
      /(?:export\s+)?interface\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g;
    const interfaces: string[] = [];
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push(match[1]);
    }

    return interfaces;
  }

  /**
   * Check if a name follows PascalCase convention
   */
  function isPascalCase(name: string): boolean {
    // PascalCase: starts with uppercase letter, followed by letters/numbers
    // Single uppercase letters are valid PascalCase (e.g., "T", "A")
    // All uppercase words are not PascalCase (e.g., "TASK", "API")
    if (name.length === 1) {
      return /^[A-Z]$/.test(name);
    }
    return /^[A-Z][A-Za-z0-9]*$/.test(name) && !/^[A-Z]+$/.test(name);
  }

  /**
   * Check if a name has I prefix
   */
  function hasIPrefix(name: string): boolean {
    return name.startsWith('I') && name.length > 1 && /^[A-Z]/.test(name[1]);
  }

  it('should verify all interfaces use PascalCase naming convention', () => {
    const tsFiles = getTypeScriptFiles(srcDir);
    const allInterfaces: Array<{ file: string; interface: string }> = [];
    const nonCompliantInterfaces: Array<{
      file: string;
      interface: string;
      reason: string;
    }> = [];

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      const interfaces = extractInterfaces(content);

      for (const interfaceName of interfaces) {
        allInterfaces.push({ file, interface: interfaceName });

        if (!isPascalCase(interfaceName)) {
          nonCompliantInterfaces.push({
            file,
            interface: interfaceName,
            reason: 'Not PascalCase',
          });
        }

        if (hasIPrefix(interfaceName)) {
          nonCompliantInterfaces.push({
            file,
            interface: interfaceName,
            reason: 'Has I prefix',
          });
        }
      }
    }

    console.log(
      `PascalCase interface naming convention compliance (Requirement 4.5):`
    );
    console.log(`  - Total interfaces found: ${allInterfaces.length}`);
    console.log(
      `  - Compliant interfaces: ${allInterfaces.length - nonCompliantInterfaces.length}`
    );
    console.log(
      `  - Non-compliant interfaces: ${nonCompliantInterfaces.length}`
    );
    console.log(
      `  - Compliance rate: ${(((allInterfaces.length - nonCompliantInterfaces.length) / allInterfaces.length) * 100).toFixed(1)}%`
    );

    if (nonCompliantInterfaces.length > 0) {
      console.log(`Non-compliant interfaces:`);
      for (const {
        file,
        interface: interfaceName,
        reason,
      } of nonCompliantInterfaces.slice(0, 10)) {
        const relativePath = file.replace(process.cwd() + '/', '');
        console.log(`  - ${relativePath}: ${interfaceName} (${reason})`);
      }
      if (nonCompliantInterfaces.length > 10) {
        console.log(
          `  ... and ${nonCompliantInterfaces.length - 10} more interfaces`
        );
      }
    }

    expect(nonCompliantInterfaces).toHaveLength(0);
  });

  it('should verify interface naming consistency across workspace', () => {
    const tsFiles = getTypeScriptFiles(srcDir);
    const interfacesByDirectory: Record<
      string,
      { total: number; compliant: number }
    > = {};

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      const interfaces = extractInterfaces(content);
      const _dir = file.split('/').slice(-2, -1)[0] || 'root';

      if (!interfacesByDirectory[_dir]) {
        interfacesByDirectory[_dir] = { total: 0, compliant: 0 };
      }

      for (const interfaceName of interfaces) {
        interfacesByDirectory[_dir].total++;
        if (isPascalCase(interfaceName) && !hasIPrefix(interfaceName)) {
          interfacesByDirectory[_dir].compliant++;
        }
      }
    }

    console.log(
      `Interface naming consistency across workspace (Requirement 12.1):`
    );
    for (const [dir, stats] of Object.entries(interfacesByDirectory)) {
      const percentage =
        stats.total > 0
          ? ((stats.compliant / stats.total) * 100).toFixed(0)
          : '100';
      console.log(
        `  - ${dir}: ${stats.compliant}/${stats.total} compliant (${percentage}%)`
      );
    }

    // All directories should have 100% compliance
    for (const [_dir, stats] of Object.entries(interfacesByDirectory)) {
      expect(stats.compliant).toBe(stats.total);
    }
  });

  it('should verify no interfaces have I prefix', () => {
    const tsFiles = getTypeScriptFiles(srcDir);
    const interfacesWithIPrefix: Array<{ file: string; interface: string }> =
      [];

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      const interfaces = extractInterfaces(content);

      for (const interfaceName of interfaces) {
        if (hasIPrefix(interfaceName)) {
          interfacesWithIPrefix.push({ file, interface: interfaceName });
        }
      }
    }

    if (interfacesWithIPrefix.length > 0) {
      console.log(`Interfaces with I prefix found:`);
      for (const { file, interface: interfaceName } of interfacesWithIPrefix) {
        const relativePath = file.replace(process.cwd() + '/', '');
        console.log(`  - ${relativePath}: ${interfaceName}`);
      }
    }

    expect(interfacesWithIPrefix).toHaveLength(0);
  });

  it('should verify references to interfaces are updated correctly', () => {
    const tsFiles = getTypeScriptFiles(srcDir);
    const oldInterfaceReferences: Array<{
      file: string;
      line: number;
      content: string;
    }> = [];

    // Check for references to old interface names that should have been updated
    const oldInterfaceNames = ['ITaskRepository', 'ITaskListRepository'];

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const oldName of oldInterfaceNames) {
          if (line.includes(oldName)) {
            oldInterfaceReferences.push({
              file,
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      }
    }

    if (oldInterfaceReferences.length > 0) {
      console.log(`Old interface references found:`);
      for (const { file, line, content } of oldInterfaceReferences.slice(
        0,
        10
      )) {
        const relativePath = file.replace(process.cwd() + '/', '');
        console.log(`  - ${relativePath}:${line} - ${content}`);
      }
      if (oldInterfaceReferences.length > 10) {
        console.log(
          `  ... and ${oldInterfaceReferences.length - 10} more references`
        );
      }
    }

    expect(oldInterfaceReferences).toHaveLength(0);
  });

  it('should verify all interface names follow PascalCase pattern requirements', () => {
    const testCases = [
      { name: 'Task', expected: true },
      { name: 'TaskList', expected: true },
      { name: 'TaskRepositoryInterface', expected: true },
      { name: 'TaskListRepositoryInterface', expected: true },
      { name: 'ActionPlan', expected: true },
      { name: 'ExitCriteria', expected: true },
      { name: 'ITask', expected: false }, // Has I prefix
      { name: 'ITaskList', expected: false }, // Has I prefix
      { name: 'taskInterface', expected: false }, // camelCase
      { name: 'task_interface', expected: false }, // snake_case
      { name: 'TASK_INTERFACE', expected: false }, // SCREAMING_SNAKE_CASE
      { name: 'Task-Interface', expected: false }, // kebab-case
      { name: '1Task', expected: false }, // Starts with number
      { name: 'Task@', expected: false }, // Contains special character
      { name: 'Task Interface', expected: false }, // Contains space
    ];

    for (const { name, expected } of testCases) {
      const isValid = isPascalCase(name) && !hasIPrefix(name);
      expect(isValid).toBe(expected);
    }

    console.log(
      `PascalCase pattern validation completed for ${testCases.length} test cases`
    );
  });

  it('should verify interface extraction works correctly', () => {
    const testContent = `
      export interface TaskRepository {
        findById(id: string): Promise<Task | null>;
      }
      
      export interface TaskListRepository {
        create(data: CreateTaskListData): Promise<TaskList>;
      }
      
      interface InternalInterface {
        internal: boolean;
      }
      
      // This should not be matched
      class NotAnInterface {}
      type NotAnInterface2 = string;
    `;

    const interfaces = extractInterfaces(testContent);
    expect(interfaces).toEqual([
      'TaskRepository',
      'TaskListRepository',
      'InternalInterface',
    ]);
  });

  it('should verify PascalCase validation logic', () => {
    // Test PascalCase validation
    expect(isPascalCase('Task')).toBe(true);
    expect(isPascalCase('TaskList')).toBe(true);
    expect(isPascalCase('TaskRepository')).toBe(true);
    expect(isPascalCase('T')).toBe(true); // Single uppercase letter is valid
    expect(isPascalCase('A')).toBe(true); // Single uppercase letter is valid
    expect(isPascalCase('task')).toBe(false);
    expect(isPascalCase('taskList')).toBe(false);
    expect(isPascalCase('TASK')).toBe(false); // All uppercase is not PascalCase
    expect(isPascalCase('API')).toBe(false); // All uppercase is not PascalCase
    expect(isPascalCase('Task_List')).toBe(false);
    expect(isPascalCase('1Task')).toBe(false);
    expect(isPascalCase('Task123')).toBe(true); // Numbers are allowed
    expect(isPascalCase('TaskV2')).toBe(true); // Mixed case with numbers

    // Test I prefix detection
    expect(hasIPrefix('ITask')).toBe(true);
    expect(hasIPrefix('ITaskList')).toBe(true);
    expect(hasIPrefix('Task')).toBe(false);
    expect(hasIPrefix('Interface')).toBe(false);
    expect(hasIPrefix('I')).toBe(false); // Single I is not a prefix
    expect(hasIPrefix('Ia')).toBe(false); // lowercase after I
    expect(hasIPrefix('IAPI')).toBe(true); // All uppercase with I prefix
  });
});
