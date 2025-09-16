/**
 * Enum Fuzzy Matching Algorithm
 * 
 * Provides fuzzy matching capabilities to suggest the closest valid enum value
 * when agents provide invalid options. Helps agents quickly correct enum validation errors.
 */

import { logger } from './logger.js';

/**
 * Configuration for enum matching
 */
export interface EnumMatchingConfig {
  /** Enable case-insensitive matching */
  caseSensitive: boolean;
  /** Maximum Levenshtein distance for suggestions */
  maxDistance: number;
  /** Enable partial matching */
  enablePartialMatch: boolean;
  /** Enable phonetic matching (future enhancement) */
  enablePhoneticMatch: boolean;
  /** Maximum number of suggestions to return */
  maxSuggestions: number;
}

/**
 * Result of enum matching
 */
export interface EnumMatchResult {
  /** The closest matching enum value */
  match: string | null;
  /** Confidence score (0-1, where 1 is exact match) */
  confidence: number;
  /** Type of match found */
  matchType: 'exact' | 'partial' | 'distance' | 'none';
  /** All possible suggestions ordered by confidence */
  suggestions: EnumSuggestion[];
}

/**
 * Individual enum suggestion
 */
export interface EnumSuggestion {
  /** The suggested enum value */
  value: string;
  /** Confidence score for this suggestion */
  confidence: number;
  /** Type of match */
  matchType: 'exact' | 'partial' | 'distance';
  /** Distance score (lower is better) */
  distance?: number;
}

/**
 * Default configuration for enum matching
 */
const DEFAULT_CONFIG: EnumMatchingConfig = {
  caseSensitive: false,
  maxDistance: 3,
  enablePartialMatch: true,
  enablePhoneticMatch: false, // Future enhancement
  maxSuggestions: 3,
};

/**
 * Enum fuzzy matcher class
 */
export class EnumMatcher {
  private readonly config: EnumMatchingConfig;
  private readonly cache: Map<string, EnumMatchResult> = new Map();

  constructor(config: Partial<EnumMatchingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Find the closest matching enum value
   * 
   * @param input - Input value to match
   * @param validOptions - Array of valid enum values
   * @returns EnumMatchResult with best match and suggestions
   */
  findClosestEnumValue(input: string, validOptions: string[]): EnumMatchResult {
    if (validOptions.length === 0) {
      return {
        match: null,
        confidence: 0,
        matchType: 'none',
        suggestions: [],
      };
    }

    // Create cache key
    const cacheKey = this.createCacheKey(input, validOptions);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = this.performMatching(input, validOptions);
    
    // Cache result for performance
    this.cache.set(cacheKey, result);
    
    // Log matching attempt for debugging
    logger.debug('Enum fuzzy matching performed', {
      input,
      validOptionsCount: validOptions.length,
      matchType: result.matchType,
      confidence: result.confidence,
      match: result.match,
      suggestionsCount: result.suggestions.length,
    });

    return result;
  }

  /**
   * Perform the actual matching logic
   */
  private performMatching(input: string, validOptions: string[]): EnumMatchResult {
    const normalizedInput = this.normalizeString(input);
    
    // Handle empty input
    if (normalizedInput === '') {
      return {
        match: null,
        confidence: 0,
        matchType: 'none',
        suggestions: [],
      };
    }

    const suggestions: EnumSuggestion[] = [];

    // 1. Exact match (highest priority)
    const exactMatch = this.findExactMatch(normalizedInput, validOptions);
    if (exactMatch) {
      return {
        match: exactMatch.value,
        confidence: 1.0,
        matchType: 'exact',
        suggestions: [exactMatch],
      };
    }

    // 2. Partial match
    if (this.config.enablePartialMatch) {
      const partialMatches = this.findPartialMatches(normalizedInput, validOptions);
      suggestions.push(...partialMatches);
    }

    // 3. Distance-based matching (Levenshtein)
    const distanceMatches = this.findDistanceMatches(normalizedInput, validOptions);
    suggestions.push(...distanceMatches);

    // 4. Sort suggestions by confidence and remove duplicates
    const uniqueSuggestions = this.deduplicateAndSort(suggestions);
    let topSuggestions = uniqueSuggestions.slice(0, this.config.maxSuggestions);

    // Return best match, but only if it has reasonable confidence
    const bestMatch = topSuggestions[0];
    let minConfidenceForMatch = 0.2; // Minimum confidence to consider a match
    
    // Special case: if there's only one valid option, lower the threshold but still require some similarity
    if (validOptions.length === 1 && bestMatch) {
      // For single options, accept if distance is reasonable (less than half the length)
      const maxLength = Math.max(normalizedInput.length, validOptions[0]!.length);
      if (bestMatch.distance !== undefined && bestMatch.distance < maxLength / 2) {
        minConfidenceForMatch = 0.01; // Very low threshold for single option with reasonable distance
      }
    }
    
    // If no suggestions found or best match has very low confidence, provide fallback suggestions
    if (topSuggestions.length === 0 && validOptions.length > 0) {
      topSuggestions = validOptions.slice(0, this.config.maxSuggestions).map(option => ({
        value: option,
        confidence: 0.1, // Very low confidence
        matchType: 'distance' as const,
        distance: 999,
      }));
    }
    
    return {
      match: (bestMatch && bestMatch.confidence >= minConfidenceForMatch) ? bestMatch.value : null,
      confidence: bestMatch?.confidence || 0,
      matchType: bestMatch?.matchType || 'none',
      suggestions: topSuggestions,
    };
  }

  /**
   * Find exact matches (case-insensitive if configured)
   */
  private findExactMatch(normalizedInput: string, validOptions: string[]): EnumSuggestion | null {
    for (const option of validOptions) {
      const normalizedOption = this.normalizeString(option);
      
      if (normalizedInput === normalizedOption) {
        return {
          value: option,
          confidence: 1.0,
          matchType: 'exact',
        };
      }
    }
    
    return null;
  }

  /**
   * Find partial matches (substring matching)
   */
  private findPartialMatches(normalizedInput: string, validOptions: string[]): EnumSuggestion[] {
    const matches: EnumSuggestion[] = [];
    
    for (const option of validOptions) {
      const normalizedOption = this.normalizeString(option);
      
      // Check if input is contained in option or vice versa
      const inputInOption = normalizedOption.includes(normalizedInput);
      const optionInInput = normalizedInput.includes(normalizedOption);
      
      if (inputInOption || optionInInput) {
        // Calculate confidence based on overlap
        const overlap = Math.min(normalizedInput.length, normalizedOption.length);
        const maxLength = Math.max(normalizedInput.length, normalizedOption.length);
        const confidence = overlap / maxLength;
        
        matches.push({
          value: option,
          confidence: confidence * 0.8, // Slightly lower than exact match
          matchType: 'partial',
        });
      }
    }
    
    return matches;
  }

  /**
   * Find matches based on Levenshtein distance
   */
  private findDistanceMatches(normalizedInput: string, validOptions: string[]): EnumSuggestion[] {
    const matches: EnumSuggestion[] = [];
    
    for (const option of validOptions) {
      const normalizedOption = this.normalizeString(option);
      const distance = this.levenshteinDistance(normalizedInput, normalizedOption);
      
      // Always consider distance matches, but with reasonable limits
      const maxReasonableDistance = Math.min(this.config.maxDistance, Math.max(normalizedInput.length, normalizedOption.length));
      
      if (distance <= maxReasonableDistance) {
        // Calculate confidence (inverse of distance, normalized)
        const maxPossibleDistance = Math.max(normalizedInput.length, normalizedOption.length);
        const confidence = Math.max(0, (maxPossibleDistance - distance) / maxPossibleDistance) * 0.6;
        
        matches.push({
          value: option,
          confidence,
          matchType: 'distance',
          distance,
        });
      }
    }
    
    return matches;
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    let normalized = str.trim();
    
    if (!this.config.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    
    return normalized;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(0)
    );

    // Initialize first row and column
    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;

    // Fill the matrix
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,     // deletion
          matrix[j - 1]![i]! + 1,     // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Remove duplicates and sort suggestions by confidence
   */
  private deduplicateAndSort(suggestions: EnumSuggestion[]): EnumSuggestion[] {
    const seen = new Set<string>();
    const unique: EnumSuggestion[] = [];
    
    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.value)) {
        seen.add(suggestion.value);
        unique.push(suggestion);
      }
    }
    
    // Sort by confidence (descending), then by match type priority
    return unique.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // If confidence is equal, prioritize by match type
      const typePriority = { exact: 3, partial: 2, distance: 1 };
      return typePriority[b.matchType] - typePriority[a.matchType];
    });
  }

  /**
   * Create cache key for memoization
   */
  private createCacheKey(input: string, validOptions: string[]): string {
    const normalizedInput = this.normalizeString(input);
    const sortedOptions = [...validOptions].sort().join('|');
    return `${normalizedInput}:${sortedOptions}`;
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
      // Hit rate would need to be tracked separately
    };
  }

  /**
   * Find multiple suggestions for an input
   */
  findSuggestions(input: string, validOptions: string[], maxSuggestions?: number): EnumSuggestion[] {
    const result = this.findClosestEnumValue(input, validOptions);
    const limit = maxSuggestions || this.config.maxSuggestions;
    return result.suggestions.slice(0, limit);
  }

  /**
   * Check if input is a reasonable match for any enum value
   */
  hasReasonableMatch(input: string, validOptions: string[], minConfidence = 0.3): boolean {
    const result = this.findClosestEnumValue(input, validOptions);
    return result.confidence >= minConfidence;
  }
}

/**
 * Global enum matcher instance with default configuration
 */
export const enumMatcher = new EnumMatcher();

/**
 * Convenience function to find closest enum match with default settings
 * 
 * @param input - Input value to match
 * @param validOptions - Array of valid enum values
 * @returns The closest matching enum value or null
 */
export function findClosestEnumValue(input: string, validOptions: string[]): string | null {
  const result = enumMatcher.findClosestEnumValue(input, validOptions);
  return result.match;
}

/**
 * Convenience function to get enum suggestions
 * 
 * @param input - Input value to match
 * @param validOptions - Array of valid enum values
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Array of suggestions ordered by confidence
 */
export function getEnumSuggestions(
  input: string, 
  validOptions: string[], 
  maxSuggestions = 3
): string[] {
  const suggestions = enumMatcher.findSuggestions(input, validOptions, maxSuggestions);
  return suggestions.map(s => s.value);
}

/**
 * Create a custom enum matcher with specific configuration
 * 
 * @param config - Custom matching configuration
 * @returns New EnumMatcher instance
 */
export function createEnumMatcher(config: Partial<EnumMatchingConfig>): EnumMatcher {
  return new EnumMatcher(config);
}

/**
 * Common enum patterns for different domains
 */
export const COMMON_ENUM_PATTERNS = {
  status: ['pending', 'in_progress', 'completed', 'cancelled', 'blocked'],
  priority: ['low', 'medium', 'high', 'urgent', 'critical'],
  boolean: ['true', 'false', 'yes', 'no', 'on', 'off', 'enabled', 'disabled'],
  format: ['json', 'xml', 'csv', 'yaml', 'text', 'html'],
  method: ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'],
} as const;