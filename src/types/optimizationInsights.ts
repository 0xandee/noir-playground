/**
 * Type definitions for circuit optimization insights and suggestions
 */

/**
 * Severity level of an optimization suggestion
 */
export type SuggestionSeverity = 'high' | 'medium' | 'low';

/**
 * Category of optimization suggestion
 */
export type SuggestionCategory =
  | 'loop'           // Loop-related optimizations
  | 'arithmetic'     // Arithmetic operation optimizations
  | 'storage'        // Storage and memory optimizations
  | 'algorithm'      // Algorithmic improvements
  | 'general'        // General optimization tips
  | 'best-practice'; // Best practice recommendations

/**
 * Circuit complexity classification
 */
export type CircuitComplexity = 'low' | 'medium' | 'high';

/**
 * Individual optimization suggestion
 */
export interface OptimizationSuggestion {
  /** Unique identifier for the suggestion */
  id: string;

  /** Line number where the issue occurs (0 if general suggestion) */
  lineNumber: number;

  /** Severity of the optimization opportunity */
  severity: SuggestionSeverity;

  /** Category of the suggestion */
  category: SuggestionCategory;

  /** Short title/summary of the suggestion */
  title: string;

  /** Detailed description of the optimization opportunity */
  description: string;

  /** Impact metrics */
  impact: {
    /** Estimated opcode/gate reduction */
    estimatedSavings: number;

    /** Percentage of total circuit cost that could be saved */
    savingsPercentage: number;
  };

  /** Optional code snippet showing the problematic pattern */
  codeSnippet?: string;

  /** Optional suggested fix or alternative approach */
  suggestedFix?: string;

  /** Optional URL to learn more about this optimization */
  learnMoreUrl?: string;
}

/**
 * Complete optimization insights report for a circuit
 */
export interface OptimizationInsightsReport {
  /** List of all suggestions, sorted by severity and impact */
  suggestions: OptimizationSuggestion[];

  /** Total potential savings across all suggestions */
  totalPotentialSavings: number;

  /** Total potential savings as percentage of circuit */
  totalPotentialSavingsPercentage: number;

  /** When this analysis was performed */
  analysisTimestamp: Date;

  /** Overall circuit complexity classification */
  circuitComplexity: CircuitComplexity;

  /** Total gates in the circuit */
  totalGates: number;

  /** Total ACIR opcodes in the circuit */
  totalAcirOpcodes: number;

  /** Total Brillig opcodes in the circuit */
  totalBrilligOpcodes: number;
}

/**
 * Configuration for optimization analysis
 */
export interface OptimizationAnalysisConfig {
  /** Minimum percentage threshold for hotspot detection */
  hotspotThreshold: number;

  /** Gate count thresholds for complexity classification */
  complexityThresholds: {
    low: number;    // Below this is considered "low"
    medium: number; // Below this is considered "medium", above is "high"
  };

  /** Enable/disable specific analyzers */
  enabledAnalyzers: {
    hotspots: boolean;
    loops: boolean;
    arithmetic: boolean;
    arrays: boolean;
    hashOperations: boolean;
    bestPractices: boolean;
  };
}
