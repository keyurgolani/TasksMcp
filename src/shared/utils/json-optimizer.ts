/**
 * Optimized JSON serialization/deserialization for large objects
 */

import { logger } from './logger.js';
import type { TodoList, TodoItem } from '../types/todo.js';

export interface SerializationOptions {
  compress?: boolean;
  excludeFields?: string[];
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

export interface DeserializationOptions {
  validateSchema?: boolean;
  convertDates?: boolean;
}

export class JsonOptimizer {
  private static readonly DATE_FIELDS = [
    'createdAt',
    'updatedAt',
    'completedAt',
    'archivedAt',
    'dueDate',
  ];

  /**
   * Optimized serialization for TodoList objects
   */
  static serializeTodoList(
    todoList: TodoList,
    options: SerializationOptions = {}
  ): string {
    const startTime = performance.now();

    try {
      // Create a copy to avoid modifying the original
      const serializable: TodoList = this.prepareForSerialization(
        todoList,
        options
      );

      // Use optimized JSON.stringify with replacer for large objects
      const result =
        options.prettyPrint === true
          ? JSON.stringify(serializable, this.createReplacer(options), 2)
          : JSON.stringify(serializable, this.createReplacer(options));

      const duration = performance.now() - startTime;

      if (duration > 10) {
        // Log slow serializations
        logger.debug('Slow JSON serialization detected', {
          listId: todoList.id,
          itemCount: todoList.items.length,
          duration: `${duration.toFixed(2)}ms`,
          size: `${(result.length / 1024).toFixed(1)}KB`,
        });
      }

      return result;
    } catch (error) {
      logger.error('JSON serialization failed', {
        listId: todoList.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Optimized deserialization for TodoList objects
   */
  static deserializeTodoList(
    jsonString: string,
    options: DeserializationOptions = {}
  ): TodoList {
    const startTime = performance.now();

    try {
      // Parse JSON with reviver for date conversion
      const parsed = JSON.parse(
        jsonString,
        options.convertDates === undefined || options.convertDates === true
          ? this.createReviver()
          : undefined
      ) as TodoList;

      // Validate schema if requested
      if (options.validateSchema === true) {
        this.validateTodoListSchema(parsed);
      }

      // Ensure dates are properly converted
      if (options.convertDates === undefined || options.convertDates === true) {
        this.convertDates(parsed);
      }

      // Ensure items array exists (safety check)
      if (
        parsed === null ||
        parsed === undefined ||
        typeof parsed !== 'object'
      ) {
        throw new Error('Invalid JSON: parsed data is not an object');
      }
      if (!Array.isArray(parsed.items)) {
        parsed.items = [];
      }

      // Migrate data for backward compatibility
      this.migrateDataStructure(parsed);

      const duration = performance.now() - startTime;

      if (duration > 10) {
        // Log slow deserializations
        logger.debug('Slow JSON deserialization detected', {
          listId: parsed.id,
          itemCount: parsed.items?.length || 0,
          duration: `${duration.toFixed(2)}ms`,
          size: `${(jsonString.length / 1024).toFixed(1)}KB`,
        });
      }

      return parsed;
    } catch (error) {
      logger.error('JSON deserialization failed', {
        error,
        jsonLength: jsonString.length,
      });
      throw error;
    }
  }

  /**
   * Batch serialize multiple TodoLists efficiently
   */
  static serializeTodoLists(
    todoLists: TodoList[],
    options: SerializationOptions = {}
  ): string {
    const startTime = performance.now();

    try {
      // Prepare all lists for serialization
      const serializable = todoLists.map(list =>
        this.prepareForSerialization(list, options)
      );

      const result =
        options.prettyPrint === true
          ? JSON.stringify(serializable, this.createReplacer(options), 2)
          : JSON.stringify(serializable, this.createReplacer(options));

      const duration = performance.now() - startTime;
      const totalItems = todoLists.reduce(
        (sum, list) => sum + list.items.length,
        0
      );

      logger.debug('Batch JSON serialization completed', {
        listCount: todoLists.length,
        totalItems,
        duration: `${duration.toFixed(2)}ms`,
        size: `${(result.length / 1024).toFixed(1)}KB`,
        avgPerList: `${(duration / todoLists.length).toFixed(2)}ms`,
      });

      return result;
    } catch (error) {
      logger.error('Batch JSON serialization failed', {
        listCount: todoLists.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Migrate data structure for backward compatibility
   */
  private static migrateDataStructure(todoList: TodoList): void {
    // Ensure list-level fields exist
    if (!todoList.implementationNotes) {
      todoList.implementationNotes = [];
    }

    // Ensure item-level fields exist
    if (todoList.items) {
      for (const item of todoList.items) {
        if (!item.implementationNotes) {
          item.implementationNotes = [];
        }
        if (!item.exitCriteria) {
          item.exitCriteria = [];
        }
      }
    }
  }

  /**
   * Batch deserialize multiple TodoLists efficiently
   */
  static deserializeTodoLists(
    jsonString: string,
    options: DeserializationOptions = {}
  ): TodoList[] {
    const startTime = performance.now();

    try {
      const parsed = JSON.parse(
        jsonString,
        options.convertDates === undefined || options.convertDates === true
          ? this.createReviver()
          : undefined
      ) as TodoList[];

      if (!Array.isArray(parsed)) {
        throw new Error('Expected array of TodoLists');
      }

      // Process each list
      for (const list of parsed) {
        if (options.validateSchema === true) {
          this.validateTodoListSchema(list);
        }

        if (
          options.convertDates === undefined ||
          options.convertDates === true
        ) {
          this.convertDates(list);
        }
      }

      const duration = performance.now() - startTime;
      const totalItems = parsed.reduce(
        (sum, list) => sum + (list.items?.length || 0),
        0
      );

      logger.debug('Batch JSON deserialization completed', {
        listCount: parsed.length,
        totalItems,
        duration: `${duration.toFixed(2)}ms`,
        size: `${(jsonString.length / 1024).toFixed(1)}KB`,
        avgPerList: `${(duration / parsed.length).toFixed(2)}ms`,
      });

      return parsed;
    } catch (error) {
      logger.error('Batch JSON deserialization failed', {
        error,
        jsonLength: jsonString.length,
      });
      throw error;
    }
  }

  /**
   * Create a streaming serializer for very large datasets
   */
  static createStreamingSerializer(options: SerializationOptions = {}): {
    serializeItems(items: TodoItem[]): Generator<string, void, unknown>;
    serializeToStream(
      items: TodoItem[],
      writeStream: NodeJS.WritableStream
    ): Promise<void>;
  } {
    return {
      *serializeItems(items: TodoItem[]): Generator<string, void, unknown> {
        yield '[';

        for (let i = 0; i < items.length; i++) {
          if (i > 0) yield ',';

          const item = items[i];
          if (item === null || item === undefined) continue;

          const serializable = JsonOptimizer.prepareItemForSerialization(
            item,
            options
          );
          yield JSON.stringify(
            serializable,
            JsonOptimizer.createReplacer(options)
          );
        }

        yield ']';
      },

      async serializeToStream(
        items: TodoItem[],
        writeStream: NodeJS.WritableStream
      ): Promise<void> {
        return new Promise((resolve, reject) => {
          const generator = this.serializeItems(items);

          const writeNext = (): void => {
            try {
              const { value, done } = generator.next();

              if (done === true) {
                writeStream.end();
                resolve();
                return;
              }

              writeStream.write(value, 'utf8', error => {
                if (error !== null && error !== undefined) {
                  reject(error);
                } else {
                  setImmediate(writeNext); // Yield control to event loop
                }
              });
            } catch (error) {
              reject(error);
            }
          };

          writeNext();
        });
      },
    };
  }

  // Private helper methods

  private static prepareForSerialization(
    todoList: TodoList,
    options: SerializationOptions
  ): TodoList {
    const result: Partial<TodoList> = { ...todoList };

    // Remove excluded fields
    if (options.excludeFields) {
      for (const field of options.excludeFields) {
        delete (result as Record<string, unknown>)[field];
      }
    }

    // Process items
    if (result.items) {
      result.items = result.items.map((item: TodoItem) =>
        this.prepareItemForSerialization(item, options)
      );
    }

    // Handle metadata
    if (options.includeMetadata !== true) {
      delete result.metadata;
      if (result.items) {
        result.items.forEach((item: Partial<TodoItem>) => {
          delete item.metadata;
        });
      }
    }

    return result as TodoList;
  }

  private static prepareItemForSerialization(
    item: TodoItem,
    options: SerializationOptions
  ): TodoItem {
    const result: Partial<TodoItem> = { ...item };

    // Remove excluded fields
    if (options.excludeFields) {
      for (const field of options.excludeFields) {
        delete (result as Record<string, unknown>)[field];
      }
    }

    // Handle metadata
    if (options.includeMetadata !== true) {
      delete result.metadata;
    }

    return result as TodoItem;
  }

  private static createReplacer(
    options: SerializationOptions
  ): (key: string, value: unknown) => unknown {
    const seen = new WeakSet();
    const excludeFields = options.excludeFields ?? [];

    return (key: string, value: unknown): unknown => {
      // Exclude specified fields
      if (excludeFields.includes(key)) {
        return undefined;
      }

      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }

      // Handle large arrays - could implement chunking here if needed
      if (Array.isArray(value) && value.length > 1000) {
        logger.debug('Large array detected in JSON serialization', {
          key,
          length: value.length,
        });
      }

      // Handle circular references using WeakSet
      if (value !== null && typeof value === 'object') {
        if (seen.has(value)) {
          return {}; // Return empty object instead of string to maintain JSON structure
        }
        seen.add(value);
      }

      return value;
    };
  }

  private static createReviver(): (key: string, value: unknown) => unknown {
    return (key: string, value: unknown): unknown => {
      // Convert ISO date strings back to Date objects for known date fields
      if (typeof value === 'string' && this.DATE_FIELDS.includes(key)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Handle ISO date strings in general (for any field that looks like a date)
      if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      return value;
    };
  }

  private static convertDates(todoList: TodoList): void {
    // Convert list-level dates
    const listRecord = todoList as unknown as Record<string, unknown>;
    for (const field of this.DATE_FIELDS) {
      const value = listRecord[field];
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          listRecord[field] = date;
        }
      }
    }

    // Convert dates in list-level implementation notes
    if (todoList.implementationNotes && Array.isArray(todoList.implementationNotes)) {
      for (const note of todoList.implementationNotes) {
        this.convertDatesInObject(note);
      }
    }

    // Convert item-level dates
    if (todoList.items !== null && todoList.items !== undefined) {
      for (const item of todoList.items) {
        const itemRecord = item as unknown as Record<string, unknown>;
        for (const field of this.DATE_FIELDS) {
          const value = itemRecord[field];
          if (typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              itemRecord[field] = date;
            }
          }
        }

        // Convert dates in item-level implementation notes
        if (item.implementationNotes && Array.isArray(item.implementationNotes)) {
          for (const note of item.implementationNotes) {
            this.convertDatesInObject(note);
          }
        }

        // Convert dates in action plan steps if present
        if (item.actionPlan && item.actionPlan.steps && Array.isArray(item.actionPlan.steps)) {
          for (const step of item.actionPlan.steps) {
            this.convertDatesInObject(step);
          }
        }
      }
    }
  }

  private static convertDatesInObject(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const field of this.DATE_FIELDS) {
      const value = obj[field];
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          obj[field] = date;
        }
      }
    }
  }

  private static validateTodoListSchema(todoList: unknown): void {
    if (
      todoList === null ||
      todoList === undefined ||
      typeof todoList !== 'object'
    ) {
      throw new Error('Invalid TodoList: not an object');
    }

    const list = todoList as Record<string, unknown>;

    if (typeof list['id'] !== 'string' || list['id'] === '') {
      throw new Error('Invalid TodoList: missing or invalid id');
    }

    if (typeof list['title'] !== 'string' || list['title'] === '') {
      throw new Error('Invalid TodoList: missing or invalid title');
    }

    if (!Array.isArray(list['items'])) {
      throw new Error('Invalid TodoList: items must be an array');
    }

    // Validate a sample of items for performance
    const items = list['items'] as unknown[];
    const sampleSize = Math.min(10, items.length);
    for (let i = 0; i < sampleSize; i++) {
      const item = items[i];
      if (item === null || item === undefined || typeof item !== 'object') {
        throw new Error(`Invalid TodoItem at index ${i}: not an object`);
      }
      const todoItem = item as Record<string, unknown>;
      if (typeof todoItem['id'] !== 'string' || todoItem['id'] === '') {
        throw new Error(
          `Invalid TodoItem at index ${i}: missing or invalid id`
        );
      }
      if (typeof todoItem['title'] !== 'string' || todoItem['title'] === '') {
        throw new Error(
          `Invalid TodoItem at index ${i}: missing or invalid title`
        );
      }
    }
  }

  /**
   * Estimate the memory size of a serialized object
   */
  static estimateSerializedSize(obj: unknown): number {
    try {
      // Quick estimation without full serialization
      const sample = JSON.stringify(obj).length;
      return sample * 2; // Rough estimate for UTF-16 encoding
    } catch {
      return 0;
    }
  }

  /**
   * Check if an object is too large for efficient serialization
   */
  static isLargeObject(obj: unknown, thresholdMB: number = 10): boolean {
    const estimatedSize = this.estimateSerializedSize(obj);
    return estimatedSize > thresholdMB * 1024 * 1024;
  }
}
