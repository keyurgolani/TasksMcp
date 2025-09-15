/**
 * Efficient search indexing system for implementation notes
 */

import { logger } from '../../shared/utils/logger.js';
import { performanceMonitor } from '../monitoring/performance-monitor.js';
import type { ImplementationNote } from '../../shared/types/todo.js';

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
  projectTag?: string;
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
  total: number;
  hasMore: boolean;
  searchTime: number;
  indexStats: {
    totalNotes: number;
    totalTerms: number;
    indexSize: number;
  };
}

export interface IndexStats {
  totalNotes: number;
  totalTerms: number;
  averageTermsPerNote: number;
  memoryUsage: number;
  lastRebuild: Date;
  rebuildCount: number;
}

export class NotesSearchIndex {
  private index: SearchIndex = {
    termIndex: new Map(),
    noteMetadata: new Map(),
    typeIndex: new Map(),
    dateIndex: new Map(),
  };

  private readonly stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'would', 'you', 'your', 'this', 'they',
  ]);

  private rebuildCount = 0;
  private lastRebuild = new Date();

  constructor() {
    logger.debug('NotesSearchIndex initialized');
  }

  /**
   * Add or update a note in the search index
   */
  indexNote(
    note: ImplementationNote,
    entityId: string,
    entityType: 'task' | 'list',
    projectTag?: string
  ): void {
    performanceMonitor.timeOperation(
      'notes_index_add',
      async () => {
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
          createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
          updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt),
          contentLength: note.content.length,
          termCount: terms.length,
          projectTag: projectTag || '',
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

        logger.debug('Note indexed', {
          noteId: note.id,
          entityId,
          entityType,
          termCount: terms.length,
          contentLength: note.content.length,
        });
      },
      { noteId: note.id, entityId, entityType }
    );
  }

  /**
   * Remove a note from the search index
   */
  removeNoteFromIndex(noteId: string): void {
    performanceMonitor.timeOperation(
      'notes_index_remove',
      async () => {
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
        const typeNotes = this.index.typeIndex.get(metadata.type);
        if (typeNotes) {
          typeNotes.delete(noteId);
          if (typeNotes.size === 0) {
            this.index.typeIndex.delete(metadata.type);
          }
        }

        // Remove from date index
        const dateKey = this.formatDateKey(metadata.createdAt);
        const dateNotes = this.index.dateIndex.get(dateKey);
        if (dateNotes) {
          dateNotes.delete(noteId);
          if (dateNotes.size === 0) {
            this.index.dateIndex.delete(dateKey);
          }
        }

        logger.debug('Note removed from index', { noteId });
      },
      { noteId }
    );
  }

  /**
   * Search notes using the index
   */
  search(
    query: SearchQuery,
    noteContentMap: Map<string, ImplementationNote>
  ): SearchResponse {
    const startTime = performance.now();
    
    try {
      // Normalize search terms
      const searchTerms = query.terms
        .map(term => this.normalizeText(term))
        .filter(term => term.length > 0 && !this.stopWords.has(term));

      if (searchTerms.length === 0) {
        return this.createEmptySearchResponse(startTime);
      }

      // Find candidate note IDs based on term matches
      let candidateIds = this.findCandidateNotes(searchTerms);

      // Apply filters
      candidateIds = this.applyFilters(candidateIds, query);

      // Score and rank results
      const scoredResults = this.scoreResults(candidateIds, searchTerms, noteContentMap);

      // Sort by score (descending)
      scoredResults.sort((a, b) => b.score - a.score);

      // Apply pagination
      const total = scoredResults.length;
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      const paginatedResults = scoredResults.slice(offset, offset + limit);

      const searchTime = performance.now() - startTime;

      logger.debug('Notes search completed', {
        query: query.terms.join(' '),
        totalResults: total,
        returnedResults: paginatedResults.length,
        searchTime,
      });

      return {
        results: paginatedResults,
        total,
        hasMore: offset + limit < total,
        searchTime,
        indexStats: {
          totalNotes: this.index.noteMetadata.size,
          totalTerms: this.index.termIndex.size,
          indexSize: this.calculateIndexSize(),
        },
      };
    } catch (error) {
      logger.error('Notes search failed', { query, error });
      return this.createEmptySearchResponse(startTime);
    }
  }

  /**
   * Rebuild the entire search index
   */
  rebuildIndex(
    notes: Array<ImplementationNote & { entityId: string; entityType: 'task' | 'list'; projectTag?: string }>
  ): void {
    performanceMonitor.timeOperation(
      'notes_index_rebuild',
      async () => {
        logger.info('Rebuilding notes search index', { noteCount: notes.length });

        // Clear existing index
        this.clearIndex();

        // Index all notes
        for (const note of notes) {
          this.indexNote(note, note.entityId, note.entityType, note.projectTag);
        }

        this.rebuildCount++;
        this.lastRebuild = new Date();

        logger.info('Notes search index rebuilt', {
          noteCount: notes.length,
          termCount: this.index.termIndex.size,
          rebuildCount: this.rebuildCount,
        });
      },
      { noteCount: notes.length }
    );
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

    const averageTermsPerNote = totalNotes > 0 ? totalTermsInNotes / totalNotes : 0;

    return {
      totalNotes,
      totalTerms,
      averageTermsPerNote,
      memoryUsage: this.calculateIndexSize(),
      lastRebuild: this.lastRebuild,
      rebuildCount: this.rebuildCount,
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

  /**
   * Get suggestions for autocomplete
   */
  getSuggestions(partialTerm: string, limit: number = 10): string[] {
    const normalizedTerm = this.normalizeText(partialTerm);
    if (normalizedTerm.length < 2) {
      return [];
    }

    const suggestions: Array<{ term: string; frequency: number }> = [];

    for (const [term, noteIds] of this.index.termIndex) {
      if (term.startsWith(normalizedTerm) && term !== normalizedTerm) {
        suggestions.push({
          term,
          frequency: noteIds.size,
        });
      }
    }

    // Sort by frequency (descending) and then alphabetically
    suggestions.sort((a, b) => {
      if (a.frequency !== b.frequency) {
        return b.frequency - a.frequency;
      }
      return a.term.localeCompare(b.term);
    });

    return suggestions.slice(0, limit).map(s => s.term);
  }

  // Private methods

  private extractTerms(content: string): string[] {
    // Split content into words and normalize
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 0);

    // Remove stop words and short words
    const terms = words.filter(word => 
      word.length >= 2 && 
      !this.stopWords.has(word) &&
      !/^\d+$/.test(word) // Remove pure numbers
    );

    // Add bigrams for better phrase matching
    const bigrams: string[] = [];
    for (let i = 0; i < terms.length - 1; i++) {
      const bigram = `${terms[i]} ${terms[i + 1]}`;
      bigrams.push(bigram);
    }

    return [...terms, ...bigrams];
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]!; // YYYY-MM-DD
  }

  private findCandidateNotes(searchTerms: string[]): Set<string> {
    if (searchTerms.length === 0) {
      return new Set();
    }

    // Start with notes that match the first term
    let candidates = new Set(this.index.termIndex.get(searchTerms[0]!) || []);

    // For multiple terms, find intersection (AND logic)
    for (let i = 1; i < searchTerms.length; i++) {
      const termNotes = this.index.termIndex.get(searchTerms[i]!) || new Set();
      candidates = new Set([...candidates].filter(id => termNotes.has(id)));
    }

    return candidates;
  }

  private applyFilters(candidateIds: Set<string>, query: SearchQuery): Set<string> {
    let filteredIds = new Set(candidateIds);

    // Filter by entity type
    if (query.entityType) {
      filteredIds = new Set([...filteredIds].filter(id => {
        const metadata = this.index.noteMetadata.get(id);
        return metadata?.entityType === query.entityType;
      }));
    }

    // Filter by note type
    if (query.noteType) {
      const typeNotes = this.index.typeIndex.get(query.noteType) || new Set();
      filteredIds = new Set([...filteredIds].filter(id => typeNotes.has(id)));
    }

    // Filter by project tag
    if (query.projectTag) {
      filteredIds = new Set([...filteredIds].filter(id => {
        const metadata = this.index.noteMetadata.get(id);
        return metadata?.projectTag === query.projectTag;
      }));
    }

    // Filter by date range
    if (query.dateFrom || query.dateTo) {
      filteredIds = new Set([...filteredIds].filter(id => {
        const metadata = this.index.noteMetadata.get(id);
        if (!metadata) return false;

        const noteDate = metadata.createdAt;
        
        if (query.dateFrom && noteDate < query.dateFrom) {
          return false;
        }
        
        if (query.dateTo && noteDate > query.dateTo) {
          return false;
        }
        
        return true;
      }));
    }

    return filteredIds;
  }

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

      // Calculate relevance score
      const score = this.calculateRelevanceScore(note.content, searchTerms, metadata);
      
      // Find matched terms
      const matchedTerms = this.findMatchedTerms(note.content, searchTerms);
      
      // Generate snippet
      const snippet = this.generateSnippet(note.content, searchTerms);

      results.push({
        noteId,
        score,
        matchedTerms,
        snippet,
        metadata,
      });
    }

    return results;
  }

  private calculateRelevanceScore(
    content: string,
    searchTerms: string[],
    metadata: NoteIndexEntry
  ): number {
    const normalizedContent = this.normalizeText(content);
    let score = 0;

    for (const term of searchTerms) {
      // Count term frequency
      const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = normalizedContent.match(termRegex) || [];
      const termFrequency = matches.length;
      
      if (termFrequency > 0) {
        // TF-IDF inspired scoring
        const tf = termFrequency / metadata.termCount;
        const idf = Math.log(this.index.noteMetadata.size / (this.index.termIndex.get(term)?.size || 1));
        score += tf * idf;
      }
    }

    // Boost score based on note type (decisions and technical notes are more important)
    switch (metadata.type) {
      case 'decision':
        score *= 1.5;
        break;
      case 'technical':
        score *= 1.3;
        break;
      case 'learning':
        score *= 1.2;
        break;
      case 'general':
        score *= 1.0;
        break;
    }

    // Boost recent notes slightly
    const daysSinceCreation = (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0.1, 1 - (daysSinceCreation / 365)); // Decay over a year
    score *= (1 + recencyBoost * 0.1);

    return score;
  }

  private findMatchedTerms(content: string, searchTerms: string[]): string[] {
    const normalizedContent = this.normalizeText(content);
    const matchedTerms: string[] = [];

    for (const term of searchTerms) {
      const termRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (termRegex.test(normalizedContent)) {
        matchedTerms.push(term);
      }
    }

    return matchedTerms;
  }

  private generateSnippet(content: string, searchTerms: string[], maxLength: number = 200): string {
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
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Create snippet around the found term
    const snippetStart = Math.max(0, bestPosition - maxLength / 2);
    const snippetEnd = Math.min(content.length, snippetStart + maxLength);
    
    let snippet = content.substring(snippetStart, snippetEnd);
    
    // Add ellipsis if needed
    if (snippetStart > 0) {
      snippet = '...' + snippet;
    }
    if (snippetEnd < content.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  private calculateIndexSize(): number {
    let size = 0;
    
    // Estimate term index size
    for (const [term, noteIds] of this.index.termIndex) {
      size += term.length * 2; // UTF-16 encoding
      size += noteIds.size * 36; // UUID size
    }
    
    // Estimate metadata size
    for (const metadata of this.index.noteMetadata.values()) {
      size += JSON.stringify(metadata).length * 2;
    }
    
    // Add overhead for Maps and Sets
    size += this.index.termIndex.size * 100; // Map overhead
    size += this.index.noteMetadata.size * 100;
    size += this.index.typeIndex.size * 100;
    size += this.index.dateIndex.size * 100;
    
    return size;
  }

  private createEmptySearchResponse(startTime: number): SearchResponse {
    return {
      results: [],
      total: 0,
      hasMore: false,
      searchTime: performance.now() - startTime,
      indexStats: {
        totalNotes: this.index.noteMetadata.size,
        totalTerms: this.index.termIndex.size,
        indexSize: this.calculateIndexSize(),
      },
    };
  }
}

// Global notes search index instance
let _notesSearchIndex: NotesSearchIndex | undefined;

export const notesSearchIndex = {
  get instance(): NotesSearchIndex {
    if (!_notesSearchIndex) {
      _notesSearchIndex = new NotesSearchIndex();
    }
    return _notesSearchIndex;
  },

  indexNote(
    note: ImplementationNote,
    entityId: string,
    entityType: 'task' | 'list',
    projectTag?: string
  ): void {
    this.instance.indexNote(note, entityId, entityType, projectTag);
  },

  removeNoteFromIndex(noteId: string): void {
    this.instance.removeNoteFromIndex(noteId);
  },

  search(
    query: SearchQuery,
    noteContentMap: Map<string, ImplementationNote>
  ): SearchResponse {
    return this.instance.search(query, noteContentMap);
  },

  rebuildIndex(
    notes: Array<ImplementationNote & { entityId: string; entityType: 'task' | 'list'; projectTag?: string }>
  ): void {
    this.instance.rebuildIndex(notes);
  },

  getStats(): IndexStats {
    return this.instance.getStats();
  },

  clearIndex(): void {
    this.instance.clearIndex();
  },

  getSuggestions(partialTerm: string, limit?: number): string[] {
    return this.instance.getSuggestions(partialTerm, limit);
  },
};