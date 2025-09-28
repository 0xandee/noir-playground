/**
 * BenchmarkService - Core benchmarking logic for NoirJS performance analysis
 * Provides professional-grade benchmarking capabilities inspired by NoirJS Benchmark CLI
 */

import {
  BenchmarkResult,
  BenchmarkConfig,
  SingleRunMetrics,
  StageMetrics,
  BenchmarkSummary,
  StageStatistics,
  BenchmarkProgress,
  BenchmarkComparison,
  DEFAULT_BENCHMARK_CONFIG,
  STAGE_NAMES,
  PERFORMANCE_THRESHOLDS,
  StageName
} from '@/types/benchmark';

import { NoirService, ExecutionStep } from './NoirService';

export class BenchmarkService {
  private noirService: NoirService;
  private currentBenchmark: BenchmarkResult | null = null;
  private baselineBenchmark: BenchmarkResult | null = null;

  constructor() {
    this.noirService = new NoirService();
  }

  /**
   * Run a complete benchmark with specified configuration
   */
  async runBenchmark(
    sourceCode: string,
    inputs: Record<string, unknown>,
    config: Partial<BenchmarkConfig> = {},
    onProgress?: (progress: BenchmarkProgress) => void,
    cargoToml?: string
  ): Promise<BenchmarkResult> {
    const fullConfig = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
    const runs: SingleRunMetrics[] = [];
    const benchmarkId = `benchmark-${Date.now()}`;

    try {
      // Run the specified number of benchmark iterations
      for (let runIndex = 0; runIndex < fullConfig.numberOfRuns; runIndex++) {
        onProgress?.({
          currentRun: runIndex + 1,
          totalRuns: fullConfig.numberOfRuns,
          currentStage: 'Starting',
          isComplete: false,
        });

        const runMetrics = await this.runSingleBenchmark(
          sourceCode,
          inputs,
          runIndex + 1,
          fullConfig,
          cargoToml,
          (stageName) => {
            onProgress?.({
              currentRun: runIndex + 1,
              totalRuns: fullConfig.numberOfRuns,
              currentStage: stageName,
              isComplete: false,
            });
          }
        );

        runs.push(runMetrics);
      }

      // Calculate statistics and insights
      const summary = this.calculateSummary(runs);
      const stageStats = this.calculateStageStatistics(runs);
      const insight = this.generatePerformanceInsight(summary, stageStats);
      const bottleneck = this.identifyBottleneck(stageStats);

      const result: BenchmarkResult = {
        id: benchmarkId,
        runs,
        summary,
        stages: stageStats,
        performanceInsight: insight,
        bottleneck,
        createdAt: new Date(),
        config: fullConfig,
      };

      this.currentBenchmark = result;

      onProgress?.({
        currentRun: fullConfig.numberOfRuns,
        totalRuns: fullConfig.numberOfRuns,
        currentStage: 'Complete',
        isComplete: true,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.({
        currentRun: 0,
        totalRuns: fullConfig.numberOfRuns,
        currentStage: 'Error',
        isComplete: true,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Run a single benchmark iteration
   */
  private async runSingleBenchmark(
    sourceCode: string,
    inputs: Record<string, unknown>,
    runId: number,
    config: BenchmarkConfig,
    cargoToml?: string,
    onStageChange?: (stageName: string) => void
  ): Promise<SingleRunMetrics> {
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();

    const stages: Record<StageName, StageMetrics> = {
      compile: this.createEmptyStage('Compile'),
      init: this.createEmptyStage('Initialize'),
      witness: this.createEmptyStage('Generate Witness'),
      proof: this.createEmptyStage('Generate Proof'),
      verify: this.createEmptyStage('Verify Proof'),
    };

    let peakMemory = initialMemory;
    let proofSize = 0;

    // Reset NoirService for clean measurement
    this.noirService.reset();

    try {
      // Track execution with detailed stage monitoring
      const result = await this.noirService.executeCircuit(
        sourceCode,
        inputs,
        (step: ExecutionStep) => {
          // Safety check for step
          if (!step) {
            console.warn('BenchmarkService: Received undefined/null step from NoirService');
            return;
          }

          // Check step structure and status
          if (typeof step !== 'object' || !('status' in step) || !step.status) {
            console.warn('BenchmarkService: Invalid step structure:', step);
            return;
          }

          const stageName = this.mapExecutionStepToStage(step.message);
          if (stageName && stages[stageName]) {
            onStageChange?.(stages[stageName].name);
            this.updateStageFromStep(stages[stageName], step);

            // Track peak memory during execution
            const currentMemory = this.getMemoryUsage();
            if (currentMemory > peakMemory) {
              peakMemory = currentMemory;
            }
          }
        },
        cargoToml,
        true // Always prove and verify for benchmarking
      );

      // Calculate final metrics
      const totalTime = performance.now() - startTime;

      // Update stage percentages
      Object.values(stages).forEach(stage => {
        if (stage.time > 0) {
          stage.percentage = (stage.time / totalTime) * 100;
        }
      });

      // Get proof size if available
      if (result.proof) {
        proofSize = result.proof.length;
      }

      const metrics: SingleRunMetrics = {
        runId,
        stages,
        totalTime,
        peakMemory,
        proofSize,
        timestamp: new Date(),
        circuitName: config.circuitName || 'main.nr',
        backend: config.backend,
      };

      return metrics;

    } catch (error) {
      // Mark failed stages as error
      Object.values(stages).forEach(stage => {
        if (stage.status === 'running') {
          stage.status = 'error';
          stage.details = error instanceof Error ? error.message : 'Unknown error';
        }
      });

      throw error;
    }
  }

  /**
   * Create an empty stage metrics object
   */
  private createEmptyStage(name: string): StageMetrics {
    return {
      name,
      time: 0,
      memory: 0,
      percentage: 0,
      status: 'pending',
    };
  }

  /**
   * Map execution step messages to benchmark stages
   */
  private mapExecutionStepToStage(message: string): StageName | null {
    // Safety check for message
    if (!message || typeof message !== 'string') {
      console.warn('BenchmarkService: Invalid message provided to mapExecutionStepToStage', message);
      return null;
    }

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('compil')) return STAGE_NAMES.COMPILE;
    if (lowerMessage.includes('initializ')) return STAGE_NAMES.INIT;
    if (lowerMessage.includes('witness') || lowerMessage.includes('execut')) return STAGE_NAMES.WITNESS;
    if (lowerMessage.includes('proof') && lowerMessage.includes('generat')) return STAGE_NAMES.PROOF;
    if (lowerMessage.includes('verif')) return STAGE_NAMES.VERIFY;

    return null;
  }

  /**
   * Update stage metrics from execution step
   */
  private updateStageFromStep(stage: StageMetrics, step: ExecutionStep): void {
    // Safety check to ensure step and stage are defined
    if (!step || !stage) {
      console.warn('BenchmarkService: Invalid step or stage provided to updateStageFromStep');
      return;
    }

    // Safety check for step.status
    if (!step.status) {
      console.warn('BenchmarkService: ExecutionStep missing status property', step);
      return;
    }

    if (step.status === 'running') {
      stage.status = 'running';
    } else if (step.status === 'success') {
      stage.status = 'success';
      // Extract timing from step details if available
      if (step.time) {
        const timeMatch = step.time.match(/(\d+(?:\.\d+)?)(ms|s)/);
        if (timeMatch) {
          const value = parseFloat(timeMatch[1]);
          const unit = timeMatch[2];
          stage.time = unit === 's' ? value * 1000 : value;
        }
      }
      stage.memory = this.getMemoryUsage();
    } else if (step.status === 'error') {
      stage.status = 'error';
      stage.details = step.details;
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    try {
      if (typeof window !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        if (memory && typeof memory.usedJSHeapSize === 'number') {
          return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
        }
      }
    } catch (error) {
      console.warn('BenchmarkService: Unable to access memory API', error);
    }
    return 0; // Fallback for environments without memory API
  }

  /**
   * Calculate summary statistics from multiple runs
   */
  private calculateSummary(runs: SingleRunMetrics[]): BenchmarkSummary {
    const successfulRuns = runs.filter(run =>
      Object.values(run.stages).every(stage => stage.status === 'success')
    );

    const times = successfulRuns.map(run => run.totalTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const stdDevTime = Math.sqrt(
      times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length
    );

    return {
      totalRuns: runs.length,
      successfulRuns: successfulRuns.length,
      failedRuns: runs.length - successfulRuns.length,
      avgTotalTime: avgTime,
      minTotalTime: Math.min(...times),
      maxTotalTime: Math.max(...times),
      stdDevTime,
      avgPeakMemory: successfulRuns.reduce((sum, run) => sum + run.peakMemory, 0) / successfulRuns.length,
      avgProofSize: successfulRuns.reduce((sum, run) => sum + run.proofSize, 0) / successfulRuns.length,
    };
  }

  /**
   * Calculate stage-level statistics
   */
  private calculateStageStatistics(runs: SingleRunMetrics[]): Record<StageName, StageStatistics> {
    const stageNames = Object.values(STAGE_NAMES);
    const stats: Record<StageName, StageStatistics> = {} as any;

    stageNames.forEach(stageName => {
      const stageData = runs
        .map(run => run.stages[stageName])
        .filter(stage => stage.status === 'success');

      if (stageData.length === 0) {
        stats[stageName] = {
          name: stageName,
          avgTime: 0,
          minTime: 0,
          maxTime: 0,
          avgMemory: 0,
          minMemory: 0,
          maxMemory: 0,
          avgPercentage: 0,
          stdDevTime: 0,
          successRate: 0,
        };
        return;
      }

      const times = stageData.map(s => s.time);
      const memories = stageData.map(s => s.memory);
      const percentages = stageData.map(s => s.percentage);

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const stdDevTime = Math.sqrt(
        times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length
      );

      stats[stageName] = {
        name: stageName,
        avgTime,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        avgMemory: memories.reduce((a, b) => a + b, 0) / memories.length,
        minMemory: Math.min(...memories),
        maxMemory: Math.max(...memories),
        avgPercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
        stdDevTime,
        successRate: (stageData.length / runs.length) * 100,
      };
    });

    return stats;
  }

  /**
   * Generate performance insight message
   */
  private generatePerformanceInsight(summary: BenchmarkSummary, stages: Record<StageName, StageStatistics>): string {
    const proofStage = stages[STAGE_NAMES.PROOF];
    const proofPercentage = proofStage.avgPercentage;

    if (proofPercentage > 70) {
      return `Proof Generation dominates ${proofPercentage.toFixed(1)}% of execution time`;
    } else if (summary.avgTotalTime < PERFORMANCE_THRESHOLDS.FAST_PROOF_MS) {
      return `Excellent performance! Circuit executes in ${summary.avgTotalTime.toFixed(0)}ms`;
    } else if (summary.avgTotalTime > PERFORMANCE_THRESHOLDS.SLOW_PROOF_MS) {
      return `Consider optimizing circuit complexity - execution time is ${summary.avgTotalTime.toFixed(0)}ms`;
    } else {
      return `Good performance with balanced execution across pipeline stages`;
    }
  }

  /**
   * Identify the performance bottleneck
   */
  private identifyBottleneck(stages: Record<StageName, StageStatistics>): BenchmarkResult['bottleneck'] {
    const sortedStages = Object.entries(stages)
      .sort(([,a], [,b]) => b.avgPercentage - a.avgPercentage);

    const [bottleneckName, bottleneckStage] = sortedStages[0];

    let recommendation = '';
    if (bottleneckName === STAGE_NAMES.PROOF && bottleneckStage.avgPercentage > 70) {
      recommendation = 'Consider reducing circuit complexity or using more efficient constraints';
    } else if (bottleneckName === STAGE_NAMES.COMPILE && bottleneckStage.avgPercentage > 30) {
      recommendation = 'Circuit compilation is taking significant time - check for complex types or large arrays';
    } else {
      recommendation = 'Performance is well-balanced across pipeline stages';
    }

    return {
      stage: bottleneckStage.name,
      percentage: bottleneckStage.avgPercentage,
      recommendation,
    };
  }

  /**
   * Compare current benchmark with baseline
   */
  compareBenchmarks(current: BenchmarkResult, baseline: BenchmarkResult): BenchmarkComparison {
    const improvements = Object.keys(STAGE_NAMES).map(stageName => {
      const currentStage = current.stages[stageName as StageName];
      const baselineStage = baseline.stages[stageName as StageName];

      const timeDelta = currentStage.avgTime - baselineStage.avgTime;
      const percentageChange = baselineStage.avgTime > 0
        ? (timeDelta / baselineStage.avgTime) * 100
        : 0;

      return {
        stage: stageName,
        timeDelta,
        percentageChange,
        isImprovement: timeDelta < 0,
      };
    });

    const overallImprovement = ((baseline.summary.avgTotalTime - current.summary.avgTotalTime) / baseline.summary.avgTotalTime) * 100;

    const summary = overallImprovement > 0
      ? `Overall performance improved by ${overallImprovement.toFixed(1)}%`
      : `Overall performance regressed by ${Math.abs(overallImprovement).toFixed(1)}%`;

    return {
      baseline,
      current,
      improvements,
      overallImprovement,
      summary,
    };
  }

  /**
   * Set baseline for future comparisons
   */
  setBaseline(benchmark: BenchmarkResult): void {
    this.baselineBenchmark = benchmark;
  }

  /**
   * Get current baseline
   */
  getBaseline(): BenchmarkResult | null {
    return this.baselineBenchmark;
  }

  /**
   * Get the most recent benchmark result
   */
  getCurrentBenchmark(): BenchmarkResult | null {
    return this.currentBenchmark;
  }

  /**
   * Export benchmark results to JSON
   */
  exportToJson(benchmark: BenchmarkResult): string {
    return JSON.stringify(benchmark, null, 2);
  }

  /**
   * Clear all stored benchmarks
   */
  clearResults(): void {
    this.currentBenchmark = null;
    this.baselineBenchmark = null;
  }
}

// Export singleton instance
export const benchmarkService = new BenchmarkService();