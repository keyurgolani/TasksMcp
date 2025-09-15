/**
 * Intelligence Manager - Coordinates complexity analysis and task generation
 * 
 * This manager orchestrates AI-powered task analysis by combining:
 * - Natural Language Processing for text understanding
 * - Complexity calculation for difficulty assessment
 * - Task generation for breaking down complex tasks
 */

import { NLPProcessor } from './nlp-processor.js';
import { ComplexityCalculator } from './complexity-calculator.js';
import { TaskGenerator } from './task-generator.js';
import { logger } from '../../shared/utils/logger.js';

import type {
  ComplexityAnalysis,
  AnalyzeTaskComplexityParams,
  TaskGenerationOptions,
  ComplexityScore,
  DetectedPattern,
} from '../../shared/types/intelligence.js';
import type { TodoList } from '../../shared/types/todo.js';

/**
 * Central coordinator for AI-powered task intelligence features
 * Manages complexity analysis, task generation, and duration estimation
 */
export class IntelligenceManager {
  private readonly nlpProcessor: NLPProcessor;
  private readonly complexityCalculator: ComplexityCalculator;
  private readonly taskGenerator: TaskGenerator;

  /**
   * Initializes the intelligence manager with all required AI components
   */
  constructor() {
    this.nlpProcessor = new NLPProcessor();
    this.complexityCalculator = new ComplexityCalculator();
    this.taskGenerator = new TaskGenerator();
  }

  /**
   * Analyzes task complexity using NLP processing and complexity calculation
   * Generates suggested subtasks for complex tasks and provides duration estimates
   * 
   * @param params - Analysis parameters including task description and options
   * @returns ComplexityAnalysis - Comprehensive analysis with suggestions and reasoning
   */
  analyzeComplexity(params: AnalyzeTaskComplexityParams): ComplexityAnalysis {
    const startTime = Date.now();

    try {
      logger.info('Starting task complexity analysis', {
        taskLength: params.taskDescription.length,
        context: params.context,
      });

      // Process the text with NLP
      const nlpResult = this.nlpProcessor.process(params.taskDescription);

      logger.debug('NLP processing completed', {
        tokensCount: nlpResult.tokens.length,
        entitiesCount: nlpResult.entities.length,
        patternsCount: nlpResult.patterns.length,
        sentiment: nlpResult.sentiment,
        textComplexity: nlpResult.complexity,
      });

      // Calculate complexity score
      const complexity = this.complexityCalculator.calculate({
        text: params.taskDescription,
        nlpResult,
        ...(params.context !== undefined &&
          params.context.length > 0 && { context: params.context }),
      });

      logger.debug('Complexity calculation completed', {
        overallScore: complexity.overall,
        confidence: complexity.confidence,
        factors: complexity.factors,
      });

      // Determine if task is complex
      const isComplex = complexity.overall >= 6 || complexity.confidence >= 0.7;

      // Generate suggested tasks if complex or requested
      let suggestedTasks: string[] = [];
      if (isComplex || params.autoCreate === true) {
        const generationOptions: TaskGenerationOptions = {
          style: params.generateOptions?.style ?? 'detailed',
          maxTasks: params.generateOptions?.maxTasks ?? 8,
          includeTests: params.generateOptions?.includeTests ?? true,
          includeDependencies:
            params.generateOptions?.includeDependencies ?? true,
        };

        suggestedTasks = this.taskGenerator.generateTasks({
          description: params.taskDescription,
          complexity,
          nlpResult,
          options: generationOptions,
        });

        logger.debug('Task generation completed', {
          suggestedTasksCount: suggestedTasks.length,
          generationOptions,
        });
      }

      // Estimate total duration
      const estimatedDuration = this.estimateDuration(
        params.taskDescription,
        complexity,
        suggestedTasks.length
      );

      // Generate reasoning
      const reasoning = this.generateAnalysisReasoning(
        complexity,
        nlpResult.patterns,
        isComplex
      );

      const analysis: ComplexityAnalysis = {
        isComplex,
        confidence: complexity.confidence,
        suggestedTasks,
        estimatedDuration,
        reasoning,
        complexity,
        patterns: nlpResult.patterns,
      };

      const duration = Date.now() - startTime;
      logger.info('Task complexity analysis completed', {
        duration,
        isComplex,
        overallComplexity: complexity.overall,
        confidence: complexity.confidence,
        suggestedTasksCount: suggestedTasks.length,
      });

      return analysis;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Task complexity analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        taskDescription: params.taskDescription.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Creates a partial todo list structure from complexity analysis results
   * Used by TodoListManager to generate lists with AI-suggested tasks
   * 
   * @param analysis - The complexity analysis containing suggested tasks
   * @param title - Title for the new todo list
   * @param context - Optional context/project tag for the list
   * @returns Partial<TodoList> - List structure ready for completion by TodoListManager
   */
  createTodoListFromAnalysis(
    analysis: ComplexityAnalysis,
    title: string,
    context?: string
  ): Partial<TodoList> {
    logger.info('Creating todo list from complexity analysis', {
      title,
      context,
      suggestedTasksCount: analysis.suggestedTasks.length,
    });

    // Note: todoItems would be used by TodoListManager to create actual items
    // This is just the structure for the partial TodoList

    return {
      title,
      description: `Auto-generated from task analysis. ${analysis.reasoning}`,
      context: context ?? 'ai-generated',
      metadata: {
        generatedFromAnalysis: true,
        originalComplexity: analysis.complexity.overall,
        analysisConfidence: analysis.confidence,
        generationTimestamp: new Date().toISOString(),
        patterns: analysis.patterns.map(p => p.type),
      },
      // Items will be added by the TodoListManager
    };
  }

  /**
   * Estimates task duration based on complexity factors and task breakdown
   * 
   * Uses a multi-factor heuristic approach combining:
   * - Base duration (1 hour minimum for any task)
   * - Complexity factor multipliers (technical, temporal, dependency, etc.)
   * - Task breakdown count (more subtasks = more coordination overhead)
   * - Text length analysis (longer descriptions suggest larger scope)
   * 
   * @param description - Original task description
   * @param complexity - Calculated complexity scores (0-10 scale)
   * @param taskCount - Number of suggested subtasks
   * @returns number - Estimated duration in minutes
   */
  private estimateDuration(
    description: string,
    complexity: ComplexityScore,
    taskCount: number
  ): number {
    // Start with base duration (1 hour minimum for any meaningful task)
    let duration = 60;

    // Add duration based on complexity factors (each factor weighted differently)
    duration += complexity.factors.technical * 30;    // Technical complexity: 30 min per point
    duration += complexity.factors.temporal * 45;     // Time constraints: 45 min per point
    duration += complexity.factors.dependency * 20;   // Dependencies: 20 min per point
    duration += complexity.factors.uncertainty * 60;  // Uncertainty: 60 min per point (highest impact)
    duration += complexity.factors.risk * 40;         // Risk factors: 40 min per point
    duration += complexity.factors.scope * 35;        // Scope complexity: 35 min per point

    // Add coordination overhead for task breakdown (30 min per subtask)
    duration += taskCount * 30;

    // Add duration based on description length (proxy for scope)
    const wordCount = description.split(/\s+/).length;
    const scopeAdjustment = Math.min(240, wordCount * 2); // Cap at 4 hours for scope
    duration += scopeAdjustment;

    return Math.round(duration);
  }

  /**
   * Generates human-readable reasoning for the complexity analysis
   * Explains why a task is considered complex or simple based on detected patterns
   * 
   * @param complexity - The calculated complexity scores
   * @param patterns - Detected complexity patterns in the text
   * @param isComplex - Whether the task is classified as complex
   * @returns string - Human-readable explanation of the analysis
   */
  private generateAnalysisReasoning(
    complexity: ComplexityScore,
    patterns: DetectedPattern[],
    isComplex: boolean
  ): string {
    const reasons: string[] = [];

    if (isComplex) {
      reasons.push(
        `Task is considered complex (score: ${complexity.overall}/10)`
      );

      if (complexity.confidence >= 0.8) {
        reasons.push('High confidence in complexity assessment');
      } else if (complexity.confidence >= 0.6) {
        reasons.push('Moderate confidence in complexity assessment');
      } else {
        reasons.push('Lower confidence - may need human review');
      }

      // Add the main reasoning from complexity calculation
      reasons.push(complexity.reasoning);

      if (patterns.length > 0) {
        reasons.push(`Detected ${patterns.length} complexity patterns`);
      }
    } else {
      reasons.push(
        `Task appears straightforward (score: ${complexity.overall}/10)`
      );
      reasons.push('Can likely be completed as a single task');
    }

    return `${reasons.join('. ')}.`;
  }
}