/**
 * Benchmark types and interfaces for NoirJS performance analysis
 * Inspired by NoirJS Benchmark CLI architecture
 */

export interface StageMetrics {
  name: string;
  time: number; // milliseconds
  percentage: number; // percentage of total time
  status: 'pending' | 'running' | 'success' | 'error';
  details?: string;
}

export interface SingleRunMetrics {
  runId: number;
  stages: {
    compile: StageMetrics;
    witness: StageMetrics;
    proof: StageMetrics;
    verify: StageMetrics;
  };
  totalTime: number;
  proofSize: number;
  timestamp: Date;
  circuitName: string;
  backend: string;
}

export interface StageStatistics {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  avgPercentage: number;
  stdDevTime: number;
  successRate: number; // percentage of successful runs
}

export interface BenchmarkSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgTotalTime: number;
  minTotalTime: number;
  maxTotalTime: number;
  stdDevTime: number;
  avgProofSize: number;
}

export interface BenchmarkResult {
  id: string;
  runs: SingleRunMetrics[];
  summary: BenchmarkSummary;
  stages: {
    compile: StageStatistics;
    witness: StageStatistics;
    proof: StageStatistics;
    verify: StageStatistics;
  };
  performanceInsight: string;
  bottleneck: {
    stage: string;
    percentage: number;
    recommendation: string;
  };
  createdAt: Date;
  config: BenchmarkConfig;
}

export interface BenchmarkConfig {
  numberOfRuns: number;
  backend: 'UltraHonk' | 'Barretenberg';
  circuitName?: string;
  enableComparison: boolean;
}

export interface BenchmarkComparison {
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  improvements: {
    stage: string;
    timeDelta: number; // negative = improvement
    percentageChange: number;
    isImprovement: boolean;
  }[];
  overallImprovement: number; // percentage
  summary: string;
}

export interface BenchmarkProgress {
  currentRun: number;
  totalRuns: number;
  currentStage: string;
  isComplete: boolean;
  error?: string;
}

// Default configuration
export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  numberOfRuns: 1,
  backend: 'UltraHonk',
  enableComparison: false,
};

// Stage names for consistent referencing
export const STAGE_NAMES = {
  COMPILE: 'compile',
  WITNESS: 'witness',
  PROOF: 'proof',
  VERIFY: 'verify',
} as const;

export type StageName = typeof STAGE_NAMES[keyof typeof STAGE_NAMES];

// Performance thresholds for insights
export const PERFORMANCE_THRESHOLDS = {
  FAST_COMPILE_MS: 100,
  FAST_PROOF_MS: 1000,
  SLOW_PROOF_MS: 5000,
  HIGH_MEMORY_MB: 50,
  LARGE_PROOF_BYTES: 50000,
} as const;

// Visual display configuration
export interface BenchmarkDisplayConfig {
  showProgressBars: boolean;
  showPercentages: boolean;
  compactMode: boolean;
  animateStages: boolean;
}

export const DEFAULT_DISPLAY_CONFIG: BenchmarkDisplayConfig = {
  showProgressBars: true,
  showPercentages: true,
  compactMode: false,
  animateStages: true,
};