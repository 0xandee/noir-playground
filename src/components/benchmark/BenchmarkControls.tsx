import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, RefreshCw, Info } from "lucide-react";
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
  ];

  return (
    <TooltipProvider>
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

            {/* Info Tooltip */}
            <div className="ml-auto">
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  <p className="text-xs">
                    Benchmarks run directly on browser's hardware for the witness, proof, and verify stages, while delegating compilation to the server’s native Nargo CLI for faster performance and dependency management.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};