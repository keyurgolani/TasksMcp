/**
 * Task generation engine for breaking down complex descriptions
 */

import {
  EntityType,
  PatternType,
  type ComplexityScore,
  type DetectedPattern,
  type TaskGenerationOptions,
  type NLPProcessingResult,
} from '../types/intelligence.js';

export class TaskGenerator {
  generateTasks(input: {
    description: string;
    complexity: ComplexityScore;
    nlpResult: NLPProcessingResult;
    options?: TaskGenerationOptions;
  }): string[] {
    const { description, complexity, nlpResult, options } = input;
    const tasks: string[] = [];

    const opts: TaskGenerationOptions = {
      style: options?.style ?? 'detailed',
      maxTasks: options?.maxTasks ?? 10,
      includeTests: options?.includeTests ?? true,
      includeDependencies: options?.includeDependencies ?? true,
      ...options,
    };

    // Generate tasks based on complexity and patterns
    if (complexity.overall >= 7) {
      tasks.push(
        ...this.generateHighComplexityTasks(description, nlpResult, opts)
      );
    } else if (complexity.overall >= 4) {
      tasks.push(
        ...this.generateMediumComplexityTasks(description, nlpResult, opts)
      );
    } else {
      tasks.push(
        ...this.generateLowComplexityTasks(description, nlpResult, opts)
      );
    }

    // Add pattern-specific tasks
    tasks.push(...this.generatePatternBasedTasks(nlpResult.patterns, opts));

    // Add testing tasks if requested
    if (opts.includeTests && complexity.overall >= 3) {
      tasks.push(...this.generateTestingTasks(complexity, opts));
    }

    // Limit to max tasks and return
    return tasks.slice(0, opts.maxTasks);
  }

  private generateHighComplexityTasks(
    _description: string,
    nlpResult: NLPProcessingResult,
    options: TaskGenerationOptions
  ): string[] {
    const tasks: string[] = [];

    // Start with research and planning
    if (this.hasUncertainty(nlpResult)) {
      tasks.push('Research and analyze requirements');
      tasks.push('Create detailed technical specification');
    }

    // Add architecture tasks for technical projects
    if (this.hasTechnicalContent(nlpResult)) {
      tasks.push('Design system architecture');
      tasks.push('Create data models and interfaces');
    }

    // Add implementation phases
    tasks.push('Implement core functionality (Phase 1)');
    tasks.push('Add advanced features (Phase 2)');
    tasks.push('Integrate with external systems');

    // Add quality assurance
    if (options.includeTests) {
      tasks.push('Perform comprehensive testing');
    }
    tasks.push('Conduct security review');
    tasks.push('Optimize performance');

    // Add deployment and monitoring
    tasks.push('Deploy to production environment');
    tasks.push('Set up monitoring and alerting');

    return this.styleTasksForOptions(tasks, options);
  }

  private generateMediumComplexityTasks(
    _description: string,
    nlpResult: NLPProcessingResult,
    options: TaskGenerationOptions
  ): string[] {
    const tasks: string[] = [];

    // Planning phase
    tasks.push('Define requirements and scope');

    // Implementation phase
    if (this.hasTechnicalContent(nlpResult)) {
      tasks.push('Set up development environment');
      tasks.push('Implement core functionality');
      tasks.push('Add error handling and validation');
    } else {
      tasks.push('Execute main task components');
      tasks.push('Handle edge cases and exceptions');
    }

    // Validation phase
    if (options.includeTests) {
      tasks.push('Test functionality thoroughly');
    }
    tasks.push('Review and refine implementation');

    // Completion phase
    tasks.push('Document results and process');

    return this.styleTasksForOptions(tasks, options);
  }

  private generateLowComplexityTasks(
    _description: string,
    nlpResult: NLPProcessingResult,
    options: TaskGenerationOptions
  ): string[] {
    const tasks: string[] = [];

    // Simple task breakdown
    if (this.hasTechnicalContent(nlpResult)) {
      tasks.push('Implement the required functionality');
      if (options.includeTests) {
        tasks.push('Test the implementation');
      }
      tasks.push('Document the solution');
    } else {
      tasks.push('Complete the main task');
      tasks.push('Verify the results');
    }

    return this.styleTasksForOptions(tasks, options);
  }

  private generatePatternBasedTasks(
    patterns: DetectedPattern[],
    options: TaskGenerationOptions
  ): string[] {
    const tasks: string[] = [];

    patterns.forEach(pattern => {
      if (pattern.confidence < 0.6) return; // Skip low-confidence patterns

      switch (pattern.type) {
        case PatternType.SEQUENTIAL:
          if (pattern.matches.length > 1) {
            pattern.matches.forEach((match, index) => {
              tasks.push(
                `Step ${index + 1}: ${this.extractActionFromMatch(match)}`
              );
            });
          }
          break;

        case PatternType.DEPENDENCY:
          tasks.push('Identify and resolve task dependencies');
          tasks.push('Execute tasks in correct dependency order');
          break;

        case PatternType.RISK:
          tasks.push('Identify and assess potential risks');
          tasks.push('Develop risk mitigation strategies');
          break;

        case PatternType.PARALLEL:
          tasks.push('Identify tasks that can be executed in parallel');
          tasks.push('Coordinate parallel task execution');
          break;

        case PatternType.TECHNICAL:
          tasks.push('Set up technical infrastructure');
          tasks.push('Implement technical requirements');
          break;
      }
    });

    return this.styleTasksForOptions(tasks, options);
  }

  private generateTestingTasks(
    complexity: ComplexityScore,
    options: TaskGenerationOptions
  ): string[] {
    const tasks: string[] = [];

    if (complexity.factors.technical >= 5) {
      tasks.push('Write unit tests for core functionality');
      tasks.push('Create integration tests');
    }

    if (complexity.factors.risk >= 4) {
      tasks.push('Perform risk-based testing');
      tasks.push('Test error handling scenarios');
    }

    if (complexity.overall >= 7) {
      tasks.push('Conduct end-to-end testing');
      tasks.push('Perform load and performance testing');
    }

    return this.styleTasksForOptions(tasks, options);
  }

  private styleTasksForOptions(
    tasks: string[],
    options: TaskGenerationOptions
  ): string[] {
    switch (options.style) {
      case 'concise':
        return tasks.map(task => this.makeConcise(task));

      case 'technical':
        return tasks.map(task => this.makeTechnical(task));

      case 'business':
        return tasks.map(task => this.makeBusiness(task));

      case 'detailed':
      default:
        return tasks.map(task => this.makeDetailed(task));
    }
  }

  private makeConcise(task: string): string {
    return task
      .replace(/Create detailed /g, 'Create ')
      .replace(/Implement comprehensive /g, 'Implement ')
      .replace(/Perform thorough /g, 'Perform ')
      .replace(/comprehensive/g, '')
      .replace(/detailed/g, '')
      .trim();
  }

  private makeTechnical(task: string): string {
    const technicalMappings: Record<string, string> = {
      Implement: 'Code and implement',
      Create: 'Develop and create',
      Test: 'Execute automated tests for',
      Deploy: 'Deploy using CI/CD pipeline',
      'Set up': 'Configure and provision',
    };

    let result = task;
    Object.entries(technicalMappings).forEach(([key, value]) => {
      result = result.replace(new RegExp(`^${key}`, 'i'), value);
    });

    return result;
  }

  private makeBusiness(task: string): string {
    const businessMappings: Record<string, string> = {
      Implement: 'Deliver',
      Code: 'Develop',
      Deploy: 'Release',
      Test: 'Validate',
      Debug: 'Troubleshoot',
    };

    let result = task;
    Object.entries(businessMappings).forEach(([key, value]) => {
      result = result.replace(new RegExp(key, 'gi'), value);
    });

    return result;
  }

  private makeDetailed(task: string): string {
    // Add more context and detail to tasks
    if (task.includes('Implement') && !task.includes('detailed')) {
      return task.replace('Implement', 'Implement with detailed planning');
    }
    if (task.includes('Test') && !task.includes('comprehensive')) {
      return task.replace('Test', 'Comprehensively test');
    }
    return task;
  }

  private extractActionFromMatch(match: string): string {
    // Extract the main action from a pattern match
    const actionWords = [
      'implement',
      'create',
      'build',
      'develop',
      'test',
      'deploy',
      'configure',
    ];
    const words = match.toLowerCase().split(/\s+/);

    const actionWord = words.find(word => actionWords.includes(word));
    if (actionWord !== undefined) {
      const actionIndex = words.indexOf(actionWord);
      const context = words.slice(actionIndex, actionIndex + 3).join(' ');
      return context.charAt(0).toUpperCase() + context.slice(1);
    }

    // Fallback: return first few words
    return words.slice(0, 4).join(' ');
  }

  private hasTechnicalContent(nlpResult: NLPProcessingResult): boolean {
    return (
      nlpResult.patterns.some(p => p.type === PatternType.TECHNICAL) ||
      nlpResult.entities.some(e => e.type === EntityType.TOOL)
    );
  }

  private hasUncertainty(nlpResult: NLPProcessingResult): boolean {
    return (
      nlpResult.patterns.some(p => p.type === PatternType.UNCERTAINTY) ||
      nlpResult.complexity > 0.7
    );
  }
}
