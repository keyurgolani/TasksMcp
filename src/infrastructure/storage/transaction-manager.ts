/**
 * Transaction manager for atomic operations and rollback capabilities
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../shared/utils/logger.js';

import type { StorageBackend } from '../../shared/types/storage.js';
import type { TaskList } from '../../shared/types/task.js';

export interface Transaction {
  id: string;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'rolled_back';
  createdAt: Date;
  completedAt?: Date;
}

export interface TransactionOperation {
  type: 'save' | 'delete';
  key: string;
  data?: TaskList;
  backup?: TaskList;
  permanent?: boolean;
}

export interface TransactionResult {
  success: boolean;
  transactionId: string;
  operationsCompleted: number;
  error?: Error;
}

export class TransactionManager {
  private readonly activeTransactions = new Map<string, Transaction>();
  private readonly maxConcurrentTransactions = 100;
  private readonly transactionTimeout = 30000; // 30 seconds

  constructor(private readonly storage: StorageBackend) {}

  /**
   * Begin a new transaction
   */
  beginTransaction(): string {
    // Check concurrent transaction limit
    if (this.activeTransactions.size >= this.maxConcurrentTransactions) {
      throw new Error('Maximum concurrent transactions exceeded');
    }

    const transactionId = uuidv4();
    const transaction: Transaction = {
      id: transactionId,
      operations: [],
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeTransactions.set(transactionId, transaction);

    // Set timeout for transaction
    setTimeout(() => {
      void this.timeoutTransaction(transactionId);
    }, this.transactionTimeout);

    logger.debug('Transaction started', { transactionId });
    return transactionId;
  }

  /**
   * Add a save operation to the transaction
   */
  async addSaveOperation(
    transactionId: string,
    key: string,
    data: TaskList
  ): Promise<void> {
    const transaction = this.getActiveTransaction(transactionId);

    // Create backup of existing data if it exists
    let backup: TaskList | undefined;
    try {
      backup = (await this.storage.load(key, {})) ?? undefined;
    } catch (_error) {
      // Ignore errors when loading backup - item might not exist
      logger.debug('No existing data to backup', { key, transactionId });
    }

    const operation: TransactionOperation = {
      type: 'save',
      key,
      data,
    };

    if (backup) {
      operation.backup = backup;
    }

    transaction.operations.push(operation);

    logger.debug('Save operation added to transaction', {
      transactionId,
      key,
      operationCount: transaction.operations.length,
    });
  }

  /**
   * Add a delete operation to the transaction
   */
  async addDeleteOperation(
    transactionId: string,
    key: string,
    permanent = false
  ): Promise<void> {
    const transaction = this.getActiveTransaction(transactionId);

    // Create backup of existing data
    const backup = await this.storage.load(key, {});
    if (!backup) {
      throw new Error(`Cannot delete non-existent item: ${key}`);
    }

    transaction.operations.push({
      type: 'delete',
      key,
      backup,
      permanent,
    });

    logger.debug('Delete operation added to transaction', {
      transactionId,
      key,
      permanent,
      operationCount: transaction.operations.length,
    });
  }

  /**
   * Commit the transaction - execute all operations atomically
   */
  async commitTransaction(transactionId: string): Promise<TransactionResult> {
    const transaction = this.getActiveTransaction(transactionId);
    const startTime = Date.now();

    try {
      logger.info('Committing transaction', {
        transactionId,
        operationCount: transaction.operations.length,
      });

      // Execute all operations
      for (let i = 0; i < transaction.operations.length; i++) {
        const operation = transaction.operations[i];
        if (!operation) continue;

        try {
          if (operation.type === 'save') {
            if (!operation.data) {
              throw new Error('Save operation missing data');
            }
            await this.storage.save(operation.key, operation.data, {
              validate: true,
              backup: true,
            });
          } else if (operation.type === 'delete') {
            await this.storage.delete(operation.key, operation.permanent);
          }
        } catch (error) {
          // Rollback all completed operations
          await this.rollbackOperations(transaction.operations.slice(0, i));
          throw error;
        }
      }

      // Mark transaction as committed
      transaction.status = 'committed';
      transaction.completedAt = new Date();

      const result: TransactionResult = {
        success: true,
        transactionId,
        operationsCompleted: transaction.operations.length,
      };

      logger.info('Transaction committed successfully', {
        transactionId,
        operationsCompleted: transaction.operations.length,
        duration: Date.now() - startTime,
      });

      // Clean up transaction
      this.activeTransactions.delete(transactionId);

      return result;
    } catch (error) {
      transaction.status = 'rolled_back';
      transaction.completedAt = new Date();

      const result: TransactionResult = {
        success: false,
        transactionId,
        operationsCompleted: 0,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };

      logger.error('Transaction commit failed', {
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });

      // Clean up transaction
      this.activeTransactions.delete(transactionId);

      return result;
    }
  }

  /**
   * Rollback the transaction - undo all operations
   */
  async rollbackTransaction(transactionId: string): Promise<TransactionResult> {
    const transaction = this.getActiveTransaction(transactionId);
    const startTime = Date.now();

    try {
      logger.info('Rolling back transaction', {
        transactionId,
        operationCount: transaction.operations.length,
      });

      await this.rollbackOperations(transaction.operations);

      transaction.status = 'rolled_back';
      transaction.completedAt = new Date();

      const result: TransactionResult = {
        success: true,
        transactionId,
        operationsCompleted: 0,
      };

      logger.info('Transaction rolled back successfully', {
        transactionId,
        duration: Date.now() - startTime,
      });

      // Clean up transaction
      this.activeTransactions.delete(transactionId);

      return result;
    } catch (error) {
      const result: TransactionResult = {
        success: false,
        transactionId,
        operationsCompleted: 0,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };

      logger.error('Transaction rollback failed', {
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });

      // Clean up transaction anyway
      this.activeTransactions.delete(transactionId);

      return result;
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): Transaction | null {
    return this.activeTransactions.get(transactionId) ?? null;
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): Transaction[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Execute multiple operations atomically
   */
  async executeAtomic(
    operations: Array<{
      type: 'save' | 'delete';
      key: string;
      data?: TaskList;
      permanent?: boolean;
    }>
  ): Promise<TransactionResult> {
    const transactionId = this.beginTransaction();

    try {
      // Add all operations to transaction
      for (const op of operations) {
        if (op.type === 'save') {
          if (!op.data) {
            throw new Error('Save operation requires data');
          }
          await this.addSaveOperation(transactionId, op.key, op.data);
        } else if (op.type === 'delete') {
          await this.addDeleteOperation(transactionId, op.key, op.permanent);
        }
      }

      // Commit transaction
      return await this.commitTransaction(transactionId);
    } catch (error) {
      // Rollback on error
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  private getActiveTransaction(transactionId: string): Transaction {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }
    if (transaction.status !== 'pending') {
      throw new Error(`Transaction is not active: ${transactionId}`);
    }
    return transaction;
  }

  private async rollbackOperations(
    operations: TransactionOperation[]
  ): Promise<void> {
    // Rollback operations in reverse order
    for (let i = operations.length - 1; i >= 0; i--) {
      const operation = operations[i];
      if (!operation) continue;

      try {
        if (operation.type === 'save') {
          // Restore backup or delete if no backup existed
          if (operation.backup) {
            await this.storage.save(operation.key, operation.backup, {
              validate: true,
            });
          } else {
            await this.storage.delete(operation.key, true);
          }
        } else if (operation.type === 'delete') {
          // Restore deleted item
          if (operation.backup) {
            await this.storage.save(operation.key, operation.backup, {
              validate: true,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to rollback operation', {
          operation: operation.type,
          key: operation.key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other rollback operations
      }
    }
  }

  private async timeoutTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction && transaction.status === 'pending') {
      logger.warn('Transaction timed out, rolling back', { transactionId });
      await this.rollbackTransaction(transactionId);
    }
  }

  /**
   * Clean up completed transactions older than specified time
   */
  cleanupOldTransactions(maxAgeMs = 3600000): number {
    const cutoffTime = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [id, transaction] of this.activeTransactions) {
      if (
        transaction.status !== 'pending' &&
        transaction.createdAt.getTime() < cutoffTime
      ) {
        this.activeTransactions.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up old transactions', { count: cleanedCount });
    }

    return cleanedCount;
  }
}
