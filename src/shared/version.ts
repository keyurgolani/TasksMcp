/**
 * Centralized version management
 * This file provides version information for the entire application
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VersionInfo {
  version: string;
  name: string;
  description: string;
}

let versionInfo: VersionInfo | null = null;

/**
 * Get version information from version.json
 */
export function getVersionInfo(): VersionInfo {
  if (!versionInfo) {
    try {
      const versionPath = join(__dirname, '../../version.json');
      const versionContent = readFileSync(versionPath, 'utf-8');
      versionInfo = JSON.parse(versionContent) as VersionInfo;
    } catch (_error) {
      // Fallback to package.json if version.json is not available
      try {
        const packagePath = join(__dirname, '../../package.json');
        const packageContent = readFileSync(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent) as {
          version: string;
          name: string;
          description: string;
        };
        versionInfo = {
          version: packageJson.version,
          name: packageJson.name,
          description: packageJson.description,
        };
      } catch (_fallbackError) {
        // Ultimate fallback
        versionInfo = {
          version: '2.0.0',
          name: 'task-list-mcp',
          description:
            'A Model Context Protocol (MCP) server for task management',
        };
      }
    }
  }
  return versionInfo;
}

/**
 * Get just the version string
 */
export function getVersion(): string {
  return getVersionInfo().version;
}

/**
 * Get the application name
 */
export function getAppName(): string {
  return getVersionInfo().name;
}

/**
 * Get the application description
 */
export function getAppDescription(): string {
  return getVersionInfo().description;
}

/**
 * Get formatted version info for display
 */
export function getFormattedVersionInfo(): string {
  const info = getVersionInfo();
  return `${info.name} v${info.version}`;
}
