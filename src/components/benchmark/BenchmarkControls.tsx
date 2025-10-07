import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, RefreshCw } from "lucide-react";
import { BenchmarkConfig, BenchmarkProgress } from "@/types/benchmark";

interface BenchmarkControlsProps {
  config: BenchmarkConfig;
  onConfigChange: (config: BenchmarkConfig) => void;
  onRunBenchmark: () => void;
  isRunning: boolean;
  progress?: BenchmarkProgress;
}

export const BenchmarkControls = ({
  config,
  onConfigChange,
  onRunBenchmark,
  isRunning,
  progress,
}: BenchmarkControlsProps) => {
  const handleRunsChange = (value: string) => {
    const numberOfRuns = parseInt(value);
    onConfigChange({ ...config, numberOfRuns });
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
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Number of Runs */}
          <div className="flex items-center gap-2">
            <Label htmlFor="runs-select" className="text-muted-foreground select-none text-xs whitespace-nowrap">
              Runs:
            </Label>
            <Select value={config.numberOfRuns.toString()} onValueChange={handleRunsChange}>
              <SelectTrigger className="w-[90px] h-7 flex items-center justify-center gap-2 text-xs">
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

          {/* Run Benchmark Button */}
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
                {progress ? `Running… (${progress.currentRun}/${progress.totalRuns})` : 'Running...'}
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run Benchmark
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};