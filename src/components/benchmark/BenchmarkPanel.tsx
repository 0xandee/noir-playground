import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  onClearConsole?: () => void;
}

export const BenchmarkPanel = ({
  sourceCode,
  inputs,
  cargoToml,
  onConsoleMessage,
  onClearConsole
}: BenchmarkPanelProps) => {
  const [config, setConfig] = useState<BenchmarkConfig>(DEFAULT_BENCHMARK_CONFIG);
  const [currentResult, setCurrentResult] = useState<BenchmarkResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<BenchmarkResult | null>(null);
  const [comparison, setComparison] = useState<BenchmarkComparison | null>(null);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResult[]>([]);

  const handleRunBenchmark = useCallback(async () => {
    if (!sourceCode.trim()) {
      onConsoleMessage?.('error', 'No source code to benchmark');
      return;
    }

    // Clear console before starting benchmark
    onClearConsole?.();

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
          // Send progress updates to console - only one message per run
          if (progressUpdate.currentStage === 'Starting') {
            const progressMessage = `Run ${progressUpdate.currentRun}/${progressUpdate.totalRuns}`;
            onConsoleMessage?.('info', progressMessage);
          }
        },
        cargoToml
      );

      setCurrentResult(result);

      // Add to history (limit to last 10 runs)
      setBenchmarkHistory((prevHistory) => {
        const newHistory = [result, ...prevHistory];
        return newHistory.slice(0, 10); // Keep only last 10 runs
      });

      // Generate comparison if baseline exists and comparison is enabled
      if (config.enableComparison && baselineResult) {
        const comp = benchmarkService.compareBenchmarks(result, baselineResult);
        setComparison(comp);
      } else {
        setComparison(null);
      }

      // Success message with key metrics
      const successMessage = `Benchmark completed!`;

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
  }, [sourceCode, inputs, cargoToml, config, baselineResult, onConsoleMessage, onClearConsole]);

  const handleClearResults = useCallback(() => {
    setCurrentResult(null);
    setComparison(null);
    setProgress(null);
    setBenchmarkHistory([]);
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
        isRunning={isRunning}
        progress={progress || undefined}
      />

      {/* Combined View */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <BenchmarkCombinedView
            result={currentResult || undefined}
            isRunning={isRunning}
            comparison={comparison || undefined}
            showComparison={config.enableComparison && !!baselineResult}
            history={benchmarkHistory}
          />
        </ScrollArea>
      </div>
    </div>
  );
};