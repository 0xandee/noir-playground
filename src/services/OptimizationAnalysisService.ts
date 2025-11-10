/**
 * Service for analyzing circuit complexity and generating optimization suggestions
 */

import {
  OptimizationSuggestion,
  OptimizationInsightsReport,
  SuggestionSeverity,
  SuggestionCategory,
  CircuitComplexity,
  OptimizationAnalysisConfig,
} from '@/types/optimizationInsights';
import { CircuitComplexityReport, LineMetrics } from '@/types/circuitMetrics';

/**
 * Default configuration for optimization analysis
 */
const DEFAULT_CONFIG: OptimizationAnalysisConfig = {
  hotspotThreshold: 5.0, // Flag lines using >5% of circuit
  complexityThresholds: {
    low: 1000,    // <1k gates = low complexity
    medium: 10000, // <10k gates = medium, ≥10k = high
  },
  enabledAnalyzers: {
    hotspots: true,
    loops: true,
    arithmetic: true,
    arrays: true,
    hashOperations: true,
    bestPractices: true,
  },
};

/**
 * Service for analyzing circuits and generating optimization insights
 */
export class OptimizationAnalysisService {
  private config: OptimizationAnalysisConfig;

  constructor(config?: Partial<OptimizationAnalysisConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a circuit and generate optimization suggestions
   */
  analyzeCircuit(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationInsightsReport {
    const suggestions: OptimizationSuggestion[] = [];

    // Run all enabled analyzers
    if (this.config.enabledAnalyzers.hotspots) {
      suggestions.push(...this.analyzeHotspots(report, sourceCode));
    }

    if (this.config.enabledAnalyzers.loops) {
      suggestions.push(...this.analyzeLoops(report, sourceCode));
    }

    if (this.config.enabledAnalyzers.arithmetic) {
      suggestions.push(...this.analyzeArithmetic(report, sourceCode));
    }

    if (this.config.enabledAnalyzers.arrays) {
      suggestions.push(...this.analyzeArrays(report, sourceCode));
    }

    if (this.config.enabledAnalyzers.hashOperations) {
      suggestions.push(...this.analyzeHashOperations(report, sourceCode));
    }

    if (this.config.enabledAnalyzers.bestPractices) {
      suggestions.push(...this.analyzeBestPractices(report, sourceCode));
    }

    // Sort suggestions by severity (high -> medium -> low) then by impact
    const sortedSuggestions = this.sortSuggestions(suggestions);

    // Calculate total potential savings
    const totalPotentialSavings = sortedSuggestions.reduce(
      (sum, s) => sum + s.impact.estimatedSavings,
      0
    );

    const totalPotentialSavingsPercentage = sortedSuggestions.reduce(
      (sum, s) => sum + s.impact.savingsPercentage,
      0
    );

    // Classify circuit complexity
    const circuitComplexity = this.classifyComplexity(report.totalGates);

    return {
      suggestions: sortedSuggestions,
      totalPotentialSavings,
      totalPotentialSavingsPercentage: Math.min(
        totalPotentialSavingsPercentage,
        100
      ),
      analysisTimestamp: new Date(),
      circuitComplexity,
      totalGates: report.totalGates,
      totalAcirOpcodes: report.totalAcirOpcodes,
      totalBrilligOpcodes: report.totalBrilligOpcodes,
    };
  }

  /**
   * Analyze hotspot lines (high complexity)
   */
  private analyzeHotspots(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const sourceLines = sourceCode.split('\n');

    // Find lines exceeding threshold
    const hotspots = report.hotspots.filter(
      (h) => h.percentage >= this.config.hotspotThreshold
    );

    for (const hotspot of hotspots) {
      // Skip hotspots with 0 gates (redundant)
      if (hotspot.gates === 0) continue;

      const lineContent = sourceLines[hotspot.lineNumber - 1]?.trim() || '';

      let severity: SuggestionSeverity = 'medium';
      if (hotspot.percentage >= 20) severity = 'high';
      else if (hotspot.percentage < 10) severity = 'low';

      suggestions.push({
        id: `hotspot-${hotspot.lineNumber}`,
        lineNumber: hotspot.lineNumber,
        severity,
        category: 'general',
        title: `Hotspot: ${hotspot.percentage.toFixed(1)}% of circuit`,
        description: `Uses ${hotspot.percentage.toFixed(1)}% of circuit (${hotspot.gates} gates) - split into smaller operations or optimize algorithm`,
        impact: {
          estimatedSavings: Math.floor(hotspot.gates * 0.3), // Assume 30% potential savings
          savingsPercentage: hotspot.percentage * 0.3,
        },
        codeSnippet: lineContent,
      });
    }

    return suggestions;
  }

  /**
   * Analyze loop patterns
   */
  private analyzeLoops(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const sourceLines = sourceCode.split('\n');

    // Detect for loops
    const forLoopRegex = /for\s+\w+\s+in\s+(.+?)\s*\{/g;
    const rangeRegex = /(\d+)\.\.(\d+)/;

    sourceLines.forEach((line, index) => {
      const lineNumber = index + 1;
      const match = forLoopRegex.exec(line);

      if (match) {
        const loopRange = match[1];
        const rangeMatch = rangeRegex.exec(loopRange);

        // Find complexity of this line
        const lineMetrics = report.hotspots.find(
          (h) => h.lineNumber === lineNumber
        );

        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          const iterations = end - start;

          if (iterations > 10) {
            suggestions.push({
              id: `loop-large-${lineNumber}`,
              lineNumber,
              severity: 'high',
              category: 'loop',
              title: `Loop: ${iterations} iterations`,
              description: `Loop unrolls ${iterations} times - reduce iterations or restructure to lower constraint count`,
              impact: {
                estimatedSavings: lineMetrics
                  ? Math.floor(lineMetrics.gates * 0.4)
                  : iterations * 10,
                savingsPercentage: lineMetrics
                  ? lineMetrics.percentage * 0.4
                  : 0,
              },
              codeSnippet: line.trim(),
            });
          }
        } else {
          // Dynamic loop bound
          suggestions.push({
            id: `loop-dynamic-${lineNumber}`,
            lineNumber,
            severity: 'medium',
            category: 'loop',
            title: 'Loop: variable bounds',
            description: `Loop has variable bounds - use compile-time constants or fixed-size arrays`,
            impact: {
              estimatedSavings: lineMetrics
                ? Math.floor(lineMetrics.gates * 0.3)
                : 50,
              savingsPercentage: lineMetrics ? lineMetrics.percentage * 0.3 : 0,
            },
            codeSnippet: line.trim(),
          });
        }
      }

      // Detect nested loops
      if (line.match(/for\s+\w+\s+in\s+.+\{/)) {
        // Look back to see if we're already in a loop
        const previousLines = sourceLines.slice(Math.max(0, index - 5), index);
        const hasParentLoop = previousLines.some((l) =>
          l.match(/for\s+\w+\s+in\s+.+\{/)
        );

        if (hasParentLoop) {
          const lineMetrics = report.hotspots.find(
            (h) => h.lineNumber === lineNumber
          );

          suggestions.push({
            id: `loop-nested-${lineNumber}`,
            lineNumber,
            severity: 'high',
            category: 'loop',
            title: 'Nested loop',
            description: `Nested loops create quadratic complexity - flatten logic, use lookup tables, or restructure`,
            impact: {
              estimatedSavings: lineMetrics
                ? Math.floor(lineMetrics.gates * 0.5)
                : 100,
              savingsPercentage: lineMetrics ? lineMetrics.percentage * 0.5 : 0,
            },
            codeSnippet: line.trim(),
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Analyze arithmetic operations
   */
  private analyzeArithmetic(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const sourceLines = sourceCode.split('\n');

    sourceLines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineMetrics = report.hotspots.find(
        (h) => h.lineNumber === lineNumber
      );

      // Detect division operations
      if (line.match(/\//) && !line.match(/\/\//)) {
        // Not a comment
        suggestions.push({
          id: `arithmetic-division-${lineNumber}`,
          lineNumber,
          severity: 'medium',
          category: 'arithmetic',
          title: 'Division',
          description: `Division requires expensive field inversion - multiply by modular inverse for constants or restructure logic to avoid division`,
          impact: {
            estimatedSavings: lineMetrics ? Math.floor(lineMetrics.gates * 0.4) : 20,
            savingsPercentage: lineMetrics ? lineMetrics.percentage * 0.4 : 0,
          },
          codeSnippet: line.trim(),
        });
      }
    });

    return suggestions;
  }

  /**
   * Analyze array usage patterns
   */
  private analyzeArrays(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const sourceLines = sourceCode.split('\n');

    sourceLines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Detect Vec usage (dynamic arrays)
      if (line.match(/Vec\s*</)) {
        suggestions.push({
          id: `array-vec-${lineNumber}`,
          lineNumber,
          severity: 'medium',
          category: 'storage',
          title: 'Dynamic array (Vec)',
          description: `Vec is less efficient than fixed-size arrays - use [Field; 10] instead of Vec<Field>`,
          impact: {
            estimatedSavings: 30,
            savingsPercentage: 0.5,
          },
          codeSnippet: line.trim(),
        });
      }

      // Detect array push operations
      if (line.match(/\.push\s*\(/)) {
        suggestions.push({
          id: `array-push-${lineNumber}`,
          lineNumber,
          severity: 'low',
          category: 'storage',
          title: 'Array push',
          description: `push() adds overhead - use fixed-size arrays with manual indexing`,
          impact: {
            estimatedSavings: 10,
            savingsPercentage: 0.2,
          },
          codeSnippet: line.trim(),
        });
      }
    });

    return suggestions;
  }

  /**
   * Analyze hash function usage patterns
   */
  private analyzeHashOperations(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const sourceLines = sourceCode.split('\n');

    // Regex to detect common hash functions
    const hashFunctionRegex = /(poseidon|pedersen|keccak|blake2s|sha256|mimc)/i;

    sourceLines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineMetrics = report.hotspots.find(
        (h) => h.lineNumber === lineNumber
      );

      // Check if line contains a hash function call
      if (line.match(hashFunctionRegex)) {
        // Check if we're inside a loop (look back up to 10 lines)
        const previousLines = sourceLines.slice(Math.max(0, index - 10), index);
        const isInsideLoop = previousLines.some((l) =>
          l.match(/for\s+\w+\s+in\s+.+\{/)
        );

        if (isInsideLoop) {
          // High severity: hash inside loop
          suggestions.push({
            id: `hash-in-loop-${lineNumber}`,
            lineNumber,
            severity: 'high',
            category: 'algorithm',
            title: 'Hash function inside loop',
            description: `Hash function called inside loop - move hash calls outside loop or batch with Merkle tree structure`,
            impact: {
              estimatedSavings: lineMetrics
                ? Math.floor(lineMetrics.gates * 0.5)
                : 100,
              savingsPercentage: lineMetrics ? lineMetrics.percentage * 0.5 : 0,
            },
            codeSnippet: line.trim(),
            learnMoreUrl: 'https://noir-lang.org/docs/noir/standard_library/cryptographic_primitives',
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Analyze general best practices
   */
  private analyzeBestPractices(
    report: CircuitComplexityReport,
    sourceCode: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // General best practice: circuit size
    if (report.totalGates > 100000) {
      suggestions.push({
        id: 'best-practice-large-circuit',
        lineNumber: 0,
        severity: 'high',
        category: 'best-practice',
        title: 'Very large circuit',
        description: `Circuit has ${report.totalGates.toLocaleString()} gates - break into sub-circuits or use recursion to reduce proving time`,
        impact: {
          estimatedSavings: Math.floor(report.totalGates * 0.2),
          savingsPercentage: 20,
        },
        learnMoreUrl: 'https://noir-lang.org/docs/noir/concepts/data_types',
      });
    }

    // Check for missing recursive attribute on large circuits
    if (report.totalGates > 50000 && !sourceCode.includes('#[recursive]')) {
      suggestions.push({
        id: 'best-practice-missing-recursive',
        lineNumber: 0,
        severity: 'medium',
        category: 'best-practice',
        title: 'Large circuit without recursive composition',
        description: `Circuit has ${report.totalGates.toLocaleString()} gates without #[recursive] attribute - consider using recursive proof composition to split into sub-circuits`,
        impact: {
          estimatedSavings: Math.floor(report.totalGates * 0.15),
          savingsPercentage: 15,
        },
        learnMoreUrl: 'https://noir-lang.org/docs/noir/concepts/recursion',
      });
    }

    // Check function count complexity
    if (report.topFunctions.length > 0) {
      const largestFunction = report.topFunctions[0];
      // Skip "main" function dominance (expected in simple circuits)
      if (largestFunction.percentage > 50 && largestFunction.functionName !== 'main') {
        suggestions.push({
          id: 'best-practice-large-function',
          lineNumber: largestFunction.startLine,
          severity: 'medium',
          category: 'best-practice',
          title: `Function dominates: ${largestFunction.functionName}`,
          description: `"${largestFunction.functionName}" uses ${largestFunction.percentage.toFixed(1)}% of circuit - split into smaller functions or optimize logic`,
          impact: {
            estimatedSavings: Math.floor(largestFunction.gates * 0.25),
            savingsPercentage: largestFunction.percentage * 0.25,
          },
        });
      }
    }

    // General advice for high ACIR opcode count
    if (report.totalAcirOpcodes > 10000) {
      suggestions.push({
        id: 'best-practice-high-acir',
        lineNumber: 0,
        severity: 'medium',
        category: 'best-practice',
        title: 'High ACIR opcode count',
        description: `Circuit has ${report.totalAcirOpcodes.toLocaleString()} ACIR opcodes - optimize hotspots to reduce proving time`,
        impact: {
          estimatedSavings: Math.floor(report.totalAcirOpcodes * 0.15),
          savingsPercentage: 15,
        },
        learnMoreUrl: 'https://noir-lang.org/docs/',
      });
    }

    return suggestions;
  }

  /**
   * Sort suggestions by priority (severity, then impact)
   */
  private sortSuggestions(
    suggestions: OptimizationSuggestion[]
  ): OptimizationSuggestion[] {
    const severityOrder = { high: 0, medium: 1, low: 2 };

    return suggestions.sort((a, b) => {
      // First by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by impact (descending)
      return b.impact.estimatedSavings - a.impact.estimatedSavings;
    });
  }

  /**
   * Classify circuit complexity based on gate count
   */
  private classifyComplexity(totalGates: number): CircuitComplexity {
    if (totalGates < this.config.complexityThresholds.low) {
      return 'low';
    } else if (totalGates < this.config.complexityThresholds.medium) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OptimizationAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationAnalysisConfig {
    return { ...this.config };
  }
}
