/**
 * Unit tests for NotesManager
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { NotesManager } from '../../../../src/domain/tasks/notes-manager.js';

import type { ImplementationNote } from '../../../../src/shared/types/todo.js';

describe('NotesManager', () => {
  let notesManager: NotesManager;

  beforeEach(() => {
    notesManager = new NotesManager();
  });

  describe('createNote', () => {
    it('should create a note with valid input', async () => {
      const input = {
        entityId: 'task-123',
        entityType: 'task' as const,
        content: 'This is a test note',
        type: 'general' as const,
      };

      const note = await notesManager.createNote(input);

      expect(note).toMatchObject({
        content: 'This is a test note',
        type: 'general',
      });
      expect(note.id).toBeDefined();
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a note with author', async () => {
      const input = {
        entityId: 'task-123',
        entityType: 'task' as const,
        content: 'This is a test note',
        type: 'technical' as const,
        author: 'test-user',
      };

      const note = await notesManager.createNote(input);

      expect(note.author).toBe('test-user');
    });

    it('should trim whitespace from content', async () => {
      const input = {
        entityId: 'task-123',
        entityType: 'task' as const,
        content: '  This is a test note  ',
        type: 'general' as const,
      };

      const note = await notesManager.createNote(input);

      expect(note.content).toBe('This is a test note');
    });

    it('should throw error for empty content', async () => {
      const input = {
        entityId: 'task-123',
        entityType: 'task' as const,
        content: '',
        type: 'general' as const,
      };

      await expect(notesManager.createNote(input)).rejects.toThrow(
        'Note content cannot be empty'
      );
    });

    it('should throw error for content that is too long', async () => {
      const input = {
        entityId: 'task-123',
        entityType: 'task' as const,
        content: 'a'.repeat(10001),
        type: 'general' as const,
      };

      await expect(notesManager.createNote(input)).rejects.toThrow(
        'Note content is too long'
      );
    });

    it('should throw error for invalid note type', async () => {
      const input = {
        entityId: 'task-123',
        entityType: 'task' as const,
        content: 'This is a test note',

        type: 'invalid' as any,
      };

      await expect(notesManager.createNote(input)).rejects.toThrow(
        'Invalid note type'
      );
    });

    it('should create notes with all valid types', async () => {
      const types: ImplementationNote['type'][] = [
        'general',
        'technical',
        'decision',
        'learning',
      ];

      for (const type of types) {
        const input = {
          entityId: 'task-123',
          entityType: 'task' as const,
          content: `This is a ${type} note`,
          type,
        };

        const note = await notesManager.createNote(input);
        expect(note.type).toBe(type);
      }
    });
  });

  describe('updateNote', () => {
    let existingNote: ImplementationNote;

    beforeEach(async () => {
      existingNote = await notesManager.createNote({
        entityId: 'task-123',
        entityType: 'task',
        content: 'Original content',
        type: 'general',
      });
    });

    it('should update note content', async () => {
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedNote = await notesManager.updateNote(existingNote, {
        content: 'Updated content',
      });

      expect(updatedNote.content).toBe('Updated content');
      expect(updatedNote.id).toBe(existingNote.id);
      expect(updatedNote.createdAt).toEqual(existingNote.createdAt);
      expect(updatedNote.updatedAt.getTime()).toBeGreaterThan(
        existingNote.updatedAt.getTime()
      );
    });

    it('should update note type', async () => {
      const updatedNote = await notesManager.updateNote(existingNote, {
        type: 'technical',
      });

      expect(updatedNote.type).toBe('technical');
      expect(updatedNote.content).toBe(existingNote.content);
    });

    it('should update multiple fields', async () => {
      const updatedNote = await notesManager.updateNote(existingNote, {
        content: 'New content',
        type: 'decision',
        author: 'new-author',
      });

      expect(updatedNote.content).toBe('New content');
      expect(updatedNote.type).toBe('decision');
      expect(updatedNote.author).toBe('new-author');
    });

    it('should trim updated content', async () => {
      const updatedNote = await notesManager.updateNote(existingNote, {
        content: '  Updated content  ',
      });

      expect(updatedNote.content).toBe('Updated content');
    });

    it('should throw error for invalid updated content', async () => {
      await expect(
        notesManager.updateNote(existingNote, {
          content: '',
        })
      ).rejects.toThrow('Note content cannot be empty');
    });

    it('should throw error for invalid updated type', async () => {
      await expect(
        notesManager.updateNote(existingNote, {
          type: 'invalid' as any,
        })
      ).rejects.toThrow('Invalid note type');
    });
  });

  describe('getNotesHistory', () => {
    let notes: ImplementationNote[];

    beforeEach(async () => {
      // Create notes with different timestamps
      const note1 = await notesManager.createNote({
        entityId: 'task-123',
        entityType: 'task',
        content: 'First note',
        type: 'general',
      });

      // Simulate different creation times
      const note2 = {
        ...note1,
        id: 'note-2',
        content: 'Second note',
        createdAt: new Date(Date.now() + 1000),
      };
      const note3 = {
        ...note1,
        id: 'note-3',
        content: 'Third note',
        createdAt: new Date(Date.now() + 2000),
      };

      notes = [note1, note2, note3];
    });

    it('should return notes in descending order by default', async () => {
      const history = await notesManager.getNotesHistory(notes);

      expect(history).toHaveLength(3);
      expect(history[0]?.content).toBe('Third note');
      expect(history[1]?.content).toBe('Second note');
      expect(history[2]?.content).toBe('First note');
    });

    it('should return notes in ascending order when specified', async () => {
      const history = await notesManager.getNotesHistory(notes, 'asc');

      expect(history).toHaveLength(3);
      expect(history[0]?.content).toBe('First note');
      expect(history[1]?.content).toBe('Second note');
      expect(history[2]?.content).toBe('Third note');
    });

    it('should handle empty notes array', async () => {
      const history = await notesManager.getNotesHistory([]);

      expect(history).toHaveLength(0);
    });
  });

  describe('searchNotes', () => {
    let allNotes: Array<
      ImplementationNote & { entityId: string; entityType: 'task' | 'list' }
    >;

    beforeEach(async () => {
      const baseNote1 = await notesManager.createNote({
        entityId: 'task-1',
        entityType: 'task',
        content: 'This is about React components',
        type: 'technical',
      });

      const baseNote2 = await notesManager.createNote({
        entityId: 'task-2',
        entityType: 'task',
        content: 'General project notes',
        type: 'general',
      });

      const baseNote3 = await notesManager.createNote({
        entityId: 'list-1',
        entityType: 'list',
        content: 'Decision to use TypeScript',
        type: 'decision',
      });

      allNotes = [
        { ...baseNote1, entityId: 'task-1', entityType: 'task' },
        { ...baseNote2, entityId: 'task-2', entityType: 'task' },
        { ...baseNote3, entityId: 'list-1', entityType: 'list' },
      ];
    });

    it('should search notes by content', async () => {
      const result = await notesManager.searchNotes(allNotes, {
        query: 'React',
      });

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]?.content).toContain('React');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by entity type', async () => {
      const result = await notesManager.searchNotes(allNotes, {
        query: '',
        entityType: 'task',
      });

      expect(result.notes).toHaveLength(2);
      expect(result.notes.every(note => note.entityType === 'task')).toBe(true);
    });

    it('should filter by note type', async () => {
      const result = await notesManager.searchNotes(allNotes, {
        query: '',
        noteType: 'technical',
      });

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]?.type).toBe('technical');
    });

    it('should handle pagination', async () => {
      const result = await notesManager.searchNotes(allNotes, {
        query: '',
        limit: 2,
        offset: 0,
      });

      expect(result.notes).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      const result = await notesManager.searchNotes(allNotes, {
        query: 'REACT',
      });

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]?.content).toContain('React');
    });

    it('should return empty results for no matches', async () => {
      const result = await notesManager.searchNotes(allNotes, {
        query: 'nonexistent',
      });

      expect(result.notes).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('filterNotesByType', () => {
    let notes: ImplementationNote[];

    beforeEach(async () => {
      notes = [
        await notesManager.createNote({
          entityId: 'task-1',
          entityType: 'task',
          content: 'Technical note',
          type: 'technical',
        }),
        await notesManager.createNote({
          entityId: 'task-2',
          entityType: 'task',
          content: 'General note',
          type: 'general',
        }),
        await notesManager.createNote({
          entityId: 'task-3',
          entityType: 'task',
          content: 'Another technical note',
          type: 'technical',
        }),
      ];
    });

    it('should filter notes by type', () => {
      const technicalNotes = notesManager.filterNotesByType(notes, 'technical');

      expect(technicalNotes).toHaveLength(2);
      expect(technicalNotes.every(note => note.type === 'technical')).toBe(
        true
      );
    });

    it('should return empty array for non-matching type', () => {
      const decisionNotes = notesManager.filterNotesByType(notes, 'decision');

      expect(decisionNotes).toHaveLength(0);
    });
  });

  describe('getNotesInDateRange', () => {
    let notes: ImplementationNote[];

    beforeEach(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      notes = [
        {
          ...(await notesManager.createNote({
            entityId: 'task-1',
            entityType: 'task',
            content: 'Yesterday note',
            type: 'general',
          })),
          createdAt: yesterday,
        },
        {
          ...(await notesManager.createNote({
            entityId: 'task-2',
            entityType: 'task',
            content: 'Today note',
            type: 'general',
          })),
          createdAt: now,
        },
        {
          ...(await notesManager.createNote({
            entityId: 'task-3',
            entityType: 'task',
            content: 'Tomorrow note',
            type: 'general',
          })),
          createdAt: tomorrow,
        },
      ];
    });

    it('should return notes within date range', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const endDate = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

      const notesInRange = notesManager.getNotesInDateRange(
        notes,
        startDate,
        endDate
      );

      expect(notesInRange).toHaveLength(1);
      expect(notesInRange[0]?.content).toBe('Today note');
    });
  });

  describe('truncateNoteContent', () => {
    it('should not truncate short content', () => {
      const result = notesManager.truncateNoteContent('Short note', 100);

      expect(result.content).toBe('Short note');
      expect(result.isTruncated).toBe(false);
    });

    it('should truncate long content', () => {
      const longContent =
        'This is a very long note that should be truncated because it exceeds the maximum length';
      const result = notesManager.truncateNoteContent(longContent, 50);

      expect(result.content.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(result.isTruncated).toBe(true);
      expect(result.content).toContain('...');
    });

    it('should truncate at word boundary when possible', () => {
      const content = 'This is a test note with multiple words';
      const result = notesManager.truncateNoteContent(content, 15);

      expect(result.content).toBe('This is a test...');
      expect(result.isTruncated).toBe(true);
    });

    it('should use custom suffix', () => {
      const content = 'This is a long note';
      const result = notesManager.truncateNoteContent(content, 10, ' (more)');

      expect(result.content).toContain(' (more)');
      expect(result.isTruncated).toBe(true);
    });
  });

  describe('getNoteStatistics', () => {
    let notes: ImplementationNote[];

    beforeEach(async () => {
      notes = [
        await notesManager.createNote({
          entityId: 'task-1',
          entityType: 'task',
          content: 'Short',
          type: 'general',
        }),
        await notesManager.createNote({
          entityId: 'task-2',
          entityType: 'task',
          content: 'Medium length note',
          type: 'technical',
        }),
        await notesManager.createNote({
          entityId: 'task-3',
          entityType: 'task',
          content: 'This is a much longer note with more content',
          type: 'technical',
        }),
      ];
    });

    it('should calculate correct statistics', () => {
      const stats = notesManager.getNoteStatistics(notes);

      expect(stats.total).toBe(3);
      expect(stats.byType.general).toBe(1);
      expect(stats.byType.technical).toBe(2);
      expect(stats.byType.decision).toBe(0);
      expect(stats.byType.learning).toBe(0);
      expect(stats.averageLength).toBeGreaterThan(0);
      expect(stats.mostRecentDate).toBeInstanceOf(Date);
      expect(stats.oldestDate).toBeInstanceOf(Date);
    });

    it('should handle empty notes array', () => {
      const stats = notesManager.getNoteStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.averageLength).toBe(0);
      expect(stats.createdToday).toBe(0);
      expect(stats.createdThisWeek).toBe(0);
    });
  });

  describe('formatNotesForDisplay', () => {
    let notes: ImplementationNote[];

    beforeEach(async () => {
      notes = [
        await notesManager.createNote({
          entityId: 'task-1',
          entityType: 'task',
          content: 'First note',
          type: 'general',
        }),
        await notesManager.createNote({
          entityId: 'task-2',
          entityType: 'task',
          content: 'Second note',
          type: 'technical',
        }),
      ];
    });

    it('should format notes for display', () => {
      const formatted = notesManager.formatNotesForDisplay(notes);

      expect(formatted).toContain('First note');
      expect(formatted).toContain('Second note');
      expect(formatted).toContain('[GENERAL]');
      expect(formatted).toContain('[TECHNICAL]');
    });

    it('should handle empty notes array', () => {
      const formatted = notesManager.formatNotesForDisplay([]);

      expect(formatted).toBe('No implementation notes available.');
    });

    it('should group by type when requested', () => {
      const formatted = notesManager.formatNotesForDisplay(notes, {
        groupByType: true,
      });

      expect(formatted).toContain('General Notes');
      expect(formatted).toContain('Technical Notes');
    });

    it('should exclude metadata when requested', () => {
      const formatted = notesManager.formatNotesForDisplay(notes, {
        includeMetadata: false,
      });

      expect(formatted).not.toContain('Created:');
    });
  });

  describe('validateNotes', () => {
    it('should validate correct notes', () => {
      const validNotes: ImplementationNote[] = [
        {
          id: 'note-1',
          content: 'Valid note',
          type: 'general',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = notesManager.validateNotes(validNotes);

      expect(result.isValid).toBe(true);
      expect(result.validNotes).toHaveLength(1);
      expect(result.invalidNotes).toHaveLength(0);
    });

    it('should identify invalid notes', () => {
      const invalidNotes: any[] = [
        {
          // Missing id
          content: 'Valid note',
          type: 'general',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note-2',
          // Missing content
          type: 'general',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note-3',
          content: 'Valid note',
          type: 'invalid-type',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = notesManager.validateNotes(invalidNotes);

      expect(result.isValid).toBe(false);
      expect(result.validNotes).toHaveLength(0);
      expect(result.invalidNotes).toHaveLength(3);
      expect(result.errors).toContain('3 invalid notes found');
    });

    it('should warn about large number of notes', () => {
      const manyNotes: ImplementationNote[] = Array.from(
        { length: 150 },
        (_, i) => ({
          id: `note-${i}`,
          content: `Note ${i}`,
          type: 'general' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const result = notesManager.validateNotes(manyNotes);

      expect(result.warnings).toContain(
        'Large number of notes may impact performance'
      );
    });
  });
});
