/**
 * Notes search indexing for fast text search
 */

import type { ImplementationNote } from '../../shared/types/task.js';

export interface SearchResult {
  noteId: string;
  listId: string;
  taskId: string | undefined;
  content: string;
  score: number;
}

export class NotesSearchIndex {
  private index = new Map<
    string,
    {
      content: string;
      listId: string;
      taskId: string | undefined;
      words: Set<string>;
    }
  >();
  private rebuildCount = 0;

  /**
   * Add note to search index
   */
  addNote(
    noteId: string,
    note: ImplementationNote,
    listId: string,
    taskId?: string
  ): void {
    const words = this.tokenize(note.content);
    this.index.set(noteId, {
      content: note.content,
      listId,
      taskId,
      words: new Set(words),
    });
  }

  /**
   * Remove note from search index
   */
  removeNote(noteId: string): boolean {
    return this.index.delete(noteId);
  }

  /**
   * Search notes by query (supports both string and object queries)
   */
  search(
    query: string | Record<string, unknown>,
    noteContentMapOrLimit?: Map<string, unknown> | number
  ): SearchResult[] | Record<string, unknown> {
    // Handle different method signatures for compatibility with tests
    if (typeof query === 'object' && query['terms']) {
      // Advanced search with object query
      return this.advancedSearch(query);
    }

    // Handle non-string queries
    if (typeof query !== 'string') {
      return [];
    }

    const limit =
      typeof noteContentMapOrLimit === 'number' ? noteContentMapOrLimit : 10;
    const queryWords = this.tokenize(query.toLowerCase());
    const results: SearchResult[] = [];

    for (const [noteId, indexEntry] of this.index.entries()) {
      let score = 0;

      // Calculate score based on word matches
      for (const word of queryWords) {
        if (indexEntry.words.has(word)) {
          score += 1;
        }

        // Partial matches get lower score
        for (const indexWord of indexEntry.words) {
          if (indexWord.includes(word) && indexWord !== word) {
            score += 0.5;
          }
        }
      }

      if (score > 0) {
        results.push({
          noteId,
          listId: indexEntry.listId,
          taskId: indexEntry.taskId,
          content: indexEntry.content,
          score,
        });
      }
    }

    // Sort by score (highest first) and limit results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Advanced search with object query and filters
   */
  private advancedSearch(
    query: Record<string, unknown>
  ): Record<string, unknown> {
    const startTime = performance.now();
    const results: Record<string, unknown>[] = [];
    const terms = (query['terms'] as string[]) || [];
    const limit = (query['limit'] as number) || 10;

    for (const [noteId, indexEntry] of this.index.entries()) {
      let score = 0;

      // Calculate score based on term matches
      for (const term of terms) {
        const termWords = this.tokenize(term.toLowerCase());
        for (const word of termWords) {
          if (indexEntry.words.has(word)) {
            score += 1;
          }
        }
      }

      if (score > 0) {
        results.push({
          noteId,
          listId: indexEntry.listId,
          taskId: indexEntry.taskId,
          content: indexEntry.content,
          score,
          metadata: {
            entityType: query['entityType'] || 'task',
            type: query['noteType'] || 'technical',
          },
        });
      }
    }

    const searchTime = performance.now() - startTime;

    return {
      results: results
        .sort((a, b) => (b['score'] as number) - (a['score'] as number))
        .slice(0, limit as number),
      searchTime,
    };
  }

  /**
   * Clear all indexed notes
   */
  clear(): void {
    this.index.clear();
  }

  /**
   * Get index size
   */
  size(): number {
    return this.index.size;
  }

  /**
   * Rebuild index from notes
   */
  rebuild(
    notes: Array<{
      id: string;
      note: ImplementationNote;
      listId: string;
      taskId?: string;
    }>
  ): void {
    this.clear();
    for (const { id, note, listId, taskId } of notes) {
      this.addNote(id, note, listId, taskId);
    }
  }

  /**
   * Tokenize text into searchable words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Rebuild index from notes array
   */
  rebuildIndex(
    notes: Array<{
      id: string;
      content: string;
      listId: string;
      taskId?: string;
    }>
  ): void {
    this.clear();
    this.rebuildCount++;
    for (const note of notes) {
      this.addNote(
        note.id,
        { content: note.content } as ImplementationNote,
        note.listId,
        note.taskId
      );
    }
  }

  /**
   * Index a note (alias for addNote for compatibility)
   */
  indexNote(
    note: Record<string, unknown>,
    entityId: string,
    entityType?: string
  ): void {
    const implementationNote: ImplementationNote = {
      id: (note['id'] as string) || entityId,
      content: note['content'] as string,
      type:
        (note['type'] as 'general' | 'technical' | 'decision' | 'learning') ||
        'general',
      createdAt: (note['createdAt'] as Date) || new Date(),
      updatedAt: (note['updatedAt'] as Date) || new Date(),
    };
    this.addNote(
      (note['id'] as string) || entityId,
      implementationNote,
      entityId,
      entityType
    );
  }

  /**
   * Clear the search index (alias for clear)
   */
  clearIndex(): void {
    this.clear();
  }
}

// Export singleton instance
export const notesSearchIndex = new NotesSearchIndex();
