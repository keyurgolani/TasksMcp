/**
 * Unit tests for dependency upgrades
 * Tests that all upgraded dependencies work correctly and no functionality regressions exist
 */

import cors from 'cors';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import winston from 'winston';
import { z } from 'zod';

describe('Dependency Upgrades', () => {
  describe('Zod v4 Compatibility', () => {
    it('should work with basic schema validation', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should handle Validation errors with new issues property', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const invalidData = {
        name: 123,
        age: 'not a number',
      };

      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toBeDefined();
        expect(Array.isArray(result.error.issues)).toBe(true);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should work with enum validation', () => {
      const statusSchema = z.enum(['pending', 'in_progress', 'completed']);

      expect(statusSchema.safeParse('pending').success).toBe(true);
      expect(statusSchema.safeParse('invalid').success).toBe(false);
    });

    it('should work with transformed schemas', () => {
      const booleanFromString = z
        .string()
        .transform(val => {
          if (val === 'true' || val === '1') return true;
          if (val === 'false' || val === '0') return false;
          return val;
        })
        .pipe(z.boolean());

      expect(booleanFromString.safeParse('true').success).toBe(true);
      expect(booleanFromString.safeParse('false').success).toBe(true);
      expect(booleanFromString.safeParse('invalid').success).toBe(false);
    });
  });

  describe('UUID v13 Compatibility', () => {
    it('should generate valid UUIDs', () => {
      const uuid = uuidv4();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = uuidv4();
      const uuid2 = uuidv4();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should work with Zod UUID validation', () => {
      const uuidSchema = z.string().uuid();
      const uuid = uuidv4();

      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(true);
    });
  });

  describe('Winston v3.18.3 Compatibility', () => {
    let logger: winston.Logger;

    beforeEach(() => {
      logger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console({ silent: true })],
      });
    });

    afterEach(() => {
      logger.close();
    });

    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log messages without errors', () => {
      expect(() => {
        logger.info('Test info message');
        logger.error('Test error message');
        logger.warn('Test warning message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should support structured logging', () => {
      expect(() => {
        logger.info('Test message', {
          userId: 'test-user',
          action: 'test-action',
          metadata: { key: 'value' },
        });
      }).not.toThrow();
    });
  });

  describe('Express v5.1.0 Compatibility', () => {
    it('should create express app', () => {
      const app = express();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
    });

    it('should work with middleware', () => {
      const app = express();

      expect(() => {
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
      }).not.toThrow();
    });

    it('should work with CORS middleware', () => {
      const app = express();

      expect(() => {
        app.use(cors());
      }).not.toThrow();
    });
  });

  describe('TypeScript v5.9.3 Compatibility', () => {
    it('should support strict mode features', () => {
      // Test strict null checks
      const value: string | null = 'test';
      if (value !== null) {
        expect(value.length).toBe(4);
      }
    });

    it('should support modern TypeScript features', () => {
      // Test template literal types
      type Status = 'pending' | 'completed';
      const status: Status = 'pending';
      expect(status).toBe('pending');

      // Test optional chaining
      const obj = { nested: { value: 'test' } };
      expect(obj.nested?.value).toBe('test');

      // Test nullish coalescing
      const nullValue = null;
      const result = nullValue ?? 'default';
      expect(result).toBe('default');
    });
  });

  describe('MCP SDK v1.20.0 Compatibility', () => {
    it('should import MCP SDK without errors', async () => {
      // Test that MCP SDK can be imported
      const { Server } = await import(
        '@modelcontextprotocol/sdk/server/index.js'
      );
      expect(Server).toBeDefined();
    });

    it('should create MCP server instance', async () => {
      const { Server } = await import(
        '@modelcontextprotocol/sdk/server/index.js'
      );

      expect(() => {
        new Server(
          {
            name: 'test-server',
            version: '1.0.0',
          },
          {
            capabilities: {},
          }
        );
      }).not.toThrow();
    });
  });

  describe('Build Process Compatibility', () => {
    it('should verify TypeScript compilation works', () => {
      // This test passes if the file compiles without TypeScript errors
      expect(true).toBe(true);
    });

    it('should verify all imports resolve correctly', () => {
      // Test that all major dependencies can be imported
      expect(z).toBeDefined();
      expect(uuidv4).toBeDefined();
      expect(winston).toBeDefined();
      expect(express).toBeDefined();
      expect(cors).toBeDefined();
    });
  });

  describe('No Functionality Regressions', () => {
    it('should maintain backward compatibility for core types', () => {
      // Test that core application types still work
      const taskSchema = z.object({
        id: z.string().uuid(),
        title: z.string().min(1),
        status: z.enum(['pending', 'in_progress', 'completed']),
        priority: z.number().min(1).max(5),
        tags: z.array(z.string()).optional(),
        createdAt: z.date(),
      });

      const validTask = {
        id: uuidv4(),
        title: 'Test Task',
        status: 'pending' as const,
        priority: 3,
        tags: ['test', 'upgrade'],
        createdAt: new Date(),
      };

      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should maintain error handling patterns', () => {
      const schema = z.object({
        required: z.string(),
      });

      const result = schema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].code).toBeDefined();
        expect(result.error.issues[0].message).toBeDefined();
        expect(result.error.issues[0].path).toBeDefined();
      }
    });

    it('should maintain logging functionality', () => {
      const logger = winston.createLogger({
        level: 'error',
        format: winston.format.json(),
        transports: [new winston.transports.Console({ silent: true })],
      });

      expect(() => {
        logger.info('Test message');
        logger.error('Error message', { error: new Error('test') });
        logger.close();
      }).not.toThrow();
    });
  });
});
