/**
 * Natural Language Processing for task analysis
 * 
 * Provides comprehensive text analysis capabilities for the MCP Task Manager including:
 * - Text tokenization and normalization for consistent processing
 * - Entity extraction (durations, technical terms, action verbs)
 * - Pattern detection (sequential, parallel, dependency, risk, technical)
 * - Sentiment analysis for task complexity assessment
 * - Text complexity calculation based on linguistic features
 * 
 * The processor uses rule-based approaches optimized for task management contexts,
 * focusing on identifying complexity indicators and structural patterns that
 * inform task breakdown and difficulty assessment.
 */

import {
  EntityType,
  PatternType,
  type NLPProcessingResult,
  type ExtractedEntity,
  type DetectedPattern,
} from '../../shared/types/intelligence.js';

export class NLPProcessor {
  private readonly technicalKeywords = [
    'api',
    'database',
    'algorithm',
    'architecture',
    'framework',
    'implement',
    'develop',
    'build',
    'create',
    'code',
    'react',
    'node',
    'python',
    'kubernetes',
    'typescript',
    'javascript',
    'sql',
    'mongodb',
    'redis',
    'authentication',
    'authorization',
    'security',
    'encryption',
    'performance',
    'optimization',
    'scalability',
    'testing',
    'deployment',
    'ci/cd',
    'pipeline',
    'monitoring',
    'logging',
  ];

  /**
   * Process text and extract comprehensive linguistic features
   * 
   * Performs complete NLP analysis pipeline including text normalization,
   * tokenization, entity extraction, pattern detection, and complexity assessment.
   * Results are used by complexity calculator and task generator for intelligent
   * task breakdown and difficulty estimation.
   * 
   * @param text - Raw text to analyze (task descriptions, requirements, etc.)
   * @returns NLPProcessingResult - Comprehensive analysis including tokens, entities, patterns, sentiment, and complexity
   */
  process(text: string): NLPProcessingResult {
    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenize(normalizedText);
    const entities = this.extractEntities(normalizedText, tokens);
    const patterns = this.detectPatterns(normalizedText);
    const sentiment = this.analyzeSentiment(normalizedText);
    const complexity = this.calculateTextComplexity(normalizedText, patterns);

    return {
      tokens,
      entities,
      patterns,
      sentiment,
      complexity,
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\-.,;:!?()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(token => token.length > 0)
      .map(token => token.replace(/[.,;:!?()]/g, ''));
  }

  private extractEntities(text: string, tokens: string[]): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract duration entities
    const durationRegex =
      /(\d+)\s*(hour|hours|hr|hrs|day|days|week|weeks|month|months)/gi;
    let match;
    while ((match = durationRegex.exec(text)) !== null) {
      entities.push({
        type: 'duration' as EntityType,
        value: match[0],
        confidence: 0.9,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    // Extract technical entities
    tokens.forEach((token, index) => {
      if (this.technicalKeywords.includes(token)) {
        entities.push({
          type: 'tool' as EntityType,
          value: token,
          confidence: 0.8,
          position: {
            start: index,
            end: index + token.length,
          },
        });
      }
    });

    // Extract task entities (action verbs)
    const taskVerbs = [
      'implement',
      'create',
      'build',
      'develop',
      'design',
      'test',
      'deploy',
    ];
    tokens.forEach((token, index) => {
      if (taskVerbs.includes(token)) {
        entities.push({
          type: 'task' as EntityType,
          value: token,
          confidence: 0.7,
          position: {
            start: index,
            end: index + token.length,
          },
        });
      }
    });

    return entities;
  }

  private detectPatterns(text: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Sequential patterns
    const sequentialPatterns = [
      /\b(first|initially|start by|begin with)\b.*?\b(then|next|after|subsequently)\b/gi,
      /\b(step \d+|phase \d+|\d+\.\s|\d+\))\s/gi,
      /\b(before|after|following|preceding)\b.*?\b(we|you|should|must|need to)\b/gi,
    ];

    sequentialPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        patterns.push({
          type: PatternType.SEQUENTIAL,
          confidence: Math.min(0.9, 0.6 + matches.length * 0.2),
          matches: matches.map(m => m[0]),
          weight: 2.0,
        });
      }
    });

    // Parallel patterns
    const parallelPatterns = [
      /\b(simultaneously|concurrently|in parallel|at the same time|meanwhile)\b/gi,
      /\b(while|during|as)\b.*?\b(also|additionally|furthermore)\b/gi,
    ];

    parallelPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        patterns.push({
          type: PatternType.PARALLEL,
          confidence: Math.min(0.8, 0.6 + matches.length * 0.2),
          matches: matches.map(m => m[0]),
          weight: 1.5,
        });
      }
    });

    // Dependency patterns
    const dependencyPatterns = [
      /\b(depends on|requires|needs|must have|prerequisite|blocked by)\b/gi,
      /\b(once|after|when|if)\b.*?\b(complete|finished|done|ready)\b/gi,
      /\bcannot.*?until\b/gi,
    ];

    dependencyPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        patterns.push({
          type: PatternType.DEPENDENCY,
          confidence: Math.min(0.9, 0.7 + matches.length * 0.15),
          matches: matches.map(m => m[0]),
          weight: 2.5,
        });
      }
    });

    // Risk patterns
    const riskPatterns = [
      /\b(risk|risky|dangerous|critical|failure|error|bug|issue)\b/gi,
      /\b(challenging|difficult|hard|tough|problematic)\b/gi,
      /\b(unknown|uncertain|unclear|ambiguous|tbd|to be determined)\b/gi,
    ];

    riskPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        patterns.push({
          type: PatternType.RISK,
          confidence: Math.min(0.8, 0.6 + matches.length * 0.2),
          matches: matches.map(m => m[0]),
          weight: 2.2,
        });
      }
    });

    // Technical patterns
    const technicalCount = this.technicalKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;

    if (technicalCount > 0) {
      patterns.push({
        type: PatternType.TECHNICAL,
        confidence: Math.min(0.9, technicalCount * 0.1),
        matches: this.technicalKeywords.filter(keyword =>
          text.includes(keyword)
        ),
        weight: 1.8,
      });
    }

    return patterns;
  }

  private analyzeSentiment(text: string): number {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'easy',
      'simple',
      'straightforward',
    ];
    const negativeWords = [
      'bad',
      'difficult',
      'hard',
      'complex',
      'challenging',
      'problematic',
    ];

    const positiveCount = positiveWords.filter(word =>
      text.includes(word)
    ).length;
    const negativeCount = negativeWords.filter(word =>
      text.includes(word)
    ).length;

    const total = positiveCount + negativeCount;
    if (total === 0) return 0;

    return (positiveCount - negativeCount) / total;
  }

  private calculateTextComplexity(
    text: string,
    patterns: DetectedPattern[]
  ): number {
    let complexity = 0;

    // Base complexity from text length
    complexity += Math.min(0.3, text.length / 1000);

    // Add complexity from patterns
    patterns.forEach(pattern => {
      complexity += pattern.confidence * pattern.weight * 0.1;
    });

    // Add complexity from technical terms
    const technicalCount = this.technicalKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;
    complexity += Math.min(0.4, technicalCount * 0.05);

    return Math.min(1, complexity);
  }
}
