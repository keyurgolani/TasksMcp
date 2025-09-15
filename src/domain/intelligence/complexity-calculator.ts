/**
 * Complexity calculation engine for task analysis
 * 
 * Calculates multi-dimensional complexity scores for tasks using weighted factors:
 * - Technical complexity: Programming concepts, tools, and technologies required
 * - Temporal complexity: Time investment and duration estimates
 * - Dependency complexity: Task interdependencies and ordering requirements
 * - Uncertainty complexity: Unknown factors and ambiguous requirements
 * - Risk complexity: Potential challenges and failure points
 * - Scope complexity: Breadth of impact and system involvement
 * 
 * Produces overall complexity scores (1-10 scale) with confidence ratings and
 * detailed reasoning to guide task breakdown and resource allocation decisions.
 */

import {
  EntityType,
  PatternType,
  type ComplexityScore,
  type ComplexityWeights,
  type DetectedPattern,
  type NLPProcessingResult,
} from '../../shared/types/intelligence.js';

export class ComplexityCalculator {
  private readonly weightsConfig: ComplexityWeights = {
    technical: 0.3,
    temporal: 0.25,
    dependency: 0.2,
    uncertainty: 0.15,
    risk: 0.05,
    scope: 0.05,
  };

  /**
   * Calculate comprehensive complexity score for a task
   * 
   * Analyzes multiple complexity dimensions using NLP results and produces
   * a weighted overall score with detailed factor breakdown. The calculation
   * considers technical requirements, time estimates, dependencies, uncertainty,
   * risks, and scope to provide accurate complexity assessment.
   * 
   * @param input - Analysis input containing text, NLP results, and optional context
   * @param input.text - Original task description text
   * @param input.nlpResult - Processed NLP analysis results
   * @param input.context - Optional contextual information for enhanced analysis
   * @returns ComplexityScore - Comprehensive score with factor breakdown, reasoning, and confidence
   */
  calculate(input: {
    text: string;
    nlpResult: NLPProcessingResult;
    context?: string;
  }): ComplexityScore {
    const { text, nlpResult } = input;

    // Calculate individual complexity factors
    const technical = this.calculateTechnicalComplexity(nlpResult);
    const temporal = this.calculateTemporalComplexity(text, nlpResult);
    const dependency = this.calculateDependencyComplexity(nlpResult);
    const uncertainty = this.calculateUncertaintyComplexity(nlpResult);
    const risk = this.calculateRiskComplexity(nlpResult);
    const scope = this.calculateScopeComplexity(text, nlpResult);

    // Calculate overall complexity score
    const overall = Math.round(
      technical * this.weightsConfig.technical +
        temporal * this.weightsConfig.temporal +
        dependency * this.weightsConfig.dependency +
        uncertainty * this.weightsConfig.uncertainty +
        risk * this.weightsConfig.risk +
        scope * this.weightsConfig.scope
    );

    // Calculate confidence based on pattern strength
    const confidence = this.calculateConfidence(nlpResult.patterns);

    // Generate reasoning
    const reasoning = this.generateReasoning({
      technical,
      temporal,
      dependency,
      uncertainty,
      risk,
      scope,
      overall,
      patterns: nlpResult.patterns,
    });

    // Generate breakdown points
    const breakdown = this.generateBreakdown(nlpResult.patterns, {
      technical,
      temporal,
      dependency,
      uncertainty,
      risk,
      scope,
    });

    return {
      overall: Math.max(1, Math.min(10, overall)),
      factors: {
        technical,
        temporal,
        dependency,
        uncertainty,
        risk,
        scope,
      },
      reasoning,
      confidence,
      breakdown,
    };
  }

  private calculateTechnicalComplexity(nlpResult: NLPProcessingResult): number {
    const technicalPatterns = nlpResult.patterns.filter(
      p => p.type === PatternType.TECHNICAL
    );
    const technicalEntities = nlpResult.entities.filter(
      e => e.type === EntityType.TOOL
    );

    let complexity = 1; // Base complexity

    // Add complexity from technical patterns
    technicalPatterns.forEach(pattern => {
      complexity += pattern.confidence * pattern.weight * 1.5; // Increased multiplier
    });

    // Add complexity from technical entities
    complexity += technicalEntities.length * 1.2; // Increased from 0.5

    // Add complexity from technical keywords density
    const technicalDensity =
      technicalEntities.length / Math.max(1, nlpResult.tokens.length);
    complexity += technicalDensity * 5; // Increased from 3

    // Boost for multiple technical indicators
    if (technicalEntities.length > 3) {
      complexity += 3;
    } else if (technicalEntities.length > 2) {
      complexity += 2;
    } else if (technicalEntities.length > 1) {
      complexity += 1;
    }

    if (technicalPatterns.length > 0) {
      complexity += 2; // Increased from 1.5
    }

    // Additional boost for complex technical terms
    const advancedTechnicalTerms = [
      'microservices',
      'kubernetes',
      'architecture',
      'distributed',
      'authentication',
      'jwt',
      'api gateway',
      'ci/cd',
      'pipeline',
      'monitoring',
    ];
    const advancedTermCount = advancedTechnicalTerms.filter(term =>
      nlpResult.tokens.join(' ').toLowerCase().includes(term)
    ).length;
    complexity += advancedTermCount * 0.8;

    return Math.max(1, Math.min(10, Math.round(complexity)));
  }

  private calculateTemporalComplexity(
    text: string,
    nlpResult: NLPProcessingResult
  ): number {
    const durationEntities = nlpResult.entities.filter(
      e => e.type === EntityType.DURATION
    );
    let complexity = 1;

    // Extract time estimates and convert to hours
    let totalHours = 0;
    durationEntities.forEach(entity => {
      const match = entity.value.match(
        /(\d+)\s*(hour|hours|hr|hrs|day|days|week|weeks|month|months)/i
      );
      if (match?.[1] !== undefined && match[2] !== undefined) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        switch (unit) {
          case 'hour':
          case 'hours':
          case 'hr':
          case 'hrs':
            totalHours += value;
            break;
          case 'day':
          case 'days':
            totalHours += value * 8; // 8-hour work day
            break;
          case 'week':
          case 'weeks':
            totalHours += value * 40; // 40-hour work week
            break;
          case 'month':
          case 'months':
            totalHours += value * 160; // 4 weeks per month
            break;
        }
      }
    });

    // Add complexity based on estimated duration
    if (totalHours > 0) {
      if (totalHours <= 8) complexity = 2;
      else if (totalHours <= 40) complexity = 4;
      else if (totalHours <= 160) complexity = 6;
      else if (totalHours <= 320) complexity = 8;
      else complexity = 10;
    } else {
      // No explicit time estimates - infer from text length and complexity
      const wordCount = nlpResult.tokens.length;
      if (wordCount > 50) complexity += 1;
      if (wordCount > 100) complexity += 2;
      if (wordCount > 200) complexity += 2;
      if (wordCount > 300) complexity += 2;
      if (wordCount > 500) complexity += 2;

      // Check for sequential indicators that suggest multiple phases
      const sequentialIndicators = [
        'first',
        'then',
        'after',
        'finally',
        'next',
        'step',
      ];
      const sequentialCount = sequentialIndicators.filter(indicator =>
        text.toLowerCase().includes(indicator)
      ).length;
      if (sequentialCount >= 3)
        complexity += 3; // Multiple phases = more time
      else if (sequentialCount >= 2) complexity += 2;
      else if (sequentialCount >= 1) complexity += 1;
    }

    // Check for urgency indicators
    const urgencyKeywords = [
      'urgent',
      'asap',
      'immediately',
      'critical',
      'deadline',
    ];
    const hasUrgency = urgencyKeywords.some(keyword => text.includes(keyword));
    if (hasUrgency) complexity += 1;

    return Math.max(1, Math.min(10, Math.round(complexity)));
  }

  private calculateDependencyComplexity(
    nlpResult: NLPProcessingResult
  ): number {
    const dependencyPatterns = nlpResult.patterns.filter(
      p => p.type === PatternType.DEPENDENCY
    );
    const sequentialPatterns = nlpResult.patterns.filter(
      p => p.type === PatternType.SEQUENTIAL
    );

    let complexity = 1;

    // Add complexity from dependency patterns
    dependencyPatterns.forEach(pattern => {
      complexity += pattern.confidence * pattern.weight * 0.5;
    });

    // Add complexity from sequential patterns (implies dependencies)
    sequentialPatterns.forEach(pattern => {
      complexity += pattern.confidence * pattern.weight * 0.3;
    });

    // Estimate number of dependencies from pattern matches
    const totalDependencyIndicators = dependencyPatterns.reduce(
      (sum, pattern) => sum + pattern.matches.length,
      0
    );

    complexity += Math.min(3, totalDependencyIndicators * 0.5);

    return Math.max(1, Math.min(10, Math.round(complexity)));
  }

  private calculateUncertaintyComplexity(
    nlpResult: NLPProcessingResult
  ): number {
    const uncertaintyKeywords = [
      'unknown',
      'uncertain',
      'unclear',
      'ambiguous',
      'tbd',
      'to be determined',
      'investigate',
      'research',
      'explore',
    ];

    let complexity = 1;
    let uncertaintyCount = 0;

    // Count uncertainty indicators
    nlpResult.tokens.forEach(token => {
      if (uncertaintyKeywords.includes(token)) {
        uncertaintyCount++;
      }
    });

    // Add complexity based on uncertainty indicators
    complexity += uncertaintyCount * 0.8;

    // Check for question marks (indicating uncertainty)
    const questionMarks = (nlpResult.tokens.join(' ').match(/\?/g) ?? [])
      .length;
    complexity += questionMarks * 0.5;

    // Low confidence in NLP analysis indicates uncertainty
    const avgConfidence =
      nlpResult.patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) /
      Math.max(1, nlpResult.patterns.length);

    if (avgConfidence < 0.5) complexity += 2;
    else if (avgConfidence < 0.7) complexity += 1;

    return Math.max(1, Math.min(10, Math.round(complexity)));
  }

  private calculateRiskComplexity(nlpResult: NLPProcessingResult): number {
    const riskPatterns = nlpResult.patterns.filter(
      p => p.type === PatternType.RISK
    );
    let complexity = 1;

    // Add complexity from risk patterns
    riskPatterns.forEach(pattern => {
      complexity += pattern.confidence * pattern.weight * 0.4;
    });

    // Check for negative sentiment (indicates potential risks)
    if (nlpResult.sentiment < -0.3) complexity += 2;
    else if (nlpResult.sentiment < 0) complexity += 1;

    return Math.max(1, Math.min(10, Math.round(complexity)));
  }

  private calculateScopeComplexity(
    text: string,
    nlpResult: NLPProcessingResult
  ): number {
    let complexity = 1;

    // Base complexity from text length
    const wordCount = nlpResult.tokens.length;
    if (wordCount > 50) complexity += 1;
    if (wordCount > 150) complexity += 1;
    if (wordCount > 300) complexity += 1;
    if (wordCount > 500) complexity += 2;

    // Add complexity from number of different pattern types
    const patternTypes = new Set(nlpResult.patterns.map(p => p.type));
    complexity += patternTypes.size * 0.3;

    // Add complexity from entity diversity
    const entityTypes = new Set(nlpResult.entities.map(e => e.type));
    complexity += entityTypes.size * 0.2;

    // Check for scope indicators
    const scopeKeywords = [
      'system',
      'platform',
      'architecture',
      'framework',
      'infrastructure',
    ];
    const scopeCount = scopeKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;
    complexity += scopeCount * 0.5;

    return Math.max(1, Math.min(10, Math.round(complexity)));
  }

  private calculateConfidence(patterns: DetectedPattern[]): number {
    if (patterns.length === 0) return 0.3; // Low confidence with no patterns

    // Calculate weighted average confidence
    const totalWeight = patterns.reduce(
      (sum, pattern) => sum + pattern.weight,
      0
    );
    const weightedConfidence =
      patterns.reduce(
        (sum, pattern) => sum + pattern.confidence * pattern.weight,
        0
      ) / totalWeight;

    // Boost confidence with more patterns
    const patternBonus = Math.min(0.2, patterns.length * 0.05);

    return Math.min(1, weightedConfidence + patternBonus);
  }

  private generateReasoning(factors: {
    technical: number;
    temporal: number;
    dependency: number;
    uncertainty: number;
    risk: number;
    scope: number;
    overall: number;
    patterns: DetectedPattern[];
  }): string {
    const reasons: string[] = [];

    if (factors.technical >= 7) {
      reasons.push(
        'High technical complexity due to advanced programming concepts and technologies'
      );
    } else if (factors.technical >= 4) {
      reasons.push(
        'Moderate technical complexity with some programming requirements'
      );
    }

    if (factors.temporal >= 7) {
      reasons.push('Significant time investment required (weeks to months)');
    } else if (factors.temporal >= 4) {
      reasons.push('Moderate time commitment needed (days to weeks)');
    }

    if (factors.dependency >= 6) {
      reasons.push('Complex dependency chain with multiple prerequisites');
    } else if (factors.dependency >= 3) {
      reasons.push('Some task dependencies identified');
    }

    if (factors.uncertainty >= 6) {
      reasons.push(
        'High uncertainty with many unknowns requiring investigation'
      );
    } else if (factors.uncertainty >= 3) {
      reasons.push('Some uncertainty factors present');
    }

    if (factors.risk >= 6) {
      reasons.push('Significant risk factors that could impact success');
    } else if (factors.risk >= 3) {
      reasons.push('Some risk factors identified');
    }

    if (factors.scope >= 7) {
      reasons.push('Large scope affecting multiple systems or components');
    } else if (factors.scope >= 4) {
      reasons.push('Moderate scope with multiple components involved');
    }

    // Add pattern-specific reasoning
    const patternTypes = new Set(factors.patterns.map(p => p.type));
    if (patternTypes.has(PatternType.SEQUENTIAL)) {
      reasons.push(
        'Sequential workflow detected requiring step-by-step execution'
      );
    }
    if (patternTypes.has(PatternType.PARALLEL)) {
      reasons.push(
        'Parallel tasks identified that can be executed concurrently'
      );
    }

    if (reasons.length === 0) {
      reasons.push(
        'Relatively straightforward task with minimal complexity factors'
      );
    }

    return `${reasons.join('. ')}.`;
  }

  private generateBreakdown(
    patterns: DetectedPattern[],
    factors: {
      technical: number;
      temporal: number;
      dependency: number;
      uncertainty: number;
      risk: number;
      scope: number;
    }
  ): string[] {
    const breakdown: string[] = [];

    if (factors.technical >= 5) {
      breakdown.push(
        `Technical complexity: ${factors.technical}/10 - Requires programming expertise`
      );
    }

    if (factors.temporal >= 5) {
      breakdown.push(
        `Time complexity: ${factors.temporal}/10 - Significant time investment needed`
      );
    }

    if (factors.dependency >= 4) {
      breakdown.push(
        `Dependency complexity: ${factors.dependency}/10 - Multiple task dependencies`
      );
    }

    if (factors.uncertainty >= 4) {
      breakdown.push(
        `Uncertainty: ${factors.uncertainty}/10 - Contains unknown factors`
      );
    }

    if (factors.risk >= 4) {
      breakdown.push(
        `Risk level: ${factors.risk}/10 - Potential challenges identified`
      );
    }

    if (factors.scope >= 5) {
      breakdown.push(
        `Scope: ${factors.scope}/10 - Affects multiple components`
      );
    }

    // Add pattern-specific breakdown
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.6) {
        switch (pattern.type) {
          case PatternType.SEQUENTIAL:
            breakdown.push('Sequential execution pattern detected');
            break;
          case PatternType.PARALLEL:
            breakdown.push('Parallel execution opportunities identified');
            break;
          case PatternType.DEPENDENCY:
            breakdown.push('Task dependencies require careful ordering');
            break;
          case PatternType.RISK:
            breakdown.push('Risk factors may require mitigation strategies');
            break;
        }
      }
    });

    return breakdown;
  }
}
