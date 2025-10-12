/**
 * Notes Manager - Handles CRUD operations for implementation notes on tasks and lists
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../shared/utils/logger.js';

import type { ImplementationNote } from '../../shared/types/task.js';
import type { ITaskListRepository } from '../repositories/task-list.repository.js';

export interface CreateNoteInput {
  entityId: string; // Task ID or List ID
  entityType: 'task' | 'list';
  content: string;
  type: ImplementationNote['type'];
  author?: string;
}

export interface UpdateNoteInput {
  noteId: string;
  content: string;
}

export interface SearchNotesInput {
  query: string;
  entityType?: 'task' | 'list';
  noteType?: ImplementationNote['type'];
  projectTag?: string;
  limit?: number;
  offset?: number;
}

export interface SearchNotesResult {
  notes: Array<
    ImplementationNote & { entityId: string; entityType: 'task' | 'list' }
  >;
  total: number;
  hasMore: boolean;
}

export interface NoteValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class NotesManager {
  // Repository for future direct notes persistence
  // Currently unused but prepared for future enhancements
  private readonly repository: ITaskListRepository | undefined;

  constructor(repository?: ITaskListRepository) {
    this.repository = repository;

    logger.debug('NotesManager initialized', {
      hasRepository: !!repository,
    });
  }

  /**
   * Gets the repository instance if available
   * @returns The repository instance or undefined
   */
  getRepository(): ITaskListRepository | undefined {
    return this.repository;
  }

  /**
   * Creates a new implementation note for a task
   */
  async addTaskNote(
    taskId: string,
    content: string,
    type: ImplementationNote['type'],
    author?: string
  ): Promise<ImplementationNote> {
    return this.createNote({
      entityId: taskId,
      entityType: 'task',
      content,
      type,
      author: author || 'system',
    });
  }

  /**
   * Creates a new implementation note for a list
   */
  async addListNote(
    listId: string,
    content: string,
    type: ImplementationNote['type'],
    author?: string
  ): Promise<ImplementationNote> {
    return this.createNote({
      entityId: listId,
      entityType: 'list',
      content,
      type,
      author: author || 'system',
    });
  }

  /**
   * Creates a new implementation note for a task or list
   */
  async createNote(input: CreateNoteInput): Promise<ImplementationNote> {
    try {
      logger.debug('Creating implementation note', {
        entityId: input.entityId,
        entityType: input.entityType,
        type: input.type,
        contentLength: input.content.length,
      });

      // Validate input
      this.validateNoteContent(input.content);
      this.validateNoteType(input.type);

      const now = new Date();
      const noteId = uuidv4();

      const note: ImplementationNote = {
        id: noteId,
        content: input.content.trim(),
        createdAt: now,
        updatedAt: now,
        type: input.type,
        ...(input.author && { author: input.author }),
      };

      logger.info('Implementation note created successfully', {
        noteId,
        entityId: input.entityId,
        entityType: input.entityType,
        type: input.type,
        contentLength: note.content.length,
      });

      return note;
    } catch (error) {
      logger.error('Failed to create implementation note', {
        entityId: input.entityId,
        entityType: input.entityType,
        error,
      });
      throw error;
    }
  }

  /**
   * Updates an existing implementation note
   */
  async updateNote(
    existingNote: ImplementationNote,
    updates: Partial<ImplementationNote>
  ): Promise<ImplementationNote> {
    try {
      logger.debug('Updating implementation note', {
        noteId: existingNote.id,
        hasContentUpdate: !!updates.content,
        hasTypeUpdate: !!updates.type,
      });

      // Validate updates
      if (updates.content !== undefined) {
        this.validateNoteContent(updates.content);
      }
      if (updates.type !== undefined) {
        this.validateNoteType(updates.type);
      }

      const now = new Date();

      const updatedNote: ImplementationNote = {
        ...existingNote,
        ...updates,
        updatedAt: now,
        // Preserve original creation date and ID
        id: existingNote.id,
        createdAt: existingNote.createdAt,
      };

      // Trim content if updated
      if (updatedNote.content) {
        updatedNote.content = updatedNote.content.trim();
      }

      logger.info('Implementation note updated successfully', {
        noteId: existingNote.id,
        contentChanged: updates.content !== undefined,
        typeChanged: updates.type !== undefined,
      });

      return updatedNote;
    } catch (error) {
      logger.error('Failed to update implementation note', {
        noteId: existingNote.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Validates note content
   */
  private validateNoteContent(content: string): NoteValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if content is provided
    if (!content || content.trim().length === 0) {
      errors.push('Note content cannot be empty');
    }

    // Check content length (reasonable limits)
    if (content.length > 10000) {
      errors.push('Note content is too long (maximum 10,000 characters)');
    }

    // Check for minimum meaningful content
    if (content.trim().length < 3) {
      warnings.push('Note content is very short and may not be meaningful');
    }

    // Check for potentially problematic content
    if (content.includes('\0')) {
      errors.push('Note content contains null characters');
    }

    const result: NoteValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (!result.isValid) {
      throw new Error(`Note validation failed: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      logger.warn('Note validation warnings', {
        warnings,
        contentLength: content.length,
      });
    }

    return result;
  }

  /**
   * Validates note type
   */
  private validateNoteType(type: ImplementationNote['type']): void {
    const validTypes: ImplementationNote['type'][] = [
      'general',
      'technical',
      'decision',
      'learning',
    ];

    if (!validTypes.includes(type)) {
      throw new Error(
        `Invalid note type: ${type}. Valid types are: ${validTypes.join(', ')}`
      );
    }
  }

  /**
   * Gets notes history for an entity (task or list)
   */
  async getNotesHistory(
    notes: ImplementationNote[],
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ImplementationNote[]> {
    try {
      logger.debug('Getting notes history', {
        noteCount: notes.length,
        sortOrder,
      });

      // Sort notes by creation date
      const sortedNotes = [...notes].sort((a, b) => {
        const dateA =
          a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB =
          b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);

        return sortOrder === 'desc'
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });

      logger.debug('Notes history retrieved successfully', {
        noteCount: sortedNotes.length,
        sortOrder,
      });

      return sortedNotes;
    } catch (error) {
      logger.error('Failed to get notes history', {
        noteCount: notes.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Searches notes by content and filters
   */
  async searchNotes(
    allNotes: Array<
      ImplementationNote & { entityId: string; entityType: 'task' | 'list' }
    >,
    input: SearchNotesInput
  ): Promise<SearchNotesResult> {
    try {
      logger.debug('Searching notes', {
        query: input.query,
        entityType: input.entityType,
        noteType: input.noteType,
        projectTag: input.projectTag,
        totalNotes: allNotes.length,
      });

      const query = input.query.toLowerCase().trim();
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;

      // Filter notes based on criteria
      const filteredNotes = allNotes.filter(note => {
        // Text search in content
        const matchesQuery =
          query === '' || note.content.toLowerCase().includes(query);

        // Entity type filter
        const matchesEntityType =
          !input.entityType || note.entityType === input.entityType;

        // Note type filter
        const matchesNoteType = !input.noteType || note.type === input.noteType;

        return matchesQuery && matchesEntityType && matchesNoteType;
      });

      // Sort by relevance (exact matches first, then by recency)
      filteredNotes.sort((a, b) => {
        if (query) {
          const aExactMatch = a.content.toLowerCase().includes(query);
          const bExactMatch = b.content.toLowerCase().includes(query);

          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
        }

        // Sort by creation date (most recent first)
        const dateA =
          a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB =
          b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      const total = filteredNotes.length;
      const paginatedNotes = filteredNotes.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      logger.info('Notes search completed', {
        query: input.query,
        totalMatches: total,
        returnedCount: paginatedNotes.length,
        hasMore,
      });

      return {
        notes: paginatedNotes,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to search notes', {
        query: input.query,
        error,
      });
      throw error;
    }
  }

  /**
   * Filters notes by type
   */
  filterNotesByType(
    notes: ImplementationNote[],
    type: ImplementationNote['type']
  ): ImplementationNote[] {
    return notes.filter(note => note.type === type);
  }

  /**
   * Gets notes created within a date range
   */
  getNotesInDateRange(
    notes: ImplementationNote[],
    startDate: Date,
    endDate: Date
  ): ImplementationNote[] {
    return notes.filter(note => {
      const noteDate =
        note.createdAt instanceof Date
          ? note.createdAt
          : new Date(note.createdAt);
      return noteDate >= startDate && noteDate <= endDate;
    });
  }

  /**
   * Gets notes created today
   */
  getNotesToday(notes: ImplementationNote[]): ImplementationNote[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getNotesInDateRange(notes, today, tomorrow);
  }

  /**
   * Gets notes created this week
   */
  getNotesThisWeek(notes: ImplementationNote[]): ImplementationNote[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return this.getNotesInDateRange(notes, startOfWeek, endOfWeek);
  }

  /**
   * Truncates note content for display
   */
  truncateNoteContent(
    content: string,
    maxLength: number = 200,
    suffix: string = '...'
  ): { content: string; isTruncated: boolean } {
    if (content.length <= maxLength) {
      return { content, isTruncated: false };
    }

    // Try to truncate at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    const finalContent =
      lastSpaceIndex > maxLength * 0.8
        ? truncated.substring(0, lastSpaceIndex) + suffix
        : truncated + suffix;

    return { content: finalContent, isTruncated: true };
  }

  /**
   * Formats notes for display
   */
  formatNotesForDisplay(
    notes: ImplementationNote[],
    options: {
      maxContentLength?: number;
      includeMetadata?: boolean;
      groupByType?: boolean;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): string {
    const {
      maxContentLength = 200,
      includeMetadata = true,
      groupByType = false,
      sortOrder = 'desc',
    } = options;

    if (notes.length === 0) {
      return 'No implementation notes available.';
    }

    // Sort notes
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA =
        a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB =
        b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);

      return sortOrder === 'desc'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    if (groupByType) {
      return this.formatNotesGroupedByType(
        sortedNotes,
        maxContentLength,
        includeMetadata
      );
    }

    return this.formatNotesLinear(
      sortedNotes,
      maxContentLength,
      includeMetadata
    );
  }

  /**
   * Formats notes in linear order
   */
  private formatNotesLinear(
    notes: ImplementationNote[],
    maxContentLength: number,
    includeMetadata: boolean
  ): string {
    const formattedNotes = notes.map((note, index) => {
      const { content, isTruncated } = this.truncateNoteContent(
        note.content,
        maxContentLength
      );
      const createdAt =
        note.createdAt instanceof Date
          ? note.createdAt
          : new Date(note.createdAt);

      let formatted = `${index + 1}. [${note.type.toUpperCase()}] ${content}`;

      if (isTruncated) {
        formatted += ' (truncated)';
      }

      if (includeMetadata) {
        formatted += `\n   Created: ${createdAt.toLocaleString()}`;
        if (note.author) {
          formatted += ` by ${note.author}`;
        }
      }

      return formatted;
    });

    return formattedNotes.join('\n\n');
  }

  /**
   * Formats notes grouped by type
   */
  private formatNotesGroupedByType(
    notes: ImplementationNote[],
    maxContentLength: number,
    includeMetadata: boolean
  ): string {
    const groupedNotes: Record<
      ImplementationNote['type'],
      ImplementationNote[]
    > = {
      general: [],
      technical: [],
      decision: [],
      learning: [],
    };

    // Group notes by type
    for (const note of notes) {
      groupedNotes[note.type].push(note);
    }

    const sections: string[] = [];

    // Format each type section
    for (const [type, typeNotes] of Object.entries(groupedNotes)) {
      if (typeNotes.length === 0) continue;

      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      sections.push(`${typeName} Notes (${typeNotes.length}):`);

      const formattedTypeNotes = typeNotes.map((note, index) => {
        const { content, isTruncated } = this.truncateNoteContent(
          note.content,
          maxContentLength
        );
        const createdAt =
          note.createdAt instanceof Date
            ? note.createdAt
            : new Date(note.createdAt);

        let formatted = `  ${index + 1}. ${content}`;

        if (isTruncated) {
          formatted += ' (truncated)';
        }

        if (includeMetadata) {
          formatted += `\n     Created: ${createdAt.toLocaleString()}`;
          if (note.author) {
            formatted += ` by ${note.author}`;
          }
        }

        return formatted;
      });

      sections.push(formattedTypeNotes.join('\n'));
    }

    return sections.join('\n\n');
  }

  /**
   * Validates a collection of notes
   */
  validateNotes(notes: ImplementationNote[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validNotes: ImplementationNote[];
    invalidNotes: Array<{ note: ImplementationNote; errors: string[] }>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validNotes: ImplementationNote[] = [];
    const invalidNotes: Array<{ note: ImplementationNote; errors: string[] }> =
      [];

    for (const note of notes) {
      try {
        // Validate note structure
        if (!note.id || typeof note.id !== 'string') {
          invalidNotes.push({ note, errors: ['Missing or invalid note ID'] });
          continue;
        }

        if (!note.content || typeof note.content !== 'string') {
          invalidNotes.push({
            note,
            errors: ['Missing or invalid note content'],
          });
          continue;
        }

        if (
          !note.type ||
          !['general', 'technical', 'decision', 'learning'].includes(note.type)
        ) {
          invalidNotes.push({ note, errors: ['Missing or invalid note type'] });
          continue;
        }

        if (!note.createdAt) {
          invalidNotes.push({ note, errors: ['Missing creation date'] });
          continue;
        }

        // Validate content
        this.validateNoteContent(note.content);
        this.validateNoteType(note.type);

        validNotes.push(note);
      } catch (validationError) {
        const errorMessage =
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error';
        invalidNotes.push({ note, errors: [errorMessage] });
      }
    }

    if (invalidNotes.length > 0) {
      errors.push(`${invalidNotes.length} invalid notes found`);
    }

    if (notes.length > 100) {
      warnings.push('Large number of notes may impact performance');
    }

    return {
      isValid: invalidNotes.length === 0,
      errors,
      warnings,
      validNotes,
      invalidNotes,
    };
  }
}
