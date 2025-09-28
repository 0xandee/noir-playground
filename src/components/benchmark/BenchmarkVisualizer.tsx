import React from "react";
import { BenchmarkResult, BenchmarkProgress, StageName, STAGE_NAMES } from "@/types/benchmark";
import { Progress } from "@/components/ui/progress";
import { Zap, Clock, MemoryStick, HardDrive, Target, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface BenchmarkVisualizerProps {
  result?: BenchmarkResult;
  progress?: BenchmarkProgress;
  isRunning: boolean;
}

export const BenchmarkVisualizer = ({ result, progress, isRunning }: BenchmarkVisualizerProps) => {
  if (!result && !isRunning) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-muted-foreground" style={{ fontSize: '14px' }}>
          <Zap className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Run a benchmark to see performance visualization</p>
        </div>
      </div>
    );
  }

  if (isRunning && progress) {
    return <RunningVisualization progress={progress} />;
  }

  if (result) {
    return <ResultVisualization result={result} />;
  }

  return null;
};

const RunningVisualization = ({ progress }: { progress: BenchmarkProgress }) => {
  const progressPercentage = ((progress.currentRun - 1) / progress.totalRuns + (1 / progress.totalRuns) * 0.5) * 100;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-blue-500 font-medium" style={{ fontSize: '13px' }}>
            Running Benchmark - Run {progress.currentRun} of {progress.totalRuns}
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-muted-foreground" style={{ fontSize: '12px' }}>
          <span>Overall Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Current Stage */}
      <div className="text-center">
        <div className="text-foreground font-medium mb-2" style={{ fontSize: '14px' }}>
          Current Stage: {progress.currentStage}
        </div>
        <div className="inline-flex items-center gap-1 text-muted-foreground" style={{ fontSize: '12px' }}>
          <Clock className="h-3 w-3" />
          Processing...
        </div>
      </div>

      {/* Simple Pipeline Preview */}
      <div className="mt-6">
        <PipelineStages currentStage={progress.currentStage} />
      </div>
    </div>
  );
};

const ResultVisualization = ({ result }: { result: BenchmarkResult }) => {
  const stages = [
    { key: STAGE_NAMES.COMPILE, name: 'COMPILE', stage: result.stages.compile },
    { key: STAGE_NAMES.WITNESS, name: 'WITNESS', stage: result.stages.witness },
    { key: STAGE_NAMES.PROOF, name: 'PROOF', stage: result.stages.proof },
    { key: STAGE_NAMES.VERIFY, name: 'VERIFY', stage: result.stages.verify },
  ];

  // Find the main event (highest percentage)
  const mainEventStage = stages.reduce((max, stage) =>
    stage.stage.avgPercentage > max.stage.avgPercentage ? stage : max
  );

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="font-mono text-foreground" style={{ fontSize: '14px', lineHeight: '1.2' }}>
          ╔═══════════════════════════════════════╗<br />
          ║    NOIR BENCHMARK PIPELINE v1.0      ║<br />
          ║   Zero-Knowledge Proof Performance   ║<br />
          ╚═══════════════════════════════════════╝
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="text-center">
        <div className="text-muted-foreground mb-2" style={{ fontSize: '13px' }}>
          📊 Circuit: {result.config.circuitName || 'main.nr'} | Backend: {result.config.backend} | Runs: {result.summary.totalRuns}
        </div>
      </div>

      {/* Visual Pipeline */}
      <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Stage Boxes */}
          <div className="flex items-center justify-between mb-4">
            {stages.map((stage, index) => (
              <React.Fragment key={stage.key}>
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
                    <div className="font-mono font-bold text-foreground" style={{ fontSize: '11px' }}>
                      {stage.name}
                    </div>
                  </div>
                  <div className="text-foreground font-mono mt-1" style={{ fontSize: '12px' }}>
                    {stage.stage.avgTime.toFixed(0)}ms
                  </div>
                  <div className="text-muted-foreground font-mono" style={{ fontSize: '11px' }}>
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
              </React.Fragment>
            ))}
          </div>

          {/* THE MAIN EVENT indicator */}
          {mainEventStage.stage.avgPercentage > 50 && (
            <div className="text-center text-yellow-500 font-mono" style={{ fontSize: '12px' }}>
              ⭐ THE MAIN EVENT! ⭐<br />
              ({mainEventStage.stage.avgPercentage.toFixed(1)}% of execution time)
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-muted/20 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground" style={{ fontSize: '12px' }}>TOTAL TIME</span>
            </div>
            <div className="font-mono text-foreground font-bold" style={{ fontSize: '16px' }}>
              {result.summary.avgTotalTime.toFixed(0)}ms
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <HardDrive className="h-4 w-4 text-purple-500" />
              <span className="text-muted-foreground" style={{ fontSize: '12px' }}>PROOF SIZE</span>
            </div>
            <div className="font-mono text-foreground font-bold" style={{ fontSize: '16px' }}>
              {(result.summary.avgProofSize / 1024).toFixed(1)}KB
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground" style={{ fontSize: '12px' }}>SUCCESS RATE</span>
            </div>
            <div className="font-mono text-foreground font-bold" style={{ fontSize: '16px' }}>
              {((result.summary.successfulRuns / result.summary.totalRuns) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insight */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-0.5">🏆</div>
          <div>
            <div className="text-blue-500 font-medium mb-1" style={{ fontSize: '13px' }}>
              PERFORMANCE INSIGHT
            </div>
            <div className="text-foreground" style={{ fontSize: '13px' }}>
              {result.performanceInsight}
            </div>
            {result.bottleneck.recommendation && (
              <div className="text-muted-foreground mt-1" style={{ fontSize: '12px' }}>
                💡 {result.bottleneck.recommendation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PipelineStages = ({ currentStage }: { currentStage: string }) => {
  const stages = ['Compile', 'Generate Witness', 'Generate Proof', 'Verify Proof'];
  const currentIndex = stages.findIndex(stage =>
    currentStage.toLowerCase().includes(stage.toLowerCase().split(' ')[0])
  );

  return (
    <div className="flex items-center justify-between">
      {stages.map((stage, index) => (
        <React.Fragment key={stage}>
          <div className="flex flex-col items-center">
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2
                ${index < currentIndex
                  ? 'border-green-500 bg-green-500/20'
                  : index === currentIndex
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-muted-foreground/30 bg-muted/20'
                }
              `}
            >
              {index < currentIndex ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : index === currentIndex ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <div
              className={`
                text-center mt-1 font-mono
                ${index <= currentIndex ? 'text-foreground' : 'text-muted-foreground'}
              `}
              style={{ fontSize: '10px' }}
            >
              {stage.split(' ').join('\n')}
            </div>
          </div>
          {index < stages.length - 1 && (
            <div
              className={`
                flex-1 h-px mx-2
                ${index < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/30'}
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};