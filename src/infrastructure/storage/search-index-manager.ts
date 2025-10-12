/**
 * Efficient search indexing system for implementation notes
 */

import { logger } from '../../shared/utils/logger.js';

import type { ImplementationNote } from '../../shared/types/task.js';

export interface SearchIndex {
  // Term -> Set of note IDs
  termIndex: Map<string, Set<string>>;
  // Note ID -> Note metadata for quick lookup
  noteMetadata: Map<string, NoteIndexEntry>;
  // Type index for filtering
  typeIndex: Map<ImplementationNote['type'], Set<string>>;
  // Date index for temporal queries
  dateIndex: Map<string, Set<string>>; // YYYY-MM-DD -> note IDs
}

export interface NoteIndexEntry {
  id: string;
  entityId: string;
  entityType: 'task' | 'list';
  type: ImplementationNote['type'];
  createdAt: Date;
  updatedAt: Date;
  contentLength: number;
  termCount: number;
  projectTag: string | undefined;
}

export interface SearchQuery {
  terms: string[];
  entityType?: 'task' | 'list';
  noteType?: ImplementationNote['type'];
  projectTag?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  noteId: string;
  score: number;
  matchedTerms: string[];
  snippet: string;
  metadata: NoteIndexEntry;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: SearchQuery;
}

export interface IndexStats {
  totalNotes: number;
  totalTerms: number;
  averageTermsPerNote: number;
  indexSize: number;
  typeDistribution: Record<string, number>;
}

export class NotesSearchIndexManager {
  private index: SearchIndex;

  constructor() {
    this.index = {
      termIndex: new Map(),
      noteMetadata: new Map(),
      typeIndex: new Map(),
      dateIndex: new Map(),
    };

    logger.debug('NotesSearchIndexManager initialized');
  }

  /**
   * Add a note to the search index
   */
  addNoteToIndex(
    note: ImplementationNote,
    entityId: string,
    entityType: 'task' | 'list',
    projectTag?: string
  ): void {
    // Remove existing entry if it exists
    this.removeNoteFromIndex(note.id);

    // Extract and normalize terms from content
    const terms = this.extractTerms(note.content);

    // Create metadata entry
    const metadata: NoteIndexEntry = {
      id: note.id,
      entityId,
      entityType,
      type: note.type,
      createdAt:
        note.createdAt instanceof Date
          ? note.createdAt
          : new Date(note.createdAt),
      updatedAt:
        note.updatedAt instanceof Date
          ? note.updatedAt
          : new Date(note.updatedAt),
      contentLength: note.content.length,
      termCount: terms.length,
      projectTag,
    };

    // Add to metadata index
    this.index.noteMetadata.set(note.id, metadata);

    // Add to term index
    for (const term of terms) {
      if (!this.index.termIndex.has(term)) {
        this.index.termIndex.set(term, new Set());
      }
      this.index.termIndex.get(term)!.add(note.id);
    }

    // Add to type index
    if (!this.index.typeIndex.has(note.type)) {
      this.index.typeIndex.set(note.type, new Set());
    }
    this.index.typeIndex.get(note.type)!.add(note.id);

    // Add to date index
    const dateKey = this.formatDateKey(metadata.createdAt);
    if (!this.index.dateIndex.has(dateKey)) {
      this.index.dateIndex.set(dateKey, new Set());
    }
    this.index.dateIndex.get(dateKey)!.add(note.id);

    logger.debug('Note added to index', {
      noteId: note.id,
      entityId,
      entityType,
      termCount: terms.length,
      contentLength: note.content.length,
    });
  }

  /**
   * Remove a note from the search index
   */
  removeNoteFromIndex(noteId: string): void {
    const metadata = this.index.noteMetadata.get(noteId);
    if (!metadata) {
      return; // Note not in index
    }

    // Remove from metadata index
    this.index.noteMetadata.delete(noteId);

    // Remove from term index
    for (const [term, noteIds] of this.index.termIndex) {
      noteIds.delete(noteId);
      if (noteIds.size === 0) {
        this.index.termIndex.delete(term);
      }
    }

    // Remove from type index
    const typeSet = this.index.typeIndex.get(metadata.type);
    if (typeSet) {
      typeSet.delete(noteId);
      if (typeSet.size === 0) {
        this.index.typeIndex.delete(metadata.type);
      }
    }

    // Remove from date index
    const dateKey = this.formatDateKey(metadata.createdAt);
    const dateSet = this.index.dateIndex.get(dateKey);
    if (dateSet) {
      dateSet.delete(noteId);
      if (dateSet.size === 0) {
        this.index.dateIndex.delete(dateKey);
      }
    }

    logger.debug('Note removed from index', { noteId });
  }

  /**
   * Search notes using the index
   */
  search(
    query: SearchQuery,
    noteContentMap: Map<string, ImplementationNote>
  ): SearchResponse {
    const startTime = performance.now();

    // Handle empty query
    if (!query.terms || query.terms.length === 0) {
      return this.createEmptySearchResponse(startTime);
    }

    // Normalize search terms
    const searchTerms = query.terms.map(term => this.normalizeText(term));

    // Find candidate notes based on term matching
    const candidateIds = this.findCandidateNotes(searchTerms);

    // Apply additional filters
    const filteredIds = this.applyFilters(candidateIds, query);

    // Score and rank results
    const results = this.scoreResults(filteredIds, searchTerms, noteContentMap);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 10;
    const paginatedResults = results.slice(offset, offset + limit);

    const searchTime = performance.now() - startTime;

    logger.debug('Search completed', {
      query: query.terms,
      candidateCount: candidateIds.size,
      filteredCount: filteredIds.size,
      resultCount: results.length,
      searchTime,
    });

    return {
      results: paginatedResults,
      totalResults: results.length,
      searchTime,
      query,
    };
  }

  /**
   * Rebuild the entire index from a collection of notes
   */
  rebuildIndex(
    notes: Array<
      ImplementationNote & {
        entityId: string;
        entityType: 'task' | 'list';
        projectTag?: string;
      }
    >
  ): void {
    logger.info('Rebuilding notes search index', {
      noteCount: notes.length,
    });

    // Clear existing index
    this.clearIndex();

    // Add all notes to index
    for (const note of notes) {
      this.addNoteToIndex(
        note,
        note.entityId,
        note.entityType,
        note.projectTag
      );
    }

    logger.info('Notes search index rebuilt', {
      noteCount: notes.length,
      termCount: this.index.termIndex.size,
      indexSize: this.calculateIndexSize(),
    });
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    const totalNotes = this.index.noteMetadata.size;
    const totalTerms = this.index.termIndex.size;

    let totalTermsInNotes = 0;
    for (const metadata of this.index.noteMetadata.values()) {
      totalTermsInNotes += metadata.termCount;
    }

    const averageTermsPerNote =
      totalNotes > 0 ? totalTermsInNotes / totalNotes : 0;

    // Calculate type distribution
    const typeDistribution: Record<string, number> = {};
    for (const [type, noteIds] of this.index.typeIndex) {
      typeDistribution[type] = noteIds.size;
    }

    return {
      totalNotes,
      totalTerms,
      averageTermsPerNote,
      indexSize: this.calculateIndexSize(),
      typeDistribution,
    };
  }

  /**
   * Clear the entire index
   */
  clearIndex(): void {
    this.index.termIndex.clear();
    this.index.noteMetadata.clear();
    this.index.typeIndex.clear();
    this.index.dateIndex.clear();

    logger.debug('Notes search index cleared');
  }

  // Private helper methods

  /**
   * Extract and normalize terms from content
   */
  private extractTerms(content: string): string[] {
    // Split on word boundaries and normalize
    const words = content
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2) // Filter out very short words
      .map(word => this.normalizeText(word));

    // Remove duplicates
    return Array.from(new Set(words));
  }

  /**
   * Normalize text for consistent indexing
   */
  private normalizeText(text: string): string {
    return text.toLowerCase().trim();
  }

  /**
   * Format date for indexing
   */
  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]!; // YYYY-MM-DD
  }

  /**
   * Find candidate notes based on term matching
   */
  private findCandidateNotes(searchTerms: string[]): Set<string> {
    if (searchTerms.length === 0) {
      return new Set();
    }

    // Start with notes that contain the first term
    const firstTerm = searchTerms[0]!;
    let candidates = new Set(this.index.termIndex.get(firstTerm) || []);

    // Intersect with notes containing other terms (AND logic)
    for (let i = 1; i < searchTerms.length; i++) {
      const term = searchTerms[i]!;
      const termNotes = this.index.termIndex.get(term) || new Set();
      candidates = new Set([...candidates].filter(id => termNotes.has(id)));
    }

    return candidates;
  }

  /**
   * Apply additional filters to candidate notes
   */
  private applyFilters(
    candidateIds: Set<string>,
    query: SearchQuery
  ): Set<string> {
    let filteredIds = new Set(candidateIds);

    // Filter by entity type
    if (query.entityType) {
      filteredIds = new Set(
        [...filteredIds].filter(id => {
          const metadata = this.index.noteMetadata.get(id);
          return metadata && metadata.entityType === query.entityType;
        })
      );
    }

    // Filter by note type
    if (query.noteType) {
      const typeNotes = this.index.typeIndex.get(query.noteType) || new Set();
      filteredIds = new Set([...filteredIds].filter(id => typeNotes.has(id)));
    }

    // Filter by project tag
    if (query.projectTag) {
      filteredIds = new Set(
        [...filteredIds].filter(id => {
          const metadata = this.index.noteMetadata.get(id);
          return metadata && metadata.projectTag === query.projectTag;
        })
      );
    }

    // Filter by date range
    if (query.dateFrom || query.dateTo) {
      filteredIds = new Set(
        [...filteredIds].filter(id => {
          const metadata = this.index.noteMetadata.get(id);
          if (!metadata) return false;

          const noteDate = metadata.createdAt;
          if (query.dateFrom && noteDate < query.dateFrom) return false;
          if (query.dateTo && noteDate > query.dateTo) return false;

          return true;
        })
      );
    }

    return filteredIds;
  }

  /**
   * Score and rank search results
   */
  private scoreResults(
    candidateIds: Set<string>,
    searchTerms: string[],
    noteContentMap: Map<string, ImplementationNote>
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const noteId of candidateIds) {
      const metadata = this.index.noteMetadata.get(noteId);
      const note = noteContentMap.get(noteId);

      if (!metadata || !note) {
        continue;
      }

      const score = this.calculateRelevanceScore(
        note.content,
        searchTerms,
        metadata
      );
      const matchedTerms = this.findMatchedTerms(note.content, searchTerms);
      const snippet = this.generateSnippet(note.content, searchTerms);

      results.push({
        noteId,
        score,
        matchedTerms,
        snippet,
        metadata,
      });
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate relevance score for a note
   */
  private calculateRelevanceScore(
    content: string,
    searchTerms: string[],
    metadata: NoteIndexEntry
  ): number {
    const normalizedContent = this.normalizeText(content);
    let score = 0;

    // Term frequency scoring
    for (const term of searchTerms) {
      const termRegex = new RegExp(term, 'gi');
      const matches = normalizedContent.match(termRegex);
      if (matches) {
        score += matches.length;
      }
    }

    // Boost score based on note type importance
    const typeBoosts: Record<string, number> = {
      'implementation-note': 1.0,
      'progress-update': 0.8,
      'decision-record': 1.2,
      troubleshooting: 0.9,
    };
    score *= typeBoosts[metadata.type] || 1.0;

    // Boost recent notes slightly
    const daysSinceCreation =
      (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0.1, 1 - daysSinceCreation / 365); // Decay over a year
    score *= 1 + recencyBoost * 0.1;

    // Normalize by content length to avoid bias toward longer notes
    score = score / Math.sqrt(metadata.contentLength);

    return score;
  }

  /**
   * Find which search terms matched in the content
   */
  private findMatchedTerms(content: string, searchTerms: string[]): string[] {
    const normalizedContent = this.normalizeText(content);
    const matched: string[] = [];

    for (const term of searchTerms) {
      if (normalizedContent.includes(term)) {
        matched.push(term);
      }
    }

    return matched;
  }

  /**
   * Generate a snippet showing search term context
   */
  private generateSnippet(
    content: string,
    searchTerms: string[],
    maxLength: number = 200
  ): string {
    const normalizedContent = this.normalizeText(content);

    // Find the first occurrence of any search term
    let bestPosition = -1;
    for (const term of searchTerms) {
      const position = normalizedContent.indexOf(term);
      if (position !== -1 && (bestPosition === -1 || position < bestPosition)) {
        bestPosition = position;
      }
    }

    if (bestPosition === -1) {
      // No terms found, return beginning of content
      return (
        content.substring(0, maxLength) +
        (content.length > maxLength ? '...' : '')
      );
    }

    // Calculate snippet boundaries
    const halfLength = Math.floor(maxLength / 2);
    const start = Math.max(0, bestPosition - halfLength);
    const end = Math.min(content.length, start + maxLength);

    let snippet = content.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Calculate approximate index size in bytes
   */
  private calculateIndexSize(): number {
    let size = 0;

    // Estimate term index size
    for (const [term, noteIds] of this.index.termIndex) {
      size += term.length * 2; // UTF-16 encoding
      size += noteIds.size * 36; // UUID size
    }

    // Estimate metadata size
    for (const _metadata of this.index.noteMetadata.values()) {
      size += 200; // Approximate metadata object size
    }

    // Add other indexes
    size += this.index.typeIndex.size * 50;
    size += this.index.dateIndex.size * 50;

    return size;
  }

  /**
   * Create empty search response
   */
  private createEmptySearchResponse(startTime: number): SearchResponse {
    return {
      results: [],
      totalResults: 0,
      searchTime: performance.now() - startTime,
      query: { terms: [] },
    };
  }
}
