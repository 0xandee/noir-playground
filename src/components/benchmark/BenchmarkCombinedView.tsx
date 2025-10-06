import React from "react";
import { BenchmarkResult, BenchmarkProgress, BenchmarkComparison, StageName, STAGE_NAMES } from "@/types/benchmark";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, HardDrive, Target, CheckCircle, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BenchmarkCombinedViewProps {
  result?: BenchmarkResult;
  progress?: BenchmarkProgress;
  isRunning: boolean;
  comparison?: BenchmarkComparison;
  showComparison?: boolean;
}

export const BenchmarkCombinedView = ({
  result,
  progress,
  isRunning,
  comparison,
  showComparison = false
}: BenchmarkCombinedViewProps) => {
  if (!result && !isRunning) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-muted-foreground text-sm">
          <Zap className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Run a benchmark to see performance analysis</p>
        </div>
      </div>
    );
  }

  if (isRunning && progress) {
    return <RunningVisualization progress={progress} />;
  }

  if (result) {
    return (
      <div className="px-4 py-6 space-y-6">
        <PipelineVisualization result={result} />
        <DetailedStatistics result={result} comparison={comparison} showComparison={showComparison} />
      </div>
    );
  }

  return null;
};

const RunningVisualization = ({ progress }: { progress: BenchmarkProgress }) => {
  const progressPercentage = ((progress.currentRun - 1) / progress.totalRuns + (1 / progress.totalRuns) * 0.5) * 100;

  return (
    <Card className="mx-4 my-6">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium">
              Run {progress.currentRun} of {progress.totalRuns}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {progress.currentStage}
          </Badge>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Pipeline Stages */}
        <PipelineStages currentStage={progress.currentStage} />
      </CardContent>
    </Card>
  );
};

const PipelineVisualization = ({ result }: { result: BenchmarkResult }) => {
  const stages = [
    { key: STAGE_NAMES.COMPILE, name: 'COMPILE', stage: result.stages.compile },
    { key: STAGE_NAMES.WITNESS, name: 'WITNESS GENERATION', stage: result.stages.witness },
    { key: STAGE_NAMES.PROOF, name: 'PROOF GENERATION', stage: result.stages.proof },
    { key: STAGE_NAMES.VERIFY, name: 'VERIFY PROOF', stage: result.stages.verify },
  ];

  // Find the main event (highest percentage)
  const mainEventStage = stages.reduce((max, stage) =>
    stage.stage.avgPercentage > max.stage.avgPercentage ? stage : max
  );

  return (
    <Card>
      <CardContent className="space-y-6">

        {/* Visual Pipeline */}
        <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Stage Boxes */}
            <div className="flex items-center justify-between mb-4">
              {stages.map((stage, index) => (
                <div key={stage.key} className="contents">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        px-3 py-2 rounded border-2 min-w-[80px] text-center
                        ${stage.key === mainEventStage.key
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-muted-foreground/30 bg-background'
                        }
                      `}
                    >
                      <div className="font-mono font-bold text-foreground text-[11px]">
                        {stage.name}
                      </div>
                    </div>
                    <div className="text-foreground font-mono mt-1 text-xs">
                      {stage.stage.avgTime.toFixed(0)}ms
                    </div>
                    <div className="text-muted-foreground font-mono text-[11px]">
                      {stage.stage.avgPercentage.toFixed(1)}%
                    </div>
                  </div>
                  {index < stages.length - 1 && (
                    <div className="flex-1 h-px bg-muted-foreground/30 mx-2 relative">
                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground">
                        ▶
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-muted/20 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground text-xs">TOTAL TIME</span>
              </div>
              <div className="font-mono text-foreground font-bold text-base">
                {result.summary.avgTotalTime.toFixed(0)}ms
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <HardDrive className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground text-xs">PROOF SIZE</span>
              </div>
              <div className="font-mono text-foreground font-bold text-base">
                {(result.summary.avgProofSize / 1024).toFixed(1)}KB
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground text-xs">SUCCESS RATE</span>
              </div>
              <div className="font-mono text-foreground font-bold text-base">
                {((result.summary.successfulRuns / result.summary.totalRuns) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

const DetailedStatistics = ({
  result,
  comparison,
  showComparison
}: {
  result: BenchmarkResult;
  comparison?: BenchmarkComparison;
  showComparison: boolean;
}) => {
  return (
    <>
      {/* Multi-run Statistics (only show if more than 1 run) */}
      {result.summary.totalRuns > 1 && <MultiRunStats result={result} />}


      {/* Comparison Results */}
      {showComparison && comparison && <ComparisonStats comparison={comparison} />}

    </>
  );
};

const MultiRunStats = ({ result }: { result: BenchmarkResult }) => {
  const cv = (result.summary.stdDevTime / result.summary.avgTotalTime) * 100; // Coefficient of variation

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-sm">
          Multi-Run Statistics ({result.summary.totalRuns} runs)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Average Time</div>
            <div className="font-mono text-foreground font-bold text-sm">
              {result.summary.avgTotalTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Std Deviation</div>
            <div className="font-mono text-foreground text-sm">
              ±{result.summary.stdDevTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Min Time</div>
            <div className="font-mono text-green-600 text-sm">
              {result.summary.minTotalTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Max Time</div>
            <div className="font-mono text-red-500 text-sm">
              {result.summary.maxTotalTime.toFixed(1)}ms
            </div>
          </div>
        </div>

        {/* Consistency indicator */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Consistency</span>
            <Badge variant={cv < 5 ? 'default' : cv < 15 ? 'secondary' : 'destructive'}>
              {cv < 5 ? 'Excellent' : cv < 15 ? 'Good' : 'Variable'} ({cv.toFixed(1)}% CV)
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


const ComparisonStats = ({ comparison }: { comparison: BenchmarkComparison }) => {
  const overallImprovement = comparison.overallImprovement;
  const isImprovement = overallImprovement > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm">
          {isImprovement ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : overallImprovement < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Change */}
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-muted-foreground mb-1 text-xs">
            Overall Performance Change
          </div>
          <div
            className={`font-mono font-bold text-lg ${
              isImprovement ? 'text-green-500' : overallImprovement < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {isImprovement ? '+' : ''}{overallImprovement.toFixed(1)}%
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">
            {comparison.summary}
          </div>
        </div>

        {/* Stage-by-stage comparison */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">
            Stage-by-Stage Changes
          </div>
          {comparison.improvements.map((improvement) => (
            <div key={improvement.stage} className="flex items-center justify-between py-2">
              <span className="text-foreground capitalize text-[13px]">
                {improvement.stage}
              </span>
              <div className="flex items-center gap-2">
                {improvement.isImprovement ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : improvement.percentageChange < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span
                  className={`font-mono text-xs ${
                    improvement.isImprovement
                      ? 'text-green-500'
                      : improvement.percentageChange < 0
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {improvement.percentageChange > 0 ? '+' : ''}{improvement.percentageChange.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


const PipelineStages = ({ currentStage }: { currentStage: string }) => {
  const stages = [
    { name: 'Compile', key: 'compile' },
    { name: 'Witness', key: 'witness' },
    { name: 'Proof', key: 'proof' },
    { name: 'Verify', key: 'verify' }
  ];

  const currentIndex = stages.findIndex(stage =>
    currentStage.toLowerCase().includes(stage.key.toLowerCase())
  );

  return (
    <div className="flex items-center justify-between gap-2">
      {stages.map((stage, index) => (
        <div key={stage.key} className="contents">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                ${index < currentIndex
                  ? 'border-green-500 bg-green-500/10'
                  : index === currentIndex
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-muted-foreground/30 bg-muted/10'
                }
              `}
            >
              {index < currentIndex ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : index === currentIndex ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <span
              className={`text-[10px] font-mono text-center ${
                index <= currentIndex ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {stage.name}
            </span>
          </div>
          {index < stages.length - 1 && (
            <div
              className={`h-px flex-1 transition-colors ${
                index < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/20'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};