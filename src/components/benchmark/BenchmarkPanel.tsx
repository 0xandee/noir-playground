import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BenchmarkControls } from "./BenchmarkControls";
import { BenchmarkCombinedView } from "./BenchmarkCombinedView";
import {
  BenchmarkResult,
  BenchmarkConfig,
  BenchmarkProgress,
  BenchmarkComparison,
  DEFAULT_BENCHMARK_CONFIG
} from "@/types/benchmark";
import { benchmarkService } from "@/services/BenchmarkService";

interface BenchmarkPanelProps {
  sourceCode: string;
  inputs: Record<string, unknown>;
  cargoToml?: string;
  onConsoleMessage?: (type: 'error' | 'success' | 'info', message: string) => void;
}

export const BenchmarkPanel = ({
  sourceCode,
  inputs,
  cargoToml,
  onConsoleMessage
}: BenchmarkPanelProps) => {
  const [config, setConfig] = useState<BenchmarkConfig>(DEFAULT_BENCHMARK_CONFIG);
  const [currentResult, setCurrentResult] = useState<BenchmarkResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<BenchmarkResult | null>(null);
  const [comparison, setComparison] = useState<BenchmarkComparison | null>(null);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunBenchmark = useCallback(async () => {
    if (!sourceCode.trim()) {
      onConsoleMessage?.('error', 'No source code to benchmark');
      return;
    }

    setIsRunning(true);
    setProgress({
      currentRun: 0,
      totalRuns: config.numberOfRuns,
      currentStage: 'Starting',
      isComplete: false,
    });

    try {
      onConsoleMessage?.('info', `Starting benchmark with ${config.numberOfRuns} run(s)...`);

      const result = await benchmarkService.runBenchmark(
        sourceCode,
        inputs,
        config,
        (progressUpdate) => {
          setProgress(progressUpdate);
        },
        cargoToml
      );

      setCurrentResult(result);

      // Generate comparison if baseline exists and comparison is enabled
      if (config.enableComparison && baselineResult) {
        const comp = benchmarkService.compareBenchmarks(result, baselineResult);
        setComparison(comp);
      } else {
        setComparison(null);
      }

      // Success message with key metrics
      const successMessage = config.numberOfRuns === 1
        ? `Benchmark completed! Total time: ${result.summary.avgTotalTime.toFixed(0)}ms`
        : `Benchmark completed! Average time: ${result.summary.avgTotalTime.toFixed(0)}ms ± ${result.summary.stdDevTime.toFixed(0)}ms over ${result.summary.totalRuns} runs`;

      onConsoleMessage?.('success', successMessage);

      // Show performance insight
      // if (result.performanceInsight) {
      //   onConsoleMessage?.('info', `💡 ${result.performanceInsight}`);
      // }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onConsoleMessage?.('error', `Benchmark failed: ${errorMessage}`);
      setCurrentResult(null);
      setComparison(null);
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  }, [sourceCode, inputs, cargoToml, config, baselineResult, onConsoleMessage]);

  const handleClearResults = useCallback(() => {
    setCurrentResult(null);
    setComparison(null);
    setProgress(null);
    benchmarkService.clearResults();
    onConsoleMessage?.('info', 'Benchmark results cleared');
  }, [onConsoleMessage]);

  const handleSetBaseline = useCallback(() => {
    if (currentResult) {
      setBaselineResult(currentResult);
      benchmarkService.setBaseline(currentResult);
      onConsoleMessage?.('success', 'Current results set as baseline for future comparisons');
    }
  }, [currentResult, onConsoleMessage]);

  const handleConfigChange = useCallback((newConfig: BenchmarkConfig) => {
    setConfig(newConfig);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Controls Section */}
      <BenchmarkControls
        config={config}
        onConfigChange={handleConfigChange}
        onRunBenchmark={handleRunBenchmark}
        onClearResults={handleClearResults}
        onSetBaseline={handleSetBaseline}
        isRunning={isRunning}
        hasResults={!!currentResult}
        hasBaseline={!!baselineResult}
      />

      {/* Combined View */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <BenchmarkCombinedView
            result={currentResult || undefined}
            progress={progress || undefined}
            isRunning={isRunning}
            comparison={comparison || undefined}
            showComparison={config.enableComparison && !!baselineResult}
          />
        </ScrollArea>
      </div>

      {/* Bottom status bar (if running) */}
      {isRunning && progress && (
        <>
          <Separator />
          <div className="px-4 py-2 bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Run {progress.currentRun} of {progress.totalRuns}
              </span>
              <span className="text-foreground font-medium">
                {progress.currentStage}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};