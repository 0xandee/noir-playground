import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, RefreshCw, BarChart3 } from "lucide-react";
import { BenchmarkConfig } from "@/types/benchmark";

interface BenchmarkControlsProps {
  config: BenchmarkConfig;
  onConfigChange: (config: BenchmarkConfig) => void;
  onRunBenchmark: () => void;
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
  onClearResults,
  onSetBaseline,
  isRunning,
  hasResults,
  hasBaseline,
}: BenchmarkControlsProps) => {
  const handleRunsChange = (value: string) => {
    const numberOfRuns = parseInt(value);
    onConfigChange({ ...config, numberOfRuns });
  };

  const handleComparisonChange = (checked: boolean) => {
    onConfigChange({ ...config, enableComparison: checked });
  };

  const runOptions = [
    { value: "1", label: "1", description: "Quick benchmark" },
    { value: "3", label: "3", description: "Basic statistics" },
    { value: "5", label: "5", description: "Reliable average" },
    { value: "10", label: "10", description: "Detailed analysis" },
    { value: "50", label: "50", description: "High precision" },
    { value: "100", label: "100", description: "Publication grade" },
  ];

  return (
    <div className="border-b border-border bg-transparent">

      {/* Primary Controls */}
      <div className="px-4 py-3 space-y-3">
        {/* Main Control Row - Run Configuration + Comparison */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Number of Runs */}
          <div className="flex items-center gap-2">
            <Label htmlFor="runs-select" className="text-muted-foreground select-none text-xs whitespace-nowrap">
              Runs:
            </Label>
            <Select value={config.numberOfRuns.toString()} onValueChange={handleRunsChange}>
              <SelectTrigger className="w-[90px] h-7 flex items-center justify-center text-xs">
                <SelectValue className="text-center" />
              </SelectTrigger>
              <SelectContent>
                {runOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="text-xs">{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Run Button */}
          <Button
            onClick={onRunBenchmark}
            disabled={isRunning}
            variant="default"
            size="sm"
            className="h-7 px-4 flex items-center gap-2 text-xs"
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

          {/* Comparison Toggle - Inline */}
          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="comparison-mode"
              checked={config.enableComparison}
              onCheckedChange={handleComparisonChange}
              disabled={isRunning || !hasBaseline}
              className="scale-75"
            />
            <Label htmlFor="comparison-mode" className="text-foreground select-none text-xs whitespace-nowrap">
              Compare vs Baseline
            </Label>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onSetBaseline}
            disabled={!hasResults || isRunning}
            variant="outline"
            size="sm"
            className="h-7 px-3 flex items-center gap-2 text-xs"
          >
            <BarChart3 className="h-3 w-3" />
            Set as Baseline
          </Button>

          <Button
            onClick={onClearResults}
            disabled={!hasResults || isRunning}
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
          >
            Clear Results
          </Button>
        </div>
      </div>
    </div>
  );
};