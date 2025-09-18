/**
 * Extended circuit metrics types for real-time complexity analysis and heatmaps
 */

export interface LineMetrics {
  lineNumber: number;
  fileName?: string;
  acirOpcodes: number;
  brilligOpcodes: number;
  gates: number;
  expressions: ExpressionMetrics[];
  totalCost: number;
  normalizedHeat: number; // 0-1 scale for visualization
  percentage: number; // Percentage of total circuit cost
}

export interface ExpressionMetrics {
  expression: string;
  column: number;
  acirOpcodes: number;
  brilligOpcodes: number;
  gates: number;
  opcodeTypes: string[];
}

export interface FunctionMetrics {
  functionName: string;
  packageName: string;
  startLine: number;
  endLine: number;
  acirOpcodes: number;
  brilligOpcodes: number;
  gates: number;
  expressionWidth: string;
  normalizedHeat: number;
  percentage: number;
}

export interface FileMetrics {
  fileName: string;
  lines: LineMetrics[];
  functions: FunctionMetrics[];
  totalAcirOpcodes: number;
  totalBrilligOpcodes: number;
  totalGates: number;
}

export interface CircuitComplexityReport {
  files: FileMetrics[];
  totalAcirOpcodes: number;
  totalBrilligOpcodes: number;
  totalGates: number;
  hotspots: LineMetrics[];
  topFunctions: FunctionMetrics[];
  generatedAt: Date;
}

export interface HeatmapData {
  lineNumber: number;
  heatValue: number; // 0-1 normalized
  primaryMetric: number;
  metricType: MetricType;
  badgeText: string;
  tooltipContent: string;
}

export interface MetricsDelta {
  lineNumber: number;
  previousValue: number;
  currentValue: number;
  delta: number;
  deltaPercentage: number;
  isImprovement: boolean;
  isRegression: boolean;
}

export interface MetricsComparison {
  deltas: MetricsDelta[];
  overallChange: number;
  overallChangePercentage: number;
  isOverallImprovement: boolean;
  comparedAt: Date;
  baselineLabel: string;
}

export type MetricType = 'acir' | 'brillig' | 'gates';

export interface MetricsFilter {
  metricType: MetricType;
  threshold: number; // Show only lines >= X% of total
  scope: 'file' | 'function' | 'all';
  showTopN?: number; // Limit to top N hotspots
}

export interface MetricsConfiguration {
  updateDebounceMs: number;
  cacheTimeoutMs: number;
  gradientColors: {
    low: string;    // Green
    medium: string; // Yellow
    high: string;   // Red
  };
  badgeFormat: 'compact' | 'detailed';
  showInlineMetrics: boolean;
  showGutterHeat: boolean;
}

// Default configuration
export const DEFAULT_METRICS_CONFIG: MetricsConfiguration = {
  updateDebounceMs: 500,
  cacheTimeoutMs: 5 * 60 * 1000, // 5 minutes
  gradientColors: {
    low: '#22c55e',    // Green-500
    medium: '#eab308', // Yellow-500
    high: '#ef4444'    // Red-500
  },
  badgeFormat: 'compact',
  showInlineMetrics: true,
  showGutterHeat: true
};

// Helper type for metric extraction
export interface MetricValue {
  acir: number;
  brillig: number;
  gates: number;
}

// Hotspot ranking criteria
export interface HotspotCriteria {
  metricType: MetricType;
  minimumThreshold: number;
  sortBy: 'absolute' | 'percentage';
  maxResults: number;
}