/**
 * Intelligence and complexity analysis types
 */

export interface ComplexityScore {
  overall: number; // Overall complexity (1-10)
  factors: {
    technical: number; // Technical complexity
    temporal: number; // Time-based complexity
    dependency: number; // Dependency complexity
    uncertainty: number; // Uncertainty factors
    risk: number; // Risk assessment
    scope: number; // Scope complexity
  };
  reasoning: string; // Human-readable explanation
  confidence: number; // Confidence in analysis (0-1)
  breakdown: string[]; // Detailed breakdown points
}

export interface ComplexityAnalysis {
  isComplex: boolean;
  confidence: number; // 0-1 confidence score
  suggestedTasks: string[]; // Suggested breakdown
  estimatedDuration: number; // Total estimated minutes
  reasoning: string; // Why it's considered complex/simple
  complexity: ComplexityScore;
  patterns: DetectedPattern[];
}

export interface DetectedPattern {
  type: PatternType;
  confidence: number;
  matches: string[];
  weight: number;
}

export enum PatternType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  DEPENDENCY = 'dependency',
  RISK = 'risk',
  TECHNICAL = 'technical',
  TEMPORAL = 'temporal',
  SCOPE = 'scope',
  UNCERTAINTY = 'uncertainty',
}

export interface ComplexityWeights {
  technical: number;
  temporal: number;
  dependency: number;
  uncertainty: number;
  risk: number;
  scope: number;
}

export interface NLPProcessingResult {
  tokens: string[];
  entities: ExtractedEntity[];
  patterns: DetectedPattern[];
  sentiment: number; // -1 to 1
  complexity: number; // 0 to 1
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

export enum EntityType {
  TASK = 'task',
  DURATION = 'duration',
  DEPENDENCY = 'dependency',
  RESOURCE = 'resource',
  PERSON = 'person',
  TOOL = 'tool',
  DEADLINE = 'deadline',
}

export interface TaskGenerationOptions {
  style: 'detailed' | 'concise' | 'technical' | 'business';
  maxTasks: number;
  includeTests: boolean;
  includeDependencies: boolean;
}

export interface AnalyzeTaskComplexityParams {
  taskDescription: string;
  context?: string;
  autoCreate?: boolean;
  generateOptions?: TaskGenerationOptions;
}
