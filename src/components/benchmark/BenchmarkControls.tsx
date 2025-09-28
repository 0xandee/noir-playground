import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Play, RefreshCw, BarChart3, Zap } from "lucide-react";
import { BenchmarkConfig, DEFAULT_BENCHMARK_CONFIG } from "@/types/benchmark";

interface BenchmarkControlsProps {
  config: BenchmarkConfig;
  onConfigChange: (config: BenchmarkConfig) => void;
  onRunBenchmark: () => void;
  onExportResults: () => void;
  onClearResults: () => void;
  onSetBaseline: () => void;
  isRunning: boolean;
  hasResults: boolean;
  hasBaseline: boolean;
}

export const BenchmarkControls = ({
  config,
  onConfigChange,
  onRunBenchmark,
  onExportResults,
  onClearResults,
  onSetBaseline,
  isRunning,
  hasResults,
  hasBaseline,
}: BenchmarkControlsProps) => {
  const [isVerbose, setIsVerbose] = useState(config.verbose);

  const handleRunsChange = (value: string) => {
    const numberOfRuns = parseInt(value);
    onConfigChange({ ...config, numberOfRuns });
  };

  const handleVerboseChange = (checked: boolean) => {
    setIsVerbose(checked);
    onConfigChange({ ...config, verbose: checked });
  };

  const handleComparisonChange = (checked: boolean) => {
    onConfigChange({ ...config, enableComparison: checked });
  };

  const runOptions = [
    { value: "1", label: "1 Run", description: "Quick benchmark" },
    { value: "3", label: "3 Runs", description: "Basic statistics" },
    { value: "5", label: "5 Runs", description: "Reliable average" },
    { value: "10", label: "10 Runs", description: "Detailed analysis" },
  ];

  return (
    <div className="border-b border-border bg-transparent">

      {/* Primary Controls */}
      <div className="px-4 py-4 space-y-4">
        {/* Run Configuration */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="runs-select" className="text-muted-foreground select-none" style={{ fontSize: '13px' }}>
              Number of Runs
            </Label>
            <Select value={config.numberOfRuns.toString()} onValueChange={handleRunsChange}>
              <SelectTrigger className="w-full h-8 mt-1" style={{ fontSize: '13px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {runOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span style={{ fontSize: '13px' }}>{option.label}</span>
                      <span className="text-muted-foreground" style={{ fontSize: '11px' }}>
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onRunBenchmark}
            disabled={isRunning}
            variant="default"
            size="sm"
            className="h-8 px-4 flex items-center gap-2"
            style={{ fontSize: '13px' }}
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run Benchmark
              </>
            )}
          </Button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="verbose-mode"
              checked={isVerbose}
              onCheckedChange={handleVerboseChange}
              disabled={isRunning}
              className="scale-75"
            />
            <Label htmlFor="verbose-mode" className="text-foreground select-none" style={{ fontSize: '13px' }}>
              Verbose Mode
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="comparison-mode"
              checked={config.enableComparison}
              onCheckedChange={handleComparisonChange}
              disabled={isRunning || !hasBaseline}
              className="scale-75"
            />
            <Label htmlFor="comparison-mode" className="text-foreground select-none" style={{ fontSize: '13px' }}>
              Compare vs Baseline
            </Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={onSetBaseline}
            disabled={!hasResults || isRunning}
            variant="outline"
            size="sm"
            className="h-7 px-3 flex items-center gap-2"
            style={{ fontSize: '12px' }}
          >
            <BarChart3 className="h-3 w-3" />
            Set as Baseline
          </Button>

          <Button
            onClick={onExportResults}
            disabled={!hasResults || isRunning}
            variant="outline"
            size="sm"
            className="h-7 px-3 flex items-center gap-2"
            style={{ fontSize: '12px' }}
          >
            <Download className="h-3 w-3" />
            Export JSON
          </Button>

          <Button
            onClick={onClearResults}
            disabled={!hasResults || isRunning}
            variant="outline"
            size="sm"
            className="h-7 px-3"
            style={{ fontSize: '12px' }}
          >
            Clear Results
          </Button>
        </div>

        {/* Status Indicators */}
        {(hasBaseline || hasResults) && (
          <div className="flex items-center gap-4 pt-2 text-muted-foreground" style={{ fontSize: '12px' }}>
            {hasBaseline && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span>Baseline Set</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};