/**
 * File locking utility for concurrent file operations
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';

import { LOGGER } from './logger.js';

export interface LockOptions {
  timeout?: number; // Maximum time to wait for lock in milliseconds
  retryInterval?: number; // Time between retry attempts in milliseconds
  maxRetries?: number; // Maximum number of retry attempts
}

export class FileLock {
  private static locks = new Map<string, Promise<void>>();
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_RETRY_INTERVAL = 100; // 100ms
  private static readonly DEFAULT_MAX_RETRIES = 300; // 30 seconds / 100ms

  /**
   * Acquire a lock for the given file path
   */
  static async acquire(
    filePath: string,
    options: LockOptions = {}
  ): Promise<() => Promise<void>> {
    const {
      timeout = FileLock.DEFAULT_TIMEOUT,
      retryInterval = FileLock.DEFAULT_RETRY_INTERVAL,
      maxRetries = FileLock.DEFAULT_MAX_RETRIES,
    } = options;

    const lockPath = `${filePath}.lock`;
    const startTime = Date.now();
    let retries = 0;

    // Wait for any existing lock on this file to be released
    while (FileLock.locks.has(filePath)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Lock acquisition timeout for file: ${filePath}`);
      }
      if (retries >= maxRetries) {
        throw new Error(
          `Lock acquisition max retries exceeded for file: ${filePath}`
        );
      }

      await new Promise(resolve => setTimeout(resolve, retryInterval));
      retries++;
    }

    // Create lock file
    let lockAcquired = false;
    retries = 0;

    while (!lockAcquired && retries < maxRetries) {
      try {
        // Ensure parent directory exists
        await fs.mkdir(dirname(lockPath), { recursive: true });

        // Try to create lock file exclusively
        await fs.writeFile(lockPath, process.pid.toString(), { flag: 'wx' });
        lockAcquired = true;

        LOGGER.debug('File lock acquired', { filePath, lockPath, retries });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'EEXIST'
        ) {
          // Lock file exists, check if it's stale
          try {
            const lockContent = await fs.readFile(lockPath, 'utf8');
            const lockPid = parseInt(lockContent.trim(), 10);

            // Check if the process that created the lock is still running
            if (!FileLock.isProcessRunning(lockPid)) {
              // Stale lock, remove it
              await fs.unlink(lockPath);
              LOGGER.warn('Removed stale lock file', {
                filePath,
                lockPath,
                stalePid: lockPid,
              });
              continue; // Try again
            }
          } catch (_readError) {
            // If we can't read the lock file, assume it's corrupted and remove it
            try {
              await fs.unlink(lockPath);
              LOGGER.warn('Removed corrupted lock file', {
                filePath,
                lockPath,
              });
              continue; // Try again
            } catch (_unlinkError) {
              // Ignore unlink errors
            }
          }

          // Valid lock exists, wait and retry
          if (Date.now() - startTime > timeout) {
            throw new Error(`Lock acquisition timeout for file: ${filePath}`);
          }

          await new Promise(resolve => setTimeout(resolve, retryInterval));
          retries++;
        } else {
          throw error;
        }
      }
    }

    if (!lockAcquired) {
      throw new Error(
        `Failed to acquire lock for file: ${filePath} after ${retries} retries`
      );
    }

    // Create a promise that represents this lock
    let resolveFunction: () => void;
    const lockPromise = new Promise<void>(resolve => {
      resolveFunction = resolve;
    });

    FileLock.locks.set(filePath, lockPromise);

    // Return release function
    return async () => {
      try {
        await fs.unlink(lockPath);
        LOGGER.debug('File lock released', { filePath, lockPath });
      } catch (error) {
        LOGGER.warn('Failed to remove lock file', {
          filePath,
          lockPath,
          error,
        });
      } finally {
        // Remove from locks map and resolve the promise
        FileLock.locks.delete(filePath);
        if (resolveFunction) {
          resolveFunction();
        }
      }
    };
  }

  /**
   * Execute a function with a file lock
   */
  static async withLock<T>(
    filePath: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const release = await FileLock.acquire(filePath, options);
    try {
      return await fn();
    } finally {
      await release();
    }
  }

  /**
   * Check if a process is still running
   */
  private static isProcessRunning(pid: number): boolean {
    try {
      // Sending signal 0 checks if process exists without actually sending a signal
      process.kill(pid, 0);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ESRCH') {
        // Process doesn't exist
        return false;
      }
      // Other errors (like EPERM) mean the process exists but we can't signal it
      return true;
    }
  }

  /**
   * Clean up all locks (useful for testing)
   */
  static async cleanup(): Promise<void> {
    const lockPromises = Array.from(FileLock.locks.values());
    FileLock.locks.clear();

    // Wait for all locks to be released
    await Promise.allSettled(lockPromises);
  }

  /**
   * Get current lock count
   */
  static getLockCount(): number {
    return FileLock.locks.size;
  }
}
