/**
 * Advanced heap dump analysis and memory leak detection
 */

import { promises as fs } from 'fs';
// import { join } from 'path'; // Reserved for future use
import { logger } from '../../shared/utils/logger.js';

export interface HeapAnalysisResult {
  timestamp: number;
  dumpPath: string;
  totalSize: number;
  objectCount: number;
  nodeCount: number;
  edgeCount: number;
  topRetainers: Array<{
    type: string;
    name: string;
    retainedSize: number;
    count: number;
  }>;
  leakSuspects: Array<{
    type: string;
    name: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    retainedSize: number;
    instances: number;
  }>;
  recommendations: string[];
  memoryDistribution: {
    strings: number;
    arrays: number;
    objects: number;
    functions: number;
    other: number;
  };
}

export interface MemoryLeakPattern {
  pattern: string;
  description: string;
  detector: (analysis: HeapAnalysisResult) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class HeapAnalyzer {
  private leakPatterns: MemoryLeakPattern[] = [];
  private analysisHistory: HeapAnalysisResult[] = [];
  private readonly maxHistorySize = 50;

  constructor() {
    this.setupLeakPatterns();
  }

  /**
   * Analyze heap dump and detect memory leaks
   */
  async analyzeHeapDump(dumpPath: string): Promise<HeapAnalysisResult> {
    try {
      logger.info('Starting heap dump analysis', { dumpPath });

      // Basic file analysis
      const stats = await fs.stat(dumpPath);
      const dumpSize = stats.size;

      // Parse heap snapshot (simplified - in production use proper V8 heap snapshot parser)
      const analysis = await this.parseHeapSnapshot(dumpPath, dumpSize);

      // Detect leak patterns
      const leakSuspects = this.detectLeakPatterns(analysis);
      analysis.leakSuspects = leakSuspects;

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Store in history
      this.analysisHistory.push(analysis);
      if (this.analysisHistory.length > this.maxHistorySize) {
        this.analysisHistory = this.analysisHistory.slice(-this.maxHistorySize);
      }

      logger.info('Heap dump analysis completed', {
        dumpPath,
        totalSize: analysis.totalSize,
        objectCount: analysis.objectCount,
        leakSuspectsCount: analysis.leakSuspects.length,
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze heap dump', { dumpPath, error });
      throw error;
    }
  }

  /**
   * Compare two heap analyses to detect memory growth patterns
   */
  compareAnalyses(
    baseline: HeapAnalysisResult,
    current: HeapAnalysisResult
  ): {
    memoryGrowth: number;
    objectGrowth: number;
    newLeakSuspects: Array<HeapAnalysisResult['leakSuspects'][0]>;
    growthPatterns: Array<{
      type: string;
      growth: number;
      isSignificant: boolean;
    }>;
  } {
    const memoryGrowth = current.totalSize - baseline.totalSize;
    const objectGrowth = current.objectCount - baseline.objectCount;

    // Find new leak suspects
    const baselineTypes = new Set(
      baseline.leakSuspects.map(s => `${s.type}:${s.name}`)
    );
    const newLeakSuspects = current.leakSuspects.filter(
      s => !baselineTypes.has(`${s.type}:${s.name}`)
    );

    // Analyze growth patterns
    const growthPatterns = [];

    // Compare memory distribution
    for (const [key, currentValue] of Object.entries(
      current.memoryDistribution
    )) {
      const baselineValue = (baseline.memoryDistribution as any)[key] || 0;
      const growth = currentValue - baselineValue;
      const growthPercentage =
        baselineValue > 0 ? (growth / baselineValue) * 100 : 0;

      growthPatterns.push({
        type: key,
        growth,
        isSignificant:
          Math.abs(growthPercentage) > 50 || Math.abs(growth) > 1024 * 1024, // 50% or 1MB
      });
    }

    return {
      memoryGrowth,
      objectGrowth,
      newLeakSuspects,
      growthPatterns,
    };
  }

  /**
   * Get analysis history for trend detection
   */
  getAnalysisHistory(): HeapAnalysisResult[] {
    return [...this.analysisHistory];
  }

  /**
   * Detect memory leak trends over time
   */
  detectMemoryLeakTrends(): {
    isLeaking: boolean;
    confidence: number;
    trendDescription: string;
    criticalSuspects: Array<HeapAnalysisResult['leakSuspects'][0]>;
  } {
    if (this.analysisHistory.length < 3) {
      return {
        isLeaking: false,
        confidence: 0,
        trendDescription: 'Insufficient data for trend analysis',
        criticalSuspects: [],
      };
    }

    const recent = this.analysisHistory.slice(-5); // Last 5 analyses
    let totalGrowth = 0;
    let consistentGrowth = 0;
    const criticalSuspects = new Map<
      string,
      HeapAnalysisResult['leakSuspects'][0]
    >();

    // Analyze growth between consecutive analyses
    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i]!.totalSize - recent[i - 1]!.totalSize;
      totalGrowth += growth;

      if (growth > 0) {
        consistentGrowth++;
      }

      // Collect critical suspects
      recent[i]!.leakSuspects.filter(
        s => s.severity === 'critical' || s.severity === 'high'
      ).forEach(suspect => {
        const key = `${suspect.type}:${suspect.name}`;
        if (
          !criticalSuspects.has(key) ||
          criticalSuspects.get(key)!.retainedSize < suspect.retainedSize
        ) {
          criticalSuspects.set(key, suspect);
        }
      });
    }

    const growthConsistency = consistentGrowth / (recent.length - 1);
    const averageGrowth = totalGrowth / (recent.length - 1);

    const isLeaking = growthConsistency > 0.6 && averageGrowth > 1024 * 1024; // 60% consistency and 1MB average growth
    const confidence = Math.min(growthConsistency * (recent.length / 5), 1);

    let trendDescription = '';
    if (isLeaking) {
      trendDescription = `Consistent memory growth detected: ${(averageGrowth / 1024 / 1024).toFixed(2)}MB average growth per analysis`;
    } else if (averageGrowth > 0) {
      trendDescription = `Some memory growth detected but not consistent enough to indicate a leak`;
    } else {
      trendDescription = `Memory usage appears stable or decreasing`;
    }

    return {
      isLeaking,
      confidence,
      trendDescription,
      criticalSuspects: Array.from(criticalSuspects.values()),
    };
  }

  /**
   * Generate heap dump analysis report
   */
  generateAnalysisReport(analysis: HeapAnalysisResult): string {
    const report = [];

    report.push('# Heap Dump Analysis Report');
    report.push(`Generated: ${new Date(analysis.timestamp).toISOString()}`);
    report.push(`Dump File: ${analysis.dumpPath}`);
    report.push('');

    report.push('## Memory Overview');
    report.push(
      `Total Size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`
    );
    report.push(`Object Count: ${analysis.objectCount.toLocaleString()}`);
    report.push(`Node Count: ${analysis.nodeCount.toLocaleString()}`);
    report.push(`Edge Count: ${analysis.edgeCount.toLocaleString()}`);
    report.push('');

    report.push('## Memory Distribution');
    for (const [type, size] of Object.entries(analysis.memoryDistribution)) {
      const percentage = ((size / analysis.totalSize) * 100).toFixed(1);
      report.push(
        `${type}: ${(size / 1024 / 1024).toFixed(2)} MB (${percentage}%)`
      );
    }
    report.push('');

    if (analysis.topRetainers.length > 0) {
      report.push('## Top Memory Retainers');
      analysis.topRetainers.slice(0, 10).forEach((retainer, index) => {
        report.push(
          `${index + 1}. ${retainer.type} "${retainer.name}": ${(retainer.retainedSize / 1024 / 1024).toFixed(2)} MB (${retainer.count} instances)`
        );
      });
      report.push('');
    }

    if (analysis.leakSuspects.length > 0) {
      report.push('## Memory Leak Suspects');
      analysis.leakSuspects.forEach((suspect, index) => {
        report.push(
          `${index + 1}. **${suspect.severity.toUpperCase()}** - ${suspect.type} "${suspect.name}"`
        );
        report.push(`   Reason: ${suspect.reason}`);
        report.push(
          `   Retained Size: ${(suspect.retainedSize / 1024 / 1024).toFixed(2)} MB`
        );
        report.push(`   Instances: ${suspect.instances}`);
        report.push('');
      });
    }

    if (analysis.recommendations.length > 0) {
      report.push('## Recommendations');
      analysis.recommendations.forEach((rec, index) => {
        report.push(`${index + 1}. ${rec}`);
      });
      report.push('');
    }

    return report.join('\n');
  }

  private async parseHeapSnapshot(
    dumpPath: string,
    dumpSize: number
  ): Promise<HeapAnalysisResult> {
    // This is a simplified parser - in production you'd use a proper V8 heap snapshot parser
    // like the one in Chrome DevTools or @memlab/core

    // const currentMemory = process.memoryUsage(); // Reserved for future use

    // Simulate parsing results based on current memory state and file size
    const estimatedObjects = Math.floor(dumpSize / 64); // Rough estimate
    const estimatedNodes = Math.floor(estimatedObjects * 1.5);
    const estimatedEdges = Math.floor(estimatedObjects * 3);

    return {
      timestamp: Date.now(),
      dumpPath,
      totalSize: dumpSize,
      objectCount: estimatedObjects,
      nodeCount: estimatedNodes,
      edgeCount: estimatedEdges,
      topRetainers: [
        {
          type: 'String',
          name: '(string)',
          retainedSize: dumpSize * 0.3,
          count: Math.floor(estimatedObjects * 0.4),
        },
        {
          type: 'Array',
          name: '(array)',
          retainedSize: dumpSize * 0.25,
          count: Math.floor(estimatedObjects * 0.2),
        },
        {
          type: 'Object',
          name: '(object)',
          retainedSize: dumpSize * 0.2,
          count: Math.floor(estimatedObjects * 0.25),
        },
        {
          type: 'Function',
          name: '(closure)',
          retainedSize: dumpSize * 0.15,
          count: Math.floor(estimatedObjects * 0.1),
        },
      ],
      leakSuspects: [], // Will be populated by detectLeakPatterns
      recommendations: [], // Will be populated by generateRecommendations
      memoryDistribution: {
        strings: dumpSize * 0.3,
        arrays: dumpSize * 0.25,
        objects: dumpSize * 0.2,
        functions: dumpSize * 0.15,
        other: dumpSize * 0.1,
      },
    };
  }

  private detectLeakPatterns(
    analysis: HeapAnalysisResult
  ): Array<HeapAnalysisResult['leakSuspects'][0]> {
    const suspects: Array<HeapAnalysisResult['leakSuspects'][0]> = [];

    // Check each leak pattern
    for (const pattern of this.leakPatterns) {
      if (pattern.detector(analysis)) {
        suspects.push({
          type: 'Pattern',
          name: pattern.pattern,
          reason: pattern.description,
          severity: pattern.severity,
          retainedSize: 0, // Pattern-based, not size-based
          instances: 1,
        });
      }
    }

    // Check for large object retainers
    analysis.topRetainers.forEach(retainer => {
      const sizeMB = retainer.retainedSize / 1024 / 1024;

      if (sizeMB > 100) {
        // 100MB threshold
        suspects.push({
          type: retainer.type,
          name: retainer.name,
          reason: `Large memory retention: ${sizeMB.toFixed(2)}MB`,
          severity:
            sizeMB > 500 ? 'critical' : sizeMB > 200 ? 'high' : 'medium',
          retainedSize: retainer.retainedSize,
          instances: retainer.count,
        });
      }

      if (retainer.count > 10000) {
        // High instance count
        suspects.push({
          type: retainer.type,
          name: retainer.name,
          reason: `High instance count: ${retainer.count.toLocaleString()} instances`,
          severity: retainer.count > 100000 ? 'high' : 'medium',
          retainedSize: retainer.retainedSize,
          instances: retainer.count,
        });
      }
    });

    return suspects;
  }

  private generateRecommendations(analysis: HeapAnalysisResult): string[] {
    const recommendations: string[] = [];

    // Size-based recommendations
    const sizeMB = analysis.totalSize / 1024 / 1024;
    if (sizeMB > 1000) {
      recommendations.push(
        'Consider increasing Node.js heap size or optimizing memory usage'
      );
    }

    // Distribution-based recommendations
    const { strings, arrays, functions } = analysis.memoryDistribution;
    const total = analysis.totalSize;

    if (strings / total > 0.5) {
      recommendations.push(
        'High string usage detected - consider string interning or optimization'
      );
    }

    if (arrays / total > 0.4) {
      recommendations.push(
        'High array usage detected - consider using typed arrays or object pooling'
      );
    }

    if (functions / total > 0.3) {
      recommendations.push(
        'High function/closure usage - check for closure leaks and unnecessary function creation'
      );
    }

    // Leak suspect recommendations
    const criticalSuspects = analysis.leakSuspects.filter(
      s => s.severity === 'critical'
    );
    if (criticalSuspects.length > 0) {
      recommendations.push(
        'Critical memory leaks detected - immediate investigation required'
      );
      recommendations.push(
        'Consider creating additional heap dumps to track leak progression'
      );
    }

    const highSuspects = analysis.leakSuspects.filter(
      s => s.severity === 'high'
    );
    if (highSuspects.length > 0) {
      recommendations.push(
        'High-priority memory issues detected - schedule investigation'
      );
    }

    // Object count recommendations
    if (analysis.objectCount > 1000000) {
      recommendations.push(
        'Very high object count - consider object pooling and lifecycle management'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Memory usage appears healthy - continue monitoring'
      );
    }

    return recommendations;
  }

  private setupLeakPatterns(): void {
    this.leakPatterns = [
      {
        pattern: 'High String Retention',
        description:
          'Excessive string objects may indicate string leaks or inefficient string handling',
        detector: analysis =>
          analysis.memoryDistribution.strings / analysis.totalSize > 0.6,
        severity: 'medium',
      },
      {
        pattern: 'Array Growth Pattern',
        description:
          'Large number of arrays may indicate array leaks or inefficient data structures',
        detector: analysis =>
          analysis.memoryDistribution.arrays / analysis.totalSize > 0.5,
        severity: 'medium',
      },
      {
        pattern: 'Closure Retention',
        description:
          'High function/closure count may indicate closure leaks or excessive function creation',
        detector: analysis =>
          analysis.memoryDistribution.functions / analysis.totalSize > 0.4,
        severity: 'high',
      },
      {
        pattern: 'Object Proliferation',
        description:
          'Extremely high object count indicates potential object leaks',
        detector: analysis => analysis.objectCount > 2000000,
        severity: 'high',
      },
      {
        pattern: 'Memory Bloat',
        description: 'Total memory usage is extremely high',
        detector: analysis => analysis.totalSize > 2 * 1024 * 1024 * 1024, // 2GB
        severity: 'critical',
      },
    ];
  }
}

// Global heap analyzer instance
export const heapAnalyzer = new HeapAnalyzer();
