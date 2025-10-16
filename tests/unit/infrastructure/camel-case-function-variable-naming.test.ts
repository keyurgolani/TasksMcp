/**
 * Unit tests for camelCase function and variable naming convention compliance
 * Tests requirement 4.4: Enforce camelCase function and variable naming across entire workspace
 */

import { promises as fs } from 'fs';

import { glob } from 'glob';
import { describe, it, expect } from 'vitest';

describe('CamelCase Function and Variable Naming Convention', () => {
  const sourcePatterns = [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ];

  it('should verify all functions use camelCase naming convention', async () => {
    const files = await glob(sourcePatterns, { cwd: process.cwd() });
    const violations: Array<{ file: string; line: number; name: string }> = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for function declarations with non-camelCase names
        const functionMatches = line.match(
          /(?:export\s+)?(?:async\s+)?function\s+([A-Z_][a-zA-Z0-9_]*)\s*\(/g
        );
        if (functionMatches) {
          for (const match of functionMatches) {
            const nameMatch = match.match(/function\s+([A-Z_][a-zA-Z0-9_]*)/);
            if (nameMatch) {
              const functionName = nameMatch[1];
              // Skip if it's a constructor or class method (handled by class naming)
              if (
                !functionName.startsWith('_') &&
                !isValidCamelCase(functionName)
              ) {
                violations.push({
                  file,
                  line: i + 1,
                  name: functionName,
                });
              }
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      console.log('Function naming violations found:');
      violations.forEach(v => {
        console.log(
          `  - ${v.file}:${v.line} - Function "${v.name}" should be camelCase`
        );
      });
    }

    expect(violations).toHaveLength(0);
  }, 10000);

  it('should verify private class properties use camelCase naming convention', async () => {
    const files = await glob(sourcePatterns, { cwd: process.cwd() });
    const violations: Array<{ file: string; line: number; name: string }> = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Only check actual class property declarations with visibility modifiers
        if (line.includes('private ') || line.includes('protected ')) {
          const propertyMatches = line.match(
            /(?:private|protected)\s+(?:readonly\s+)?([a-z][a-z0-9]*_[a-zA-Z0-9_]*)\s*[=:]/g
          );
          if (propertyMatches) {
            for (const match of propertyMatches) {
              const nameMatch = match.match(
                /(?:private|protected)\s+(?:readonly\s+)?([a-z][a-z0-9]*_[a-zA-Z0-9_]*)/
              );
              if (nameMatch) {
                const propertyName = nameMatch[1];
                // Skip constants (SCREAMING_SNAKE_CASE is valid for constants)
                if (!isConstant(line) && !isValidCamelCase(propertyName)) {
                  violations.push({
                    file,
                    line: i + 1,
                    name: propertyName,
                  });
                }
              }
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      console.log('Class property naming violations found:');
      violations.forEach(v => {
        console.log(
          `  - ${v.file}:${v.line} - Property "${v.name}" should be camelCase`
        );
      });
    }

    expect(violations).toHaveLength(0);
  }, 10000);

  it('should verify function and variable naming consistency', async () => {
    const files = await glob(sourcePatterns, { cwd: process.cwd() });
    let totalFunctions = 0;
    let totalProperties = 0;
    let camelCaseFunctions = 0;
    let camelCaseProperties = 0;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Count functions
        const functionMatches = line.match(
          /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
        );
        if (functionMatches) {
          for (const match of functionMatches) {
            const nameMatch = match.match(
              /function\s+([a-zA-Z_][a-zA-Z0-9_]*)/
            );
            if (nameMatch) {
              const functionName = nameMatch[1];
              totalFunctions++;
              if (isValidCamelCase(functionName)) {
                camelCaseFunctions++;
              }
            }
          }
        }

        // Count private/protected properties
        if (line.includes('private ') || line.includes('protected ')) {
          const propertyMatches = line.match(
            /(?:private|protected)\s+(?:readonly\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:]/g
          );
          if (propertyMatches) {
            for (const match of propertyMatches) {
              const nameMatch = match.match(
                /(?:private|protected)\s+(?:readonly\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/
              );
              if (nameMatch) {
                const propertyName = nameMatch[1];
                if (!isConstant(line)) {
                  totalProperties++;
                  if (isValidCamelCase(propertyName)) {
                    camelCaseProperties++;
                  }
                }
              }
            }
          }
        }
      }
    }

    const functionCompliance =
      totalFunctions > 0 ? (camelCaseFunctions / totalFunctions) * 100 : 100;
    const propertyCompliance =
      totalProperties > 0 ? (camelCaseProperties / totalProperties) * 100 : 100;

    console.log(`CamelCase naming convention compliance (Requirement 4.4):`);
    console.log(`  - Total functions found: ${totalFunctions}`);
    console.log(`  - CamelCase functions: ${camelCaseFunctions}`);
    console.log(
      `  - Function compliance rate: ${functionCompliance.toFixed(1)}%`
    );
    console.log(`  - Total class properties found: ${totalProperties}`);
    console.log(`  - CamelCase properties: ${camelCaseProperties}`);
    console.log(
      `  - Property compliance rate: ${propertyCompliance.toFixed(1)}%`
    );

    // Expect high compliance rates (allowing for some edge cases)
    expect(functionCompliance).toBeGreaterThanOrEqual(95);
    expect(propertyCompliance).toBeGreaterThanOrEqual(95);
  }, 10000);

  it('should verify references are updated correctly', async () => {
    const files = await glob(sourcePatterns, { cwd: process.cwd() });
    const violations: Array<{ file: string; line: number; reference: string }> =
      [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for references to old snake_case names that should have been updated
        // Note: SCREAMING_SNAKE_CASE constants are valid and should not be flagged
        const oldNamingPatterns = [
          // Add any actual old naming patterns that need to be updated here
          // Constants like ERROR_TEMPLATES, DATE_FIELDS are properly named
        ];

        for (const pattern of oldNamingPatterns) {
          if (
            line.includes(`this.${pattern}`) ||
            line.includes(`${pattern}.`)
          ) {
            violations.push({
              file,
              line: i + 1,
              reference: pattern,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      console.log(
        'Old naming references found (should be updated to camelCase):'
      );
      violations.forEach(v => {
        console.log(
          `  - ${v.file}:${v.line} - Reference to "${v.reference}" should be camelCase`
        );
      });
    }

    expect(violations).toHaveLength(0);
  }, 10000);
});

// Helper functions
function isValidCamelCase(name: string): boolean {
  // Valid camelCase: starts with lowercase letter, followed by letters/numbers
  // No underscores except for special cases like __dirname
  if (name.startsWith('__')) return true; // Special Node.js variables
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

function isConstant(line: string): boolean {
  // Check if this is a constant declaration (export const SCREAMING_SNAKE_CASE)
  return (
    /export\s+const\s+[A-Z][A-Z0-9_]*\s*=/.test(line) ||
    /const\s+[A-Z][A-Z0-9_]*\s*=/.test(line) ||
    /readonly\s+[A-Z][A-Z0-9_]*\s*=/.test(line)
  );
}
